/**
 * Runs the real migration on PGlite (Postgres compiled to WASM) with a minimal
 * stub of Supabase's `auth` schema, then checks constraints, ownership and RLS.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const migration = readFileSync(fileURLToPath(new URL("../migrations/20261012000000_initial_schema.sql", import.meta.url)), "utf8");

let db: PGlite;

async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  return (await db.query<T>(sql, params)).rows;
}

async function errorCode(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn();
    return undefined;
  } catch (e) {
    return (e as { code?: string }).code;
  }
}

let clientId: string;
let projectId: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
  `);
  await db.exec(migration);
  // Supabase grants table privileges to these roles by default; RLS does the filtering.
  await db.exec(`grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated;`);
  await db.exec(`insert into auth.users (id, raw_user_meta_data) values ('${A}', '{"display_name":"Ana"}'), ('${B}', '{}');`);
  clientId = (await as<{ id: string }>(A, "insert into clients (name) values ('Acme') returning id"))[0].id;
  projectId = (await as<{ id: string }>(A, "insert into projects (name, client_id, budget_type, fixed_fee) values ('Site', $1, 'fixed', 3000) returning id", [clientId]))[0].id;
}, 60_000);

describe("schema", () => {
  it("creates a profile on sign-up", async () => {
    await db.exec("reset role");
    const rows = (await db.query<{ display_name: string }>("select display_name from profiles where id = $1", [A])).rows;
    expect(rows[0].display_name).toBe("Ana");
  });

  it("derives duration_seconds from span minus break", async () => {
    const [row] = await as<{ duration_seconds: number }>(
      A,
      "insert into time_entries (project_id, started_at, ended_at, break_seconds) values ($1, '2026-10-12T09:00Z', '2026-10-12T12:30Z', 1800) returning duration_seconds",
      [projectId],
    );
    expect(row.duration_seconds).toBe(3 * 3600);
  });

  it("rejects invalid entries and projects", async () => {
    expect(await errorCode(() => as(A, "insert into time_entries (project_id, started_at, ended_at) values ($1, now(), now() - interval '1 hour')", [projectId]))).toBe("23514");
    expect(await errorCode(() => as(A, "insert into time_entries (project_id, started_at, ended_at, break_seconds) values ($1, now(), now() + interval '1 hour', 3600)", [projectId]))).toBe("23514");
    expect(await errorCode(() => as(A, "insert into projects (name, budget_type) values ('x', 'fixed')"))).toBe("23514");
  });

  it("never deletes history through a parent", async () => {
    expect(await errorCode(() => as(A, "delete from clients where id = $1", [clientId]))).toBe("23001");
    expect(await errorCode(() => as(A, "delete from projects where id = $1", [projectId]))).toBe("23001");
  });
});

describe("row level security", () => {
  it("hides other users' rows", async () => {
    expect(await as(B, "select * from clients")).toHaveLength(0);
    expect(await as(B, "select * from time_entries")).toHaveLength(0);
    expect(await as(B, "update projects set name = 'hacked' where id = $1 returning id", [projectId])).toHaveLength(0);
  });

  it("blocks writing into another user's data", async () => {
    expect(await errorCode(() => as(B, "insert into clients (user_id, name) values ($1, 'x')", [A]))).toBe("42501");
    expect(await errorCode(() => as(B, "insert into time_entries (project_id, started_at, ended_at) values ($1, now(), now() + interval '1 hour')", [projectId]))).toBe("23503");
  });

  it("denies anonymous access", async () => {
    await db.exec("reset role; set role anon;");
    expect(await errorCode(() => db.query("select * from clients"))).toBe("42501");
  });
});

describe("active timer", () => {
  it("allows one timer per user and finishes it atomically", async () => {
    const [t] = await as<{ id: string }>(A, "insert into active_timers (project_id, started_at, status, segment_started_at) values ($1, now() - interval '1 hour', 'running', now() - interval '1 hour') returning id", [projectId]);
    expect(await errorCode(() => as(A, "insert into active_timers (project_id, started_at, status, segment_started_at) values ($1, now(), 'running', now())", [projectId]))).toBe("23505");
    expect(await errorCode(() => as(A, "update active_timers set status = 'paused' where id = $1", [t.id]))).toBe("23514");
    expect(await errorCode(() => as(B, "select * from finish_timer($1, $2, 'x', null, true, now() - interval '1 hour', now(), 0)", [t.id, projectId]))).toBe("P0002");

    const [entry] = await as<{ duration_seconds: number; source: string }>(A, "select * from finish_timer($1, $2, 'Work', null, true, now() - interval '1 hour', now(), 600)", [t.id, projectId]);
    expect(entry.duration_seconds).toBe(3000);
    expect(entry.source).toBe("timer");
    expect(await as(A, "select * from active_timers")).toHaveLength(0);
    expect(await errorCode(() => as(A, "select * from finish_timer($1, $2, 'x', null, true, now() - interval '1 hour', now(), 0)", [t.id, projectId]))).toBe("P0002");
  });
});

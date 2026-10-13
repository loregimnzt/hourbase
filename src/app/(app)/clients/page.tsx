"use client";
import { withData } from "@/components/layout/with-data";
import Link from "next/link";
import { Globe, Mail, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useClientActions } from "@/components/clients/use-client-actions";
import { useClientStats } from "@/components/clients/use-client-stats";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Menu } from "@/components/ui/menu";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { formatMoneyMulti } from "@/lib/format";
import { formatDuration } from "@/lib/time";

type Filter = "active" | "archived" | "all";
type Sort = "name" | "hours" | "revenue" | "recent";

function ClientsPage() {
  const { data } = useData();
  const { openClient } = useAppActions();
  const { menuItems } = useClientActions();
  const stats = useClientStats();
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const cur = data.settings.currency;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.clients
      .filter((c) => (filter === "all" ? true : filter === "archived" ? c.archived : !c.archived))
      .filter((c) => !q || [c.name, c.contactName, c.email, c.website].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => {
        const sa = stats.get(a.id);
        const sb = stats.get(b.id);
        if (sort === "hours") return (sb?.totalSeconds ?? 0) - (sa?.totalSeconds ?? 0);
        if (sort === "revenue") return (sb?.revenue[cur] ?? 0) - (sa?.revenue[cur] ?? 0);
        if (sort === "recent") return (sb?.lastTrackedAt ?? "").localeCompare(sa?.lastTrackedAt ?? "");
        return a.name.localeCompare(b.name);
      });
  }, [data.clients, filter, query, sort, stats, cur]);

  const archivedCount = data.clients.filter((c) => c.archived).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Everyone you work for, with lifetime hours and revenue."
        actions={
          <Button icon={<UserPlus className="size-4" aria-hidden />} onClick={() => openClient()}>
            New client
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Client status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: `Active ${data.clients.length - archivedCount}` },
            { value: "archived", label: `Archived ${archivedCount}` },
            { value: "all", label: "All" },
          ]}
        />
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input type="search" aria-label="Search clients" placeholder="Search name, contact, email…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select aria-label="Sort clients" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44">
          <option value="name">Name A–Z</option>
          <option value="hours">Most hours</option>
          <option value="revenue">Most revenue</option>
          <option value="recent">Recently tracked</option>
        </Select>
      </div>

      {!data.clients.length ? (
        <div className="rounded-2xl border border-dashed border-line-strong">
          <EmptyState icon={<Users className="size-5" aria-hidden />} title="No clients yet" description="Add the people and companies you work for, then attach projects to them." action={<Button onClick={() => openClient()}>Add a client</Button>} />
        </div>
      ) : !visible.length ? (
        <div className="rounded-2xl border border-dashed border-line-strong">
          <EmptyState icon={<Search className="size-5" aria-hidden />} title="No clients match" description="Try a different search or status." />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => {
            const s = stats.get(c.id);
            return (
              <li key={c.id} className="relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-sm font-semibold text-accent-text">
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <Link href={`/clients/${c.id}`} className="block truncate font-semibold after:absolute after:inset-0 after:rounded-2xl hover:text-accent-text">
                        {c.name}
                      </Link>
                      <p className="truncate text-[13px] text-muted">{c.contactName ?? "No contact"}</p>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-1.5">
                    {c.archived && <Badge>Archived</Badge>}
                    {c.isDemo && <Badge>Example</Badge>}
                    <Menu label={`Actions for ${c.name}`} items={menuItems(c)} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-subtle">
                  {c.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-3.5" aria-hidden />
                      {c.email}
                    </span>
                  )}
                  {c.website && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="size-3.5" aria-hidden />
                      {c.website}
                    </span>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-subtle">Active projects</dt>
                    <dd className="tabular mt-0.5 font-medium">
                      {s?.activeProjects ?? 0}
                      <span className="text-xs font-normal text-subtle"> / {s?.projectCount ?? 0}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-subtle">Hours</dt>
                    <dd className="tabular mt-0.5 font-medium">{formatDuration(s?.totalSeconds ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-subtle">Revenue</dt>
                    <dd className="tabular mt-0.5 truncate font-medium" title={formatMoneyMulti(s?.revenue ?? {}, cur)}>
                      {formatMoneyMulti(s?.revenue ?? {}, cur)}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default withData(ClientsPage);

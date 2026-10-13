"use client";
import { withData } from "@/components/layout/with-data";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FolderPlus, Globe, Mail, Pencil, User } from "lucide-react";
import { useMemo } from "react";
import { useClientActions } from "@/components/clients/use-client-actions";
import { useClientStats } from "@/components/clients/use-client-stats";
import { EntryList } from "@/components/entries/entry-list";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { STATUS_LABEL, STATUS_TONE } from "@/components/projects/status";
import { StatCard } from "@/components/shared/stat-card";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/misc";
import { useProjectStats } from "@/hooks/use-metrics";
import { formatMoney, formatMoneyMulti, formatRate } from "@/lib/format";
import { formatDate, formatDuration } from "@/lib/time";

function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useData();
  const { openClient, openProject } = useAppActions();
  const { menuItems, setArchived } = useClientActions();
  const clientStats = useClientStats();
  const projectStats = useProjectStats();
  const client = data.clients.find((c) => c.id === id);
  const projects = useMemo(() => data.projects.filter((p) => p.clientId === id), [data.projects, id]);
  const entries = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id));
    return data.entries.filter((e) => ids.has(e.projectId));
  }, [data.entries, projects]);

  if (!client) {
    return (
      <Card>
        <EmptyState title="Client not found" description="It may have been deleted, or the link is wrong." action={<ButtonLink href="/clients">Back to clients</ButtonLink>} />
      </Card>
    );
  }
  const s = clientStats.get(client.id);
  const cur = data.settings.currency;
  const website = client.website ? (client.website.startsWith("http") ? client.website : `https://${client.website}`) : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/clients" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Clients
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{client.name}</h1>
            {client.archived && <Badge>Archived</Badge>}
            {client.isDemo && <Badge>Example</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
            {client.contactName && (
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" aria-hidden />
                {client.contactName}
              </span>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-accent-text">
                <Mail className="size-3.5" aria-hidden />
                {client.email}
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-accent-text">
                <Globe className="size-3.5" aria-hidden />
                {client.website}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.archived ? (
            <Button onClick={() => setArchived(client, false)}>Restore client</Button>
          ) : (
            <Button icon={<FolderPlus className="size-4" aria-hidden />} onClick={() => openProject(null, { clientId: client.id })}>
              New project
            </Button>
          )}
          <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />} onClick={() => openClient(client)}>
            Edit
          </Button>
          <Menu label="More client actions" items={menuItems(client, { redirect: true })} />
        </div>
      </header>

      <section aria-label="Client metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total tracked" value={formatDuration(s?.totalSeconds ?? 0)} sub={`${formatDuration(s?.billableSeconds ?? 0)} billable`} />
        <StatCard label="Recorded revenue" value={formatMoneyMulti(s?.revenue ?? {}, cur)} info="Hourly projects: billable hours × rate. Fixed projects: the agreed fee once work is tracked. Not payments received or profit." />
        <StatCard label="Active projects" value={s?.activeProjects ?? 0} sub={`${s?.projectCount ?? 0} in total`} />
        <StatCard label="Last tracked" value={s?.lastTrackedAt ? formatDate(s.lastTrackedAt, data.settings) : "—"} />
      </section>

      <Card>
        <CardHeader title="Projects" description="Completed and archived projects keep their full history." />
        <div className="p-2 pt-3">
          {projects.length ? (
            <ul className="divide-y divide-line">
              {projects.map((p) => {
                const ps = projectStats.get(p.id);
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-3 hover:bg-hover/50">
                      <span className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                        <ColorDot color={p.color} />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                      <span className="tabular w-20 text-right text-sm">{formatDuration(ps?.totalSeconds ?? 0)}</span>
                      <span className="tabular w-24 text-right text-sm text-muted">{formatMoney(ps?.recordedRevenue ?? 0, p.currency)}</span>
                      <span className="tabular w-24 text-right text-sm text-muted">{formatRate(ps?.effectiveRate, p.currency)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No projects for this client" action={!client.archived && <Button variant="secondary" onClick={() => openProject(null, { clientId: client.id })}>Create project</Button>} />
          )}
        </div>
      </Card>

      {client.notes && (
        <Card>
          <CardHeader title="Notes" />
          <p className="px-5 pt-3 pb-5 text-sm whitespace-pre-line text-muted">{client.notes}</p>
        </Card>
      )}

      {entries.length > 0 && (
        <section aria-labelledby="client-entries" className="flex flex-col gap-3">
          <h2 id="client-entries" className="text-[15px] font-semibold">
            Recent time
          </h2>
          <EntryList entries={entries} limit={8} />
        </section>
      )}
    </div>
  );
}

export default withData(ClientDetailPage);

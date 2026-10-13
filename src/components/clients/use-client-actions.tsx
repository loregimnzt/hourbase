"use client";
import { Archive, ArchiveRestore, FolderPlus, Pencil, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Client } from "@/types";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { useConfirm } from "@/components/ui/confirm";
import type { MenuItem } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/utils";

/**
 * Clients are archived, not deleted, once they have projects — so historical
 * time and revenue are never silently removed. Permanent deletion is only
 * offered for clients without any projects.
 */
export function useClientActions() {
  const { data, updateClient, deleteClient } = useData();
  const { openClient, openProject } = useAppActions();
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();

  const setArchived = async (c: Client, archived: boolean) => {
    if (archived) {
      const ok = await confirm({
        title: `Archive ${c.name}?`,
        description: "The client is hidden from pickers and lists, but all projects, time entries and revenue stay intact. You can restore it any time.",
        confirmLabel: "Archive client",
        tone: "primary",
      });
      if (!ok) return;
    }
    try {
      await updateClient(c.id, { archived });
      toast.success(archived ? "Client archived" : "Client restored", c.name);
    } catch (e) {
      toast.error("Couldn't update client", errorMessage(e));
    }
  };

  const remove = async (c: Client, opts?: { redirect?: boolean }) => {
    const ok = await confirm({ title: `Delete ${c.name}?`, description: "This client has no projects or time, so nothing else is affected. This can't be undone.", confirmLabel: "Delete client" });
    if (!ok) return;
    try {
      await deleteClient(c.id);
      toast.success("Client deleted");
      if (opts?.redirect) router.push("/clients");
    } catch (e) {
      toast.error("Couldn't delete client", errorMessage(e));
    }
  };

  const menuItems = (c: Client, opts?: { redirect?: boolean }): MenuItem[] => {
    const hasProjects = data.projects.some((p) => p.clientId === c.id);
    const items: MenuItem[] = [
      { label: "Edit client", icon: <Pencil className="size-4" aria-hidden />, onSelect: () => openClient(c) },
      { label: "New project", icon: <FolderPlus className="size-4" aria-hidden />, onSelect: () => openProject(null, { clientId: c.id }), disabled: c.archived },
      c.archived
        ? { label: "Restore client", icon: <ArchiveRestore className="size-4" aria-hidden />, onSelect: () => setArchived(c, false) }
        : { label: "Archive client", icon: <Archive className="size-4" aria-hidden />, onSelect: () => setArchived(c, true) },
    ];
    if (!hasProjects) items.push({ label: "Delete client", icon: <Trash className="size-4" aria-hidden />, danger: true, onSelect: () => remove(c, opts) });
    return items;
  };

  return { menuItems, setArchived, remove };
}

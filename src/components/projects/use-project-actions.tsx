"use client";
import { Archive, ArchiveRestore, CircleCheck, Pencil, RotateCcw, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Project } from "@/types";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { useConfirm } from "@/components/ui/confirm";
import type { MenuItem } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/utils";

/** Status changes and deletion for a project, with history-preserving rules. */
export function useProjectActions() {
  const { data, updateProject, deleteProject } = useData();
  const { openProject } = useAppActions();
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();

  const setStatus = async (p: Project, status: Project["status"]) => {
    try {
      await updateProject(p.id, { status });
      const msg = { active: "Project reactivated", completed: "Project marked complete", archived: "Project archived" }[status];
      toast.success(msg, status === "active" ? p.name : "Its tracked time and revenue stay in your reports.");
    } catch (e) {
      toast.error("Couldn't update project", errorMessage(e));
    }
  };

  const remove = async (p: Project, opts?: { redirect?: boolean }) => {
    const ok = await confirm({
      title: `Delete “${p.name}”?`,
      description: "This project has no tracked time, so nothing else is affected. This can't be undone.",
      confirmLabel: "Delete project",
    });
    if (!ok) return;
    try {
      await deleteProject(p.id);
      toast.success("Project deleted");
      if (opts?.redirect) router.push("/projects");
    } catch (e) {
      toast.error("Couldn't delete project", errorMessage(e));
    }
  };

  const menuItems = (p: Project, opts?: { redirect?: boolean }): MenuItem[] => {
    const hasTime = data.entries.some((e) => e.projectId === p.id);
    const timerHere = data.activeTimer?.projectId === p.id;
    const items: MenuItem[] = [{ label: "Edit project", icon: <Pencil className="size-4" aria-hidden />, onSelect: () => openProject(p) }];
    if (p.status !== "completed") items.push({ label: "Mark as completed", icon: <CircleCheck className="size-4" aria-hidden />, onSelect: () => setStatus(p, "completed") });
    if (p.status !== "active") items.push({ label: "Reactivate", icon: p.status === "archived" ? <ArchiveRestore className="size-4" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />, onSelect: () => setStatus(p, "active") });
    if (p.status !== "archived") items.push({ label: "Archive", icon: <Archive className="size-4" aria-hidden />, onSelect: () => setStatus(p, "archived") });
    if (!hasTime && !timerHere) items.push({ label: "Delete project", icon: <Trash className="size-4" aria-hidden />, danger: true, onSelect: () => remove(p, opts) });
    return items;
  };

  return { setStatus, remove, menuItems };
}

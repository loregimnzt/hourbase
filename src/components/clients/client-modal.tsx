"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Client } from "@/types";
import { useData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage, nullable } from "@/lib/utils";
import { type ClientFormValues, clientSchema } from "@/lib/validation";

export function ClientModal({ open, onClose, client }: { open: boolean; onClose: () => void; client?: Client | null }) {
  const { createClient, updateClient } = useData();
  const toast = useToast();
  const { register, handleSubmit, reset, formState } = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema) });

  useEffect(() => {
    if (open)
      reset({
        name: client?.name ?? "",
        contactName: client?.contactName ?? "",
        email: client?.email ?? "",
        website: client?.website ?? "",
        notes: client?.notes ?? "",
      });
  }, [open, client, reset]);

  const onSubmit = handleSubmit(async (v) => {
    const input = { name: v.name.trim(), contactName: nullable(v.contactName), email: nullable(v.email), website: nullable(v.website), notes: nullable(v.notes) };
    try {
      const saved = client ? await updateClient(client.id, input) : await createClient(input);
      toast.success(client ? "Client updated" : "Client added", saved.name);
      onClose();
    } catch (e) {
      toast.error("Couldn't save client", errorMessage(e));
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? "Edit client" : "New client"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" loading={formState.isSubmitting}>
            {client ? "Save changes" : "Add client"}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Client or company name" error={formState.errors.name?.message}>
          {(a) => <Input {...a} {...register("name")} placeholder="Acme Studio" autoComplete="organization" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact name" optional error={formState.errors.contactName?.message}>
            {(a) => <Input {...a} {...register("contactName")} autoComplete="name" />}
          </Field>
          <Field label="Email" optional error={formState.errors.email?.message}>
            {(a) => <Input {...a} type="email" {...register("email")} autoComplete="email" />}
          </Field>
        </div>
        <Field label="Website" optional error={formState.errors.website?.message}>
          {(a) => <Input {...a} {...register("website")} placeholder="acme.com" autoComplete="url" />}
        </Field>
        <Field label="Notes" optional error={formState.errors.notes?.message}>
          {(a) => <Textarea {...a} rows={3} {...register("notes")} placeholder="Billing terms, preferences…" />}
        </Field>
      </form>
    </Modal>
  );
}

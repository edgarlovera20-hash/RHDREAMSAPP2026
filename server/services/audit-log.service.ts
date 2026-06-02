import fs from "fs/promises";
import { ensureRuntimeDir, runtimePath } from "./runtimeStore.service";

export type AuditAction =
  | "conversation.created"
  | "conversation.updated"
  | "message.created"
  | "message.approved"
  | "message.rejected"
  | "ai.draft.created";

export type AuditLogEntry = {
  id: string;
  companyId: string;
  action: AuditAction;
  actorId?: string;
  entityType: "conversation" | "message" | "ai";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

export async function appendAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">) {
  await ensureRuntimeDir();
  const payload: AuditLogEntry = {
    ...entry,
    id: `audit-${crypto.randomUUID()}`,
    createdAt: Date.now(),
  };

  await fs.appendFile(runtimePath("audit-log.jsonl"), `${JSON.stringify(payload)}\n`, {
    mode: 0o600,
  });

  return payload;
}


import { randomUUID } from "crypto";

export interface HdEventEnvelope<T = unknown> {
  eventId: string;
  eventName: string;
  correlationId: string;
  occurredAt: string;
  producer: string;
  actor: { id: string; type: "user" | "agent" | "system" | "n8n_workflow" };
  payload: T;
  schemaVersion: "1.0";
}

const MAX_EVENTS = 100;
const eventLog: HdEventEnvelope[] = [];

export function emitEvent<T>(
  eventName: string,
  payload: T,
  producer: string,
  actor: HdEventEnvelope["actor"],
  correlationId?: string
): HdEventEnvelope<T> {
  const envelope: HdEventEnvelope<T> = {
    eventId: randomUUID(),
    eventName,
    correlationId: correlationId ?? randomUUID(),
    occurredAt: new Date().toISOString(),
    producer,
    actor,
    payload,
    schemaVersion: "1.0",
  };
  eventLog.push(envelope as HdEventEnvelope);
  if (eventLog.length > MAX_EVENTS) eventLog.shift();
  console.log(`[EVENT] ${eventName} producer=${producer} correlationId=${envelope.correlationId}`);
  return envelope;
}

export function getRecentEvents(): HdEventEnvelope[] {
  return [...eventLog];
}

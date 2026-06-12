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

// HD-BRAIN subscribes to all HD-RH events.
// HD-OPERATIONS subscribes only to rh.candidate.hired.
const BRAIN_URL = process.env.BRAIN_EVENTS_URL ?? "";
const OPERATIONS_URL = process.env.OPERATIONS_EVENTS_URL ?? "";

const SUBSCRIPTIONS: Record<string, string[]> = {
  "rh.candidate.hired": [BRAIN_URL, OPERATIONS_URL].filter(Boolean),
};

function subscribersFor(eventName: string): string[] {
  const specific = SUBSCRIPTIONS[eventName] ?? [];
  const brain = BRAIN_URL ? [BRAIN_URL] : [];
  return [...new Set([...brain, ...specific])];
}

function forwardEvent(envelope: HdEventEnvelope): void {
  const secret = process.env.EVENT_BUS_SECRET;
  if (!secret) return;
  for (const url of subscribersFor(envelope.eventName)) {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-event-bus-secret": secret },
      body: JSON.stringify(envelope),
    }).catch((err: unknown) => {
      console.warn(`[EVENT FORWARD] Failed ${envelope.eventName} → ${url}:`, err);
    });
  }
}

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
  forwardEvent(envelope as HdEventEnvelope);
  return envelope;
}

export function getRecentEvents(): HdEventEnvelope[] {
  return [...eventLog];
}

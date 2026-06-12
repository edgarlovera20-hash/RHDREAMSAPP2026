import { hdEvents, hdPlatforms, hdPermissions } from "@hd/core-contracts";

export const rhCoreAlignment = {
  platform: hdPlatforms.rh,
  events: {
    candidateCreated: hdEvents.rhCandidateCreated,
    interviewScheduled: hdEvents.rhInterviewScheduled,
    auditActionRecorded: hdEvents.auditActionRecorded
  },
  permissions: {
    candidatesRead: hdPermissions.rhCandidatesRead,
    reportsView: hdPermissions.rhReportsView
  }
} as const;

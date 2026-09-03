import type { AiSummaryPeriod, AiSummaryStyle, TimelineSource } from "@daily-life/shared";
import { z } from "zod";

export interface AiSummarySnapshotEvent {
  source: TimelineSource;
  date: string;
  title: string;
  recordPath: string;
}

export interface AiSummarySnapshot {
  period: AiSummaryPeriod;
  from: string;
  to: string;
  overview: {
    expenseFen: number;
    financeEntryCount: number;
    habitsPlanned: number;
    habitsCompleted: number;
    todosToday: number;
    todosOverdue: number;
  };
  activeDays: number;
  sourceCounts: Partial<Record<TimelineSource, number>>;
  events: AiSummarySnapshotEvent[];
}

export const aiModelInterpretationSchema = z.object({
  headline: z.string().min(1).max(80),
  summary: z.string().min(1).max(400),
  affirmation: z.string().min(1).max(180),
  attention: z.string().min(1).max(180).nullable(),
  nextStep: z.string().min(1).max(180),
});

export type AiModelInterpretation = z.infer<typeof aiModelInterpretationSchema>;

export interface AiSummaryProviderResult {
  model: string;
  interpretation: AiModelInterpretation;
}

export interface AiSummaryProvider {
  readonly kind: "deepseek";
  generate(input: {
    snapshot: AiSummarySnapshot;
    style: AiSummaryStyle;
    safetyIdentifier: string;
  }): Promise<AiSummaryProviderResult>;
}

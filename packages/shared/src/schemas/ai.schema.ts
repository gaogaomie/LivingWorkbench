import { z } from "zod";
import { localDateSchema, timelineSourceSchema } from "./life.schema";

export const aiSummaryPeriodSchema = z.enum(["today", "week"]);
export const aiSummaryStyleSchema = z.enum(["gentle", "concise", "data"]);

export const generateAiSummaryRequestSchema = z.object({
  period: aiSummaryPeriodSchema,
  date: localDateSchema,
  style: aiSummaryStyleSchema,
  consentToSendRecords: z.literal(true),
});

export const aiSummaryMetricSchema = z.object({
  label: z.string().min(1).max(24),
  value: z.string().min(1).max(32),
  hint: z.string().min(1).max(80),
});

export const aiSummaryFactSchema = z.object({
  text: z.string().min(1).max(180),
  source: timelineSourceSchema.nullable(),
  recordPath: z.string().startsWith("/").nullable(),
});

export const aiSummaryResponseSchema = z.object({
  period: aiSummaryPeriodSchema,
  style: aiSummaryStyleSchema,
  provider: z.enum(["deepseek", "rules"]),
  model: z.string().nullable(),
  generatedAt: z.iso.datetime(),
  dataThrough: localDateSchema,
  kicker: z.string().min(1).max(40),
  headline: z.string().min(1).max(80),
  summary: z.string().min(1).max(400),
  facts: z.array(aiSummaryFactSchema).min(1).max(4),
  affirmation: z.string().min(1).max(180),
  attention: z.string().min(1).max(180).nullable(),
  nextStep: z.string().min(1).max(180),
  metrics: z.array(aiSummaryMetricSchema).length(3),
  sourceLabels: z.array(timelineSourceSchema).max(6),
  issueNumber: z.string().min(1).max(24),
  fallbackReason: z.string().min(1).max(180).nullable(),
});

export type AiSummaryPeriod = z.infer<typeof aiSummaryPeriodSchema>;
export type AiSummaryStyle = z.infer<typeof aiSummaryStyleSchema>;
export type GenerateAiSummaryRequest = z.infer<typeof generateAiSummaryRequestSchema>;
export type AiSummaryResponse = z.infer<typeof aiSummaryResponseSchema>;

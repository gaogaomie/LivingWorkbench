import { z } from "zod";
import {
  type AiSummaryProvider,
  type AiSummaryProviderResult,
  aiModelInterpretationSchema,
} from "./ai-summary.provider";

const DEEPSEEK_RESPONSES_URL = "https://api.deepseek.com/responses";
const REQUEST_TIMEOUT_MS = 20_000;

const responseContentSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const deepSeekResponseSchema = z.object({
  model: z.string(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z.array(responseContentSchema).optional(),
    }),
  ),
});

const interpretationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", maxLength: 80 },
    summary: { type: "string", maxLength: 400 },
    affirmation: { type: "string", maxLength: 180 },
    attention: { type: ["string", "null"], maxLength: 180 },
    nextStep: { type: "string", maxLength: 180 },
  },
  required: ["headline", "summary", "affirmation", "attention", "nextStep"],
};

function readOutputText(payload: z.infer<typeof deepSeekResponseSchema>): string {
  for (const item of payload.output) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("DEEPSEEK_RESPONSE_MISSING_OUTPUT");
}

export class DeepSeekSummaryProvider implements AiSummaryProvider {
  readonly kind = "deepseek" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(
    input: Parameters<AiSummaryProvider["generate"]>[0],
  ): Promise<AiSummaryProviderResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(DEEPSEEK_RESPONSES_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_output_tokens: 700,
          reasoning: { effort: "low" },
          user: input.safetyIdentifier,
          instructions:
            "你是个人生活记录解读助手。只使用输入快照里的事实，不补写动机、情绪、健康诊断或消费原因。明确区分事实与轻量建议；数据不足时直说。不要复述隐私字段，不要声称修改了记录。表达风格由 style 决定。必须严格按照给定 JSON Schema 输出。",
          input: JSON.stringify({ style: input.style, snapshot: input.snapshot }),
          text: {
            format: {
              type: "json_schema",
              name: "life_summary_interpretation",
              schema: interpretationJsonSchema,
            },
          },
        }),
      });
      if (!response.ok) throw new Error(`DEEPSEEK_HTTP_${response.status}`);
      const payload = deepSeekResponseSchema.parse(await response.json());
      const interpretation = aiModelInterpretationSchema.parse(JSON.parse(readOutputText(payload)));
      return { model: payload.model, interpretation };
    } finally {
      clearTimeout(timeout);
    }
  }
}

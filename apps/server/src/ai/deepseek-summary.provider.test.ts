import { afterEach, describe, expect, it, vi } from "vitest";
import { DeepSeekSummaryProvider } from "./deepseek-summary.provider";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeepSeekSummaryProvider", () => {
  it("calls the DeepSeek Responses API with structured output and a pseudonymous user id", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "deepseek-v4-pro",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    headline: "今天的节奏很稳定",
                    summary: "习惯和日程都留下了清晰线索。",
                    affirmation: "你已经完成了重要的一步。",
                    attention: null,
                    nextStep: "继续完成一个最轻量的习惯。",
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new DeepSeekSummaryProvider("deepseek-test-key", "deepseek-v4-pro");

    const result = await provider.generate({
      style: "gentle",
      safetyIdentifier: "a".repeat(64),
      snapshot: {
        period: "today",
        from: "2026-09-03",
        to: "2026-09-03",
        overview: {
          expenseFen: 0,
          financeEntryCount: 0,
          habitsPlanned: 1,
          habitsCompleted: 1,
          todosToday: 0,
          todosOverdue: 0,
        },
        activeDays: 1,
        sourceCounts: { habit: 1 },
        events: [],
      },
    });

    expect(result.model).toBe("deepseek-v4-pro");
    expect(result.interpretation.headline).toBe("今天的节奏很稳定");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.deepseek.com/responses");
    expect(request?.headers).toMatchObject({ Authorization: "Bearer deepseek-test-key" });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      model: "deepseek-v4-pro",
      user: "a".repeat(64),
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "life_summary_interpretation" } },
    });
  });
});

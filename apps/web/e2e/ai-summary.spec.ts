import { expect, test } from "@playwright/test";

test("AI 解读要求明确授权并展示 DeepSeek 提供方", async ({ page }) => {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 200, message: "success", data: {} }),
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          user: { id: "00000000-0000-4000-8000-000000000001", username: "owner" },
          csrfToken: "test-token-00000000000000000000000000000000",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      }),
    }),
  );
  await page.route("**/api/v1/overview**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          date: "2026-09-03",
          finance: { expenseFen: 2800, entryCount: 1 },
          habits: { planned: 2, completed: 1 },
          schedule: { today: 1, overdue: 0 },
          recent: [],
        },
      }),
    }),
  );
  await page.route("**/api/v1/health/ready", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          status: "ok",
          service: "daily-life-server",
          version: "test",
          checkedAt: "2026-09-03T00:00:00.000Z",
        },
      }),
    }),
  );

  let submittedPayload: unknown;
  await page.route("**/api/v1/ai/summaries", async (route) => {
    submittedPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 200,
        message: "success",
        data: {
          period: "today",
          style: "gentle",
          provider: "deepseek",
          model: "deepseek-v4-pro",
          generatedAt: "2026-09-03T10:00:00.000Z",
          dataThrough: "2026-09-03",
          kicker: "今日生活解读",
          headline: "小小的完成，也有清晰的方向",
          summary: "今天的习惯和账目共同留下了稳定的生活线索。",
          facts: [{ text: "完成 1/2 个习惯", source: "habit", recordPath: "/habits" }],
          affirmation: "你已经完成了今天计划的一半。",
          attention: null,
          nextStep: "选一个最轻松的习惯继续完成。",
          metrics: [
            { label: "习惯进度", value: "50%", hint: "1/2 已完成" },
            { label: "今日支出", value: "¥28", hint: "共 1 笔" },
            { label: "今日安排", value: "1 项", hint: "无逾期" },
          ],
          sourceLabels: ["habit", "finance"],
          issueNumber: "0903-D",
          fallbackReason: null,
        },
      }),
    });
  });

  await page.goto("/");

  const generateButton = page.getByRole("button", { name: "生成今日解读" });
  await expect(generateButton).toBeDisabled();
  await page.getByText("我同意将本次摘要所需的脱敏记录发送给 AI 服务", { exact: true }).click();
  await expect(generateButton).toBeEnabled();
  await generateButton.click();

  await expect(page.getByText("DeepSeek · deepseek-v4-pro")).toBeVisible();
  await expect(page.getByRole("heading", { name: "小小的完成，也有清晰的方向" })).toBeVisible();
  expect(submittedPayload).toMatchObject({
    period: "today",
    style: "gentle",
    consentToSendRecords: true,
  });
});

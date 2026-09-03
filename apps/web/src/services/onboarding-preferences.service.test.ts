// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { dismissFirstUseGuide, readFirstUseGuideDismissed } from "./onboarding-preferences.service";

describe("onboarding preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("记住用户已跳过首次使用引导", () => {
    expect(readFirstUseGuideDismissed()).toBe(false);

    expect(dismissFirstUseGuide()).toBe(true);

    expect(readFirstUseGuideDismissed()).toBe(true);
  });
});

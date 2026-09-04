import { describe, expect, it } from "vitest";
import { adminNavigation, dataNavigation, primaryNavigation } from "./route-paths";

describe("菜单图标", () => {
  it("所有菜单入口使用互不重复的组件库物品图标", () => {
    const items = [...primaryNavigation, ...dataNavigation, ...adminNavigation];

    expect(new Set(items.map((item) => item.iconSrc)).size).toBe(items.length);
    for (const item of items) {
      expect(item.iconSrc).toMatch(/item-\d+\.png/);
    }
  });
});

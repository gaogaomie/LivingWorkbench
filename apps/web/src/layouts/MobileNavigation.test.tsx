// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "../stores/ui.store";
import { MobileNavigation } from "./MobileNavigation";

describe("MobileNavigation", () => {
  beforeEach(() => useUiStore.setState({ mobileDrawerOpen: false }));

  it("公开菜单的展开状态并支持 Escape 关闭后归还焦点", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <MobileNavigation />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "菜单" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "移动端导航" })).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "移动端导航" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

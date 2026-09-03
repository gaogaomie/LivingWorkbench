// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ANNOUNCE_EVENT } from "../services/announcement-events";
import { AccessibleAnnouncer } from "./AccessibleAnnouncer";

describe("AccessibleAnnouncer", () => {
  it("将紧急 Toast 文案发布到 assertive live region", () => {
    render(<AccessibleAnnouncer />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ANNOUNCE_EVENT, {
          detail: { message: "保存失败，请重试。", urgent: true },
        }),
      );
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent("保存失败，请重试。");
  });
});

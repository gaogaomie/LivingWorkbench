// @vitest-environment jsdom

import type { ScheduleResponse } from "@daily-life/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeekSchedule } from "./WeekSchedule";

interface MockModalProps {
  open: boolean;
  title?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
}

vi.mock("animal-island-ui", () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  Modal: ({ open, title, footer, onClose, children }: MockModalProps) =>
    open ? (
      <div role="dialog" aria-label={String(title)}>
        <button type="button" aria-label="关闭弹窗" onClick={onClose} />
        {children}
        {footer}
      </div>
    ) : null,
  Tag: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

function scheduleItem(id: string, title: string, time: string): ScheduleResponse["items"][number] {
  return {
    id,
    title,
    date: "2026-09-03",
    time,
    listId: null,
    priority: "normal",
    note: null,
    reminderMinutesBefore: null,
    status: "pending",
    completedAt: null,
    isOverdue: false,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
  };
}

describe("WeekSchedule", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("每天只展示两项并通过弹窗展示当天全部日程", () => {
    const items = [
      scheduleItem("10000000-0000-4000-8000-000000000001", "早餐", "08:00"),
      scheduleItem("10000000-0000-4000-8000-000000000002", "晨会", "09:00"),
      scheduleItem("10000000-0000-4000-8000-000000000003", "评审", "14:00"),
      scheduleItem("10000000-0000-4000-8000-000000000004", "复盘", "18:00"),
    ];
    render(<WeekSchedule today="2026-09-03" items={items} />);

    const week = screen.getByRole("list", { name: "本周七天日程" });
    expect(within(week).getByText("早餐")).toBeVisible();
    expect(within(week).getByText("晨会")).toBeVisible();
    expect(within(week).queryByText("评审")).not.toBeInTheDocument();
    expect(within(week).queryByText("复盘")).not.toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: "查看周四 9月3日的另外 2 项日程" });
    expect(trigger).toHaveTextContent("+2");
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "周四 · 9月3日" });
    expect(within(dialog).getByText("早餐")).toBeVisible();
    expect(within(dialog).getByText("晨会")).toBeVisible();
    expect(within(dialog).getByText("评审")).toBeVisible();
    expect(within(dialog).getByText("复盘")).toBeVisible();
  });

  it("关闭弹窗后将焦点还给展开按钮", async () => {
    const items = [
      scheduleItem("10000000-0000-4000-8000-000000000011", "早餐", "08:00"),
      scheduleItem("10000000-0000-4000-8000-000000000012", "晨会", "09:00"),
      scheduleItem("10000000-0000-4000-8000-000000000013", "评审", "14:00"),
    ];
    render(<WeekSchedule today="2026-09-03" items={items} />);
    const trigger = screen.getByRole("button", { name: "查看周四 9月3日的另外 1 项日程" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "关闭弹窗" }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

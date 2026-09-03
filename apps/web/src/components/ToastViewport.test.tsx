// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { notify } from "../services/notification.service";
import { ToastViewport } from "./ToastViewport";

describe("ToastViewport", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("展示提醒并允许主动关闭", () => {
    render(<ToastViewport />);

    act(() => notify.info("日程提醒：10:00 喝水"));

    expect(screen.getByText("日程提醒：10:00 喝水")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "关闭通知：日程提醒：10:00 喝水" }));
    expect(screen.queryByText("日程提醒：10:00 喝水")).not.toBeInTheDocument();
  });

  it("在展示时间结束后自动移除", () => {
    vi.useFakeTimers();
    render(<ToastViewport />);

    act(() => notify.success("保存成功。"));
    expect(screen.getByText("保存成功。")).toBeVisible();

    act(() => vi.advanceTimersByTime(4_500));
    expect(screen.queryByText("保存成功。")).not.toBeInTheDocument();
  });
});

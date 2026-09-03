// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FirstUseGuide } from "./FirstUseGuide";

interface MockButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

interface MockCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  color?: string;
  pattern?: string;
}

vi.mock("animal-island-ui", () => ({
  Button: ({ children, type: _type, ...props }: MockButtonProps) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Card: ({ children, color: _color, pattern: _pattern, ...props }: MockCardProps) => (
    <div {...props}>{children}</div>
  ),
}));

describe("FirstUseGuide", () => {
  it("直接开始第一条记录并允许跳过", () => {
    const onStart = vi.fn();
    const onDismiss = vi.fn();
    render(<FirstUseGuide onStart={onStart} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "记下第一笔" }));
    fireEvent.click(screen.getByRole("button", { name: "暂时跳过" }));

    expect(onStart).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("示例明确说明不会写入真实数据", () => {
    render(<FirstUseGuide onStart={() => undefined} onDismiss={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "先看示例" }));

    expect(screen.getByRole("region", { name: "示例记录预览" })).toHaveTextContent(
      "不会写入你的真实数据",
    );
    expect(screen.getByRole("button", { name: "收起示例" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});

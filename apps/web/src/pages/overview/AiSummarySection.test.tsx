// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ChangeEvent, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AiSummarySection } from "./AiSummarySection";

const mutation = vi.hoisted(() => ({
  data: undefined,
  error: new Error("生成失败"),
  isError: false,
  isPending: false,
  mutate: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("@/data-provider/ai", () => ({
  useGenerateAiSummary: () => mutation,
}));

interface MockButtonProps {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

interface MockCheckboxProps {
  onChange?: (values: Array<string | number>) => void;
}

interface MockModalProps {
  children?: ReactNode;
  open?: boolean;
}

vi.mock("animal-island-ui", () => ({
  Button: ({ children, disabled, onClick }: MockButtonProps) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Checkbox: ({ onChange }: MockCheckboxProps) => (
    <label>
      <input
        type="checkbox"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange?.(event.target.checked ? ["consent"] : [])
        }
      />
      我同意将本次摘要所需的脱敏记录发送给 AI 服务
    </label>
  ),
  Icon: () => null,
  Modal: ({ children, open }: MockModalProps) => (open ? <div>{children}</div> : null),
  Radio: () => null,
  Tag: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Typewriter: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

describe("AiSummarySection", () => {
  it("只有明确授权后才提交真实 AI 解读请求", () => {
    render(<AiSummarySection date={new Date("2026-09-03T12:00:00+08:00")} />);

    const generateButton = screen.getByRole("button", { name: "生成今日解读" });
    expect(generateButton).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "我同意将本次摘要所需的脱敏记录发送给 AI 服务",
      }),
    );
    expect(generateButton).toBeEnabled();

    fireEvent.click(generateButton);

    expect(mutation.mutate).toHaveBeenCalledWith({
      period: "today",
      date: "2026-09-03",
      style: "gentle",
      consentToSendRecords: true,
    });
  });
});

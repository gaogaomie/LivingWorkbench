// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { MouseEventHandler, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeleteRecordButton } from "./DeleteRecordButton";

interface MockButtonProps {
  type?: string;
  children?: ReactNode;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

vi.mock("animal-island-ui", () => ({
  Button: ({ type, children, disabled, onClick }: MockButtonProps) => (
    <button type="button" data-button-type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Modal: () => null,
}));

vi.mock("../data-provider/life", () => ({
  useTrashMutations: () => ({
    remove: {
      isPending: false,
      mutate: vi.fn(),
    },
  }),
}));

describe("DeleteRecordButton", () => {
  it("列表中的删除操作使用虚线危险按钮", () => {
    render(
      <DeleteRecordButton
        source="finance"
        id="entry-1"
        label="午饭"
        expectedUpdatedAt="2026-09-03T09:00:00.000Z"
        appearance="button"
      />,
    );

    expect(screen.getByRole("button", { name: "删除" })).toHaveAttribute(
      "data-button-type",
      "dashed",
    );
  });
});

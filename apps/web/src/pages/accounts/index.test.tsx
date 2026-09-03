// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Component } from ".";

const createAccount = vi.fn();
const useAuthSession = vi.fn();

vi.mock("animal-island-ui", () => ({
  Button: ({
    htmlType,
    loading,
    children,
    ...props
  }: PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & { htmlType?: "button" | "submit"; loading?: boolean }
  >) => (
    <button type={htmlType ?? "button"} disabled={loading} {...props}>
      {children}
    </button>
  ),
  Card: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Title: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));

vi.mock("@/data-provider/queries/use-auth-session", () => ({
  useAuthSession: () => useAuthSession(),
}));

vi.mock("@/data-provider/admin-accounts", () => ({
  useAdminAccounts: () => ({
    data: {
      items: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          username: "owner",
          role: "admin",
          createdAt: "2026-09-04T00:00:00.000Z",
        },
      ],
    },
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateMemberAccount: () => ({ mutate: createAccount, isPending: false }),
}));

vi.mock("@/services/notification.service", () => ({
  notify: { success: vi.fn() },
}));

describe("account management page", () => {
  beforeEach(() => {
    createAccount.mockReset();
    useAuthSession.mockReturnValue({
      data: {
        user: { id: "00000000-0000-4000-8000-000000000001", username: "owner", role: "admin" },
        csrfToken: "csrf-token-that-is-long-enough-for-tests",
      },
      isPending: false,
    });
  });

  it("lists accounts and submits a normalized member account", async () => {
    const user = userEvent.setup();
    render(<Component />);

    expect(screen.getByRole("row", { name: /owner 管理员/ })).toBeVisible();
    await user.type(screen.getByLabelText("用户名"), "New_Member");
    await user.type(screen.getByLabelText("初始密码"), "safe-password-123");
    await user.click(screen.getByRole("button", { name: "创建成员账号" }));

    expect(createAccount).toHaveBeenCalledWith(
      { username: "new_member", password: "safe-password-123" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("does not expose account controls to members", () => {
    useAuthSession.mockReturnValue({
      data: {
        user: {
          id: "00000000-0000-4000-8000-000000000002",
          username: "islander",
          role: "member",
        },
        csrfToken: "csrf-token-that-is-long-enough-for-tests",
      },
      isPending: false,
    });

    render(<Component />);

    expect(screen.getByRole("alert")).toHaveTextContent("只有管理员可以查看和创建账号");
    expect(screen.queryByRole("button", { name: "创建成员账号" })).not.toBeInTheDocument();
  });
});

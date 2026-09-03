// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEventHandler, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { RecordEditorActions, RecordEditorDrawer } from "./RecordEditorDrawer";

interface MockDrawerProps {
  open: boolean;
  title?: ReactNode;
  maskClosable?: boolean;
  pushBackground?: boolean;
  onClose?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}

interface MockModalProps {
  open: boolean;
  title?: ReactNode;
  onClose?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}

interface MockButtonProps {
  type?: string;
  htmlType?: "button" | "submit" | "reset";
  form?: string;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children?: ReactNode;
}

vi.mock("react-router-dom", () => ({
  useBlocker: () => ({ state: "unblocked" }),
}));

vi.mock("animal-island-ui", () => ({
  Button: ({
    type = "default",
    htmlType = "button",
    form,
    loading,
    onClick,
    children,
  }: MockButtonProps) => (
    <button
      type={htmlType}
      form={form}
      data-appearance={type}
      data-loading={String(loading ?? false)}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  Drawer: ({
    open,
    title,
    maskClosable,
    pushBackground,
    onClose,
    children,
    footer,
  }: MockDrawerProps) =>
    open ? (
      <>
        {maskClosable ? <button type="button" aria-label="抽屉外区域" onClick={onClose} /> : null}
        <div role="dialog" aria-label={String(title)} data-push-background={String(pushBackground)}>
          <button type="button" aria-label="关闭" onClick={onClose} />
          {children}
          {footer ? <div data-testid="drawer-footer">{footer}</div> : null}
        </div>
      </>
    ) : null,
  Modal: ({ open, title, onClose, children, footer }: MockModalProps) =>
    open ? (
      <div role="alertdialog" aria-label={String(title)}>
        <button type="button" aria-label="关闭确认" onClick={onClose} />
        {children}
        {footer}
      </div>
    ) : null,
}));

describe("RecordEditorDrawer", () => {
  it("展示带名称的对话框并允许关闭", () => {
    const onClose = vi.fn();
    render(
      <RecordEditorDrawer open title="新增习惯" onClose={onClose}>
        <span>保存表单</span>
      </RecordEditorDrawer>,
    );

    expect(screen.getByRole("dialog", { name: "新增习惯" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("不启用景深并允许点击抽屉外区域关闭", () => {
    const onClose = vi.fn();
    render(
      <RecordEditorDrawer open title="新增习惯" onClose={onClose}>
        <span>保存表单</span>
      </RecordEditorDrawer>,
    );

    expect(screen.getByRole("dialog", { name: "新增习惯" })).toHaveAttribute(
      "data-push-background",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "抽屉外区域" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("关闭时不会把内容暴露给辅助技术", () => {
    render(
      <RecordEditorDrawer open={false} title="新增习惯" onClose={() => undefined}>
        <span>保存表单</span>
      </RecordEditorDrawer>,
    );

    expect(screen.queryByRole("dialog", { name: "新增习惯" })).not.toBeInTheDocument();
  });

  it("编辑操作在底栏靠右排列并使用默认按钮", () => {
    const onCancel = vi.fn();
    render(
      <RecordEditorDrawer
        open
        title="编辑习惯"
        onClose={onCancel}
        footer={
          <RecordEditorActions
            formId="habit-editor-form"
            saveLabel="保存习惯修改"
            isSaving={false}
            onCancel={onCancel}
          />
        }
      >
        <form id="habit-editor-form" />
      </RecordEditorDrawer>,
    );

    const footer = screen.getByTestId("drawer-footer");
    expect(footer.firstElementChild).toHaveClass("justify-end");
    const cancelButton = screen.getByRole("button", { name: "取消编辑" });
    const saveButton = screen.getByRole("button", { name: "保存习惯修改" });
    expect(cancelButton).toHaveAttribute("data-appearance", "default");
    expect(saveButton).toHaveAttribute("data-appearance", "default");
    expect(saveButton).toHaveAttribute("type", "submit");
    expect(saveButton).toHaveAttribute("form", "habit-editor-form");
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("表单发生修改后关闭时要求确认，继续填写会保留抽屉", () => {
    const onClose = vi.fn();
    render(
      <RecordEditorDrawer open title="新增习惯" onClose={onClose} protectUnsavedChanges>
        <label>
          习惯名称
          <input />
        </label>
      </RecordEditorDrawer>,
    );

    fireEvent.input(screen.getByRole("textbox", { name: "习惯名称" }), {
      target: { value: "喝水" },
    });
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "还有内容没有保存" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "继续填写" }));
    expect(screen.getByRole("dialog", { name: "新增习惯" })).toBeVisible();
  });

  it("确认放弃后关闭抽屉", () => {
    const onClose = vi.fn();
    render(
      <RecordEditorDrawer open title="新增习惯" onClose={onClose} protectUnsavedChanges>
        <label>
          习惯名称
          <input />
        </label>
      </RecordEditorDrawer>,
    );

    fireEvent.input(screen.getByRole("textbox", { name: "习惯名称" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "放弃修改" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("编辑底栏取消操作也经过未保存确认", () => {
    const onCancel = vi.fn();
    render(
      <RecordEditorDrawer
        open
        title="编辑习惯"
        onClose={onCancel}
        protectUnsavedChanges
        footer={
          <RecordEditorActions
            formId="habit-editor-form"
            saveLabel="保存习惯修改"
            isSaving={false}
            onCancel={onCancel}
          />
        }
      >
        <label>
          习惯名称
          <input />
        </label>
      </RecordEditorDrawer>,
    );

    fireEvent.input(screen.getByRole("textbox", { name: "习惯名称" }));
    fireEvent.click(screen.getByRole("button", { name: "取消编辑" }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "还有内容没有保存" })).toBeVisible();
  });
});

import { Button, Drawer, Modal } from "animal-island-ui";
import {
  createContext,
  type FormEventHandler,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useBlocker } from "react-router-dom";

type RequestClose = (onConfirmed?: () => void) => void;

const UnsavedChangesContext = createContext<RequestClose | null>(null);

interface RecordEditorDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  protectUnsavedChanges?: boolean;
}

interface RecordEditorActionsProps {
  formId: string;
  saveLabel: string;
  cancelLabel?: string;
  isSaving: boolean;
  onCancel: () => void;
}

export function RecordEditorActions({
  formId,
  saveLabel,
  cancelLabel = "取消编辑",
  isSaving,
  onCancel,
}: RecordEditorActionsProps) {
  const requestClose = useContext(UnsavedChangesContext);

  return (
    <div className="flex flex-wrap justify-end gap-3">
      <Button
        type="default"
        htmlType="button"
        onClick={() => (requestClose ? requestClose(onCancel) : onCancel())}
      >
        {cancelLabel}
      </Button>
      <Button type="default" htmlType="submit" form={formId} loading={isSaving}>
        {saveLabel}
      </Button>
    </div>
  );
}

export function RecordEditorDrawer({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
  protectUnsavedChanges = false,
}: RecordEditorDrawerProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
  const shouldProtect = open && protectUnsavedChanges && hasUnsavedChanges;
  const blocker = useBlocker(shouldProtect);

  useEffect(() => {
    if (!open) {
      setHasUnsavedChanges(false);
      setPendingClose(null);
    }
  }, [open]);

  useEffect(() => {
    if (!shouldProtect) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [shouldProtect]);

  const requestClose: RequestClose = (onConfirmed = onClose) => {
    if (!shouldProtect) {
      onConfirmed();
      return;
    }
    setPendingClose(() => onConfirmed);
  };

  const confirmDiscard = () => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    } else {
      pendingClose?.();
    }
    setPendingClose(null);
    setHasUnsavedChanges(false);
  };

  const keepEditing = () => {
    if (blocker.state === "blocked") blocker.reset();
    setPendingClose(null);
  };

  const markUnsaved: FormEventHandler<HTMLDivElement> = () => {
    if (protectUnsavedChanges) setHasUnsavedChanges(true);
  };

  return (
    <UnsavedChangesContext.Provider value={requestClose}>
      <Drawer
        open={open}
        title={title}
        placement="right"
        width={wide ? "min(620px, 100vw)" : "min(520px, 100vw)"}
        maskClosable
        pushBackground={false}
        footer={footer}
        onClose={() => requestClose()}
        className="max-w-full [&_.animal-date-picker]:w-full [&_.animal-time-picker]:w-full"
      >
        <div onInputCapture={markUnsaved} onChangeCapture={markUnsaved}>
          {children}
        </div>
      </Drawer>
      <Modal
        open={pendingClose !== null || blocker.state === "blocked"}
        title="还有内容没有保存"
        typewriter={false}
        maskClosable={false}
        onClose={keepEditing}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="default" onClick={keepEditing}>
              继续填写
            </Button>
            <Button type="primary" danger onClick={confirmDiscard}>
              放弃修改
            </Button>
          </div>
        }
      >
        现在离开会丢失这次填写的内容。你可以继续填写，或确认放弃修改。
      </Modal>
    </UnsavedChangesContext.Provider>
  );
}

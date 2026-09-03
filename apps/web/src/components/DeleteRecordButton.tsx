import type { TrashSource } from "@daily-life/shared";
import { Button, Modal } from "animal-island-ui";
import { useState } from "react";
import { useTrashMutations } from "../data-provider/life";
import { notify } from "../services/notification.service";

interface DeleteRecordButtonProps {
  source: TrashSource;
  id: string;
  label: string;
  expectedUpdatedAt: string;
  appearance?: "text" | "button";
}

export function DeleteRecordButton({
  source,
  id,
  label,
  expectedUpdatedAt,
  appearance = "text",
}: DeleteRecordButtonProps) {
  const [open, setOpen] = useState(false);
  const { remove } = useTrashMutations();

  const confirm = () => {
    remove.mutate(
      { source, id, expectedUpdatedAt },
      {
        onSuccess: () => {
          setOpen(false);
          notify.success("已移到回收站，可随时恢复。");
        },
      },
    );
  };

  return (
    <>
      <Button
        type={appearance === "button" ? "dashed" : "text"}
        danger
        size="small"
        aria-label={`删除“${label}”`}
        onClick={() => setOpen(true)}
      >
        删除
      </Button>
      <Modal
        open={open}
        title="移到回收站？"
        typewriter={false}
        maskClosable={!remove.isPending}
        onClose={() => !remove.isPending && setOpen(false)}
        footer={
          <>
            <Button disabled={remove.isPending} onClick={() => setOpen(false)}>
              先保留
            </Button>
            <Button type="primary" danger loading={remove.isPending} onClick={confirm}>
              确认删除
            </Button>
          </>
        }
      >
        “{label}”会从当前模块和时光档案中隐藏，但仍可从回收站恢复。
      </Modal>
    </>
  );
}

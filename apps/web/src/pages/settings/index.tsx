import type { RestorePreflightResponse, TrashSource } from "@daily-life/shared";
import { Button, Card, Modal, Title } from "animal-island-ui";
import { useRef, useState } from "react";
import { useBackupMutations } from "@/data-provider/backup";
import { useTrash, useTrashMutations } from "@/data-provider/life";
import { notify } from "@/services/notification.service";

const sourceLabels: Record<TrashSource, string> = {
  finance: "财务",
  habit: "习惯",
  fitness: "健身",
  schedule: "日程",
  shopping: "待买",
  media: "书影音",
};

const deletedAtFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const backupCountLabels: Record<string, string> = {
  settings: "偏好设置",
  financeEntries: "财务记录",
  monthlyBudgets: "月度预算",
  habits: "习惯",
  habitLogs: "习惯打卡",
  fitnessProfiles: "健身档案",
  fitnessLogs: "健身记录",
  todoLists: "日程清单",
  todos: "待办事项",
  shoppingItems: "待买物品",
  mediaItems: "书影音",
};

function downloadBackup(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `riji-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)));
  }
  return window.btoa(chunks.join(""));
}

export function Component() {
  const trash = useTrash();
  const mutations = useTrashMutations();
  const backupMutations = useBackupMutations();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedWorkbook, setSelectedWorkbook] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<RestorePreflightResponse | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const restore = (item: NonNullable<typeof trash.data>["items"][number]) => {
    mutations.restore.mutate(
      { source: item.source, id: item.id, expectedDeletedAt: item.deletedAt },
      {
        onSuccess: () => notify.success(`“${item.label}”已恢复。`),
      },
    );
  };

  const exportBackup = () => {
    backupMutations.exportBackup.mutate(undefined, {
      onSuccess: (workbook) => {
        downloadBackup(workbook);
        notify.success("Excel 备份已生成并开始下载。");
      },
    });
  };

  const inspectBackup = async (file: File) => {
    setSelectedWorkbook(null);
    setPreflight(null);
    if (file.size > 10 * 1024 * 1024) {
      notify.error("备份文件不能超过 10 MB。");
      return;
    }
    try {
      const workbookBase64 = arrayBufferToBase64(await file.arrayBuffer());
      backupMutations.preflight.mutate(workbookBase64, {
        onSuccess: (result) => {
          setSelectedWorkbook(workbookBase64);
          setPreflight(result);
          notify.success("备份校验通过，可以查看恢复摘要。");
        },
      });
    } catch {
      notify.error("无法读取这个 Excel 文件。");
    }
  };

  const restoreBackup = () => {
    if (!selectedWorkbook || !preflight) return;
    backupMutations.restore.mutate(
      { workbookBase64: selectedWorkbook, expectedChecksumSha256: preflight.checksumSha256 },
      {
        onSuccess: () => {
          setRestoreOpen(false);
          setSelectedWorkbook(null);
          setPreflight(null);
          notify.success("业务数据已从备份恢复。");
        },
      },
    );
  };

  return (
    <section className="grid gap-7">
      <header className="[&_h1]:my-2 [&_h1]:font-sans [&_h1]:text-[clamp(30px,4vw,46px)] [&_h1]:leading-[1.18] [&_h1]:text-[var(--animal-text-color)] [&>p]:m-0 [&>p]:max-w-[680px] [&>p]:text-island-muted">
        <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
          设置与数据安全
        </p>
        <h1>最近删除</h1>
        <p>删除只会隐藏记录，不会立刻清空数据；恢复时会检查是否存在其他页面的更新。</p>
      </header>
      <Title color="app-teal">备份与恢复</Title>
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Card className="px-7 py-[26px] [&_.eyebrow]:mt-0 [&_h2]:mt-0 [&>p:not(.eyebrow)]:leading-[1.7] [&>p:not(.eyebrow)]:text-[var(--animal-text-color-secondary)]">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            导出
          </p>
          <h2>下载业务全量 Excel</h2>
          <p>六类业务各有可读工作表，并保留恢复校验信息；不包含密码、Session 或 AI 密钥。</p>
          <Button
            type="primary"
            loading={backupMutations.exportBackup.isPending}
            onClick={exportBackup}
          >
            生成并下载备份
          </Button>
        </Card>
        <Card
          className="px-7 py-[26px] [&_.eyebrow]:mt-0 [&_h2]:mt-0 [&>p:not(.eyebrow)]:leading-[1.7] [&>p:not(.eyebrow)]:text-[var(--animal-text-color-secondary)]"
          type="dashed"
        >
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
            恢复
          </p>
          <h2>先校验，再整体恢复</h2>
          <p>选择文件只会执行格式、校验和与关联关系检查，不会立即修改当前数据。</p>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void inspectBackup(file);
              event.target.value = "";
            }}
          />
          <Button
            loading={backupMutations.preflight.isPending}
            onClick={() => fileInput.current?.click()}
          >
            选择 Excel 备份
          </Button>
        </Card>
      </div>

      {preflight ? (
        <Card className="px-7 py-[26px] [&>p]:leading-[1.7] [&>p]:text-[var(--animal-text-color-secondary)]">
          <div className="mb-[18px] flex flex-col items-start justify-between gap-[18px] sm:flex-row sm:items-center [&_.eyebrow]:m-0 [&>span]:rounded-full [&>span]:bg-[var(--animal-primary-color-bg)] [&>span]:px-3 [&>span]:py-[7px] [&>span]:font-extrabold [&>span]:text-[var(--animal-primary-color-active)]">
            <div>
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.15em] text-[var(--animal-primary-color)]">
                校验通过
              </p>
              <h2>恢复摘要</h2>
            </div>
            <span>{preflight.totalEntities} 项</span>
          </div>
          <p>
            导出时间：{deletedAtFormatter.format(new Date(preflight.exportedAt))} · 校验码：
            {preflight.checksumSha256.slice(0, 12)}…
          </p>
          <div className="my-5 grid grid-cols-1 gap-2.5 sm:grid-cols-4 [&>div]:rounded-[var(--animal-border-radius-sm)] [&>div]:border-[length:var(--animal-border-width)] [&>div]:border-[var(--animal-border-color-light)] [&>div]:bg-[var(--animal-bg-color)] [&>div]:p-3 [&_span]:block [&_span]:text-[length:var(--animal-font-size-sm)] [&_span]:text-[var(--animal-text-color-secondary)] [&_strong]:mt-[5px] [&_strong]:block [&_strong]:text-[length:var(--animal-font-size-lg)] [&_strong]:text-[var(--animal-primary-color-active)]">
            {Object.entries(preflight.entityCounts).map(([key, count]) => (
              <div key={key}>
                <span>{backupCountLabels[key] ?? key}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <ul className="mb-[22px] mt-0 pl-[22px] leading-[1.7] text-[var(--animal-error-color-active)]">
            {preflight.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <Button type="primary" danger onClick={() => setRestoreOpen(true)}>
            准备整体恢复
          </Button>
        </Card>
      ) : null}

      <Title color="app-yellow">可以找回的记录</Title>
      <Card className="w-full p-[22px] sm:p-7">
        {trash.isPending ? (
          <p className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
            正在查看最近删除…
          </p>
        ) : null}
        {trash.data?.items.length === 0 ? (
          <p className="grid min-h-[140px] w-full place-items-center px-6 py-[42px] text-center text-[var(--animal-text-color-secondary)]">
            这里是空的，最近没有删除记录。
          </p>
        ) : null}
        <div className="grid">
          {trash.data?.items.map((item) => (
            <article
              className="grid grid-cols-1 items-start gap-3.5 border-b-[var(--animal-border-width)] border-dashed border-[var(--animal-border-color-light)] px-1 py-[18px] [contain-intrinsic-size:88px] [content-visibility:auto] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
              key={`${item.source}:${item.id}`}
            >
              <div>
                <span>{sourceLabels[item.source]}</span>
                <strong>{item.label}</strong>
                <p>删除于 {deletedAtFormatter.format(new Date(item.deletedAt))}</p>
              </div>
              <Button
                type="primary"
                loading={mutations.restore.isPending}
                onClick={() => restore(item)}
              >
                恢复记录
              </Button>
            </article>
          ))}
        </div>
      </Card>
      <Modal
        open={restoreOpen}
        title="确认整体恢复？"
        typewriter={false}
        maskClosable={!backupMutations.restore.isPending}
        onClose={() => !backupMutations.restore.isPending && setRestoreOpen(false)}
        footer={
          <>
            <Button
              disabled={backupMutations.restore.isPending}
              onClick={() => setRestoreOpen(false)}
            >
              先不恢复
            </Button>
            <Button
              type="primary"
              danger
              loading={backupMutations.restore.isPending}
              onClick={restoreBackup}
            >
              确认替换当前数据
            </Button>
          </>
        }
      >
        当前业务数据会被这份备份整体替换。服务端会先自动保存一份恢复前快照；密码和当前登录状态不会改变。
      </Modal>
    </section>
  );
}

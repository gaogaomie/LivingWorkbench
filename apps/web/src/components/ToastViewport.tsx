import { useEffect, useRef, useState } from "react";
import {
  ANNOUNCE_EVENT,
  type NotificationEventDetail,
  type NotificationLevel,
} from "../services/announcement-events";

interface ToastItem extends NotificationEventDetail {
  id: string;
}

const levelStyles: Record<NotificationLevel, string> = {
  success: "border-[var(--animal-success-color)]",
  error: "border-[var(--animal-error-color)]",
  warning: "border-[var(--animal-warning-color)]",
  info: "border-[var(--animal-primary-color)]",
};

const levelLabels: Record<NotificationLevel, string> = {
  success: "成功",
  error: "错误",
  warning: "提醒",
  info: "消息",
};

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const removalTimers = useRef(new Set<number>());

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent<NotificationEventDetail>).detail;
      const id = crypto.randomUUID();
      setToasts((current) => [
        ...current.filter((toast) => toast.message !== detail.message).slice(-2),
        { ...detail, id },
      ]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        removalTimers.current.delete(timer);
      }, 4_500);
      removalTimers.current.add(timer);
    };

    window.addEventListener(ANNOUNCE_EVENT, handleNotification);
    return () => {
      window.removeEventListener(ANNOUNCE_EVENT, handleNotification);
      for (const timer of removalTimers.current) window.clearTimeout(timer);
      removalTimers.current.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <section
      className="pointer-events-none fixed left-1/2 top-4 z-[200] flex w-[min(92vw,460px)] -translate-x-1/2 flex-col gap-2.5"
      aria-label="通知"
    >
      {toasts.map((toast) => (
        <div
          className={`pointer-events-auto flex items-start gap-3 rounded-[var(--animal-border-radius-lg)] border-2 bg-[var(--animal-surface-color)] px-4 py-3 text-[var(--animal-text-color)] shadow-[var(--animal-shadow-lg)] ${levelStyles[toast.level]}`}
          key={toast.id}
        >
          <div className="min-w-0 flex-1">
            <strong className="mb-0.5 block text-sm">{levelLabels[toast.level]}</strong>
            <span className="block [overflow-wrap:anywhere]">{toast.message}</span>
          </div>
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-full text-xl leading-none text-[var(--animal-text-color-secondary)] hover:bg-[var(--animal-bg-color)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--animal-primary-color)]"
            aria-label={`关闭通知：${toast.message}`}
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
          >
            ×
          </button>
        </div>
      ))}
    </section>
  );
}

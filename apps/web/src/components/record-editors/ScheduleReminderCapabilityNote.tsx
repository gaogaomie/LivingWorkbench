export function ScheduleReminderCapabilityNote() {
  return (
    <p
      role="note"
      aria-label="提醒能力说明"
      className="m-0 max-w-[420px] text-sm leading-relaxed text-[var(--animal-text-color-secondary)]"
    >
      仅在工作台打开时显示站内提醒；关闭工作台后不会发送系统通知。
    </p>
  );
}

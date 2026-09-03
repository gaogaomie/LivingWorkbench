export const queryKeys = {
  authSession: ["auth", "session"] as const,
  adminAccounts: ["admin", "accounts"] as const,
  health: ["server", "health"] as const,
  financeMonth: (month: string) => ["finance", "month", month] as const,
  habits: (date: string) => ["habits", date] as const,
  fitness: (today: string) => ["fitness", today] as const,
  schedule: (today: string) => ["schedule", today] as const,
  dueReminders: ["schedule", "reminders", "due"] as const,
  shopping: (month: string) => ["shopping", month] as const,
  media: (year: string) => ["media", year] as const,
  timelineRoot: ["timeline"] as const,
  timeline: (filters: {
    from?: string | undefined;
    to?: string | undefined;
    source?: string | undefined;
    keyword?: string | undefined;
  }) => ["timeline", filters] as const,
  overviewRoot: ["overview"] as const,
  overview: (date: string) => ["overview", { date }] as const,
  trash: ["trash"] as const,
};

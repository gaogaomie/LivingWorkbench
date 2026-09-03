import type { IconName } from "animal-island-ui";

export const routePaths = {
  overview: "/",
  finance: "/finance",
  habits: "/habits",
  fitness: "/fitness",
  schedule: "/schedule",
  shopping: "/shopping",
  media: "/media",
  timeline: "/timeline",
  settings: "/settings",
} as const;

interface NavigationItem {
  label: string;
  shortLabel: string;
  to: (typeof routePaths)[keyof typeof routePaths];
  icon: IconName;
}

export const primaryNavigation = [
  { label: "今日总览", shortLabel: "今日", to: routePaths.overview, icon: "icon-map" },
  { label: "记账理财", shortLabel: "财务", to: routePaths.finance, icon: "icon-miles" },
  { label: "习惯健康", shortLabel: "习惯", to: routePaths.habits, icon: "icon-diy" },
  { label: "减脂健身", shortLabel: "健身", to: routePaths.fitness, icon: "icon-critterpedia" },
  { label: "日程统筹", shortLabel: "日程", to: routePaths.schedule, icon: "icon-chat" },
  { label: "待买清单", shortLabel: "待买", to: routePaths.shopping, icon: "icon-shopping" },
  { label: "书影音", shortLabel: "收藏", to: routePaths.media, icon: "icon-camera" },
] as const satisfies ReadonlyArray<NavigationItem>;

export const dataNavigation = [
  { label: "时光档案", shortLabel: "档案", to: routePaths.timeline, icon: "icon-design" },
  { label: "回收站", shortLabel: "回收", to: routePaths.settings, icon: "icon-variant" },
] as const satisfies ReadonlyArray<NavigationItem>;

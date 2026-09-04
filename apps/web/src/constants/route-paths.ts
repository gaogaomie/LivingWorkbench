import moneyBag from "animal-island-ui/items/item-021.png";
import sneakers from "animal-island-ui/items/item-033.png";
import star from "animal-island-ui/items/item-353.png";
import seedling from "animal-island-ui/items/item-444.png";
import passport from "animal-island-ui/items/item-450.png";
import book from "animal-island-ui/items/item-460.png";
import fossil from "animal-island-ui/items/item-464.png";
import shoppingBag from "animal-island-ui/items/item-471.png";
import pocketWatch from "animal-island-ui/items/item-477.png";
import recyclingBox from "animal-island-ui/items/item-481.png";

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
  accounts: "/settings/accounts",
} as const;

interface NavigationItem {
  label: string;
  shortLabel: string;
  to: (typeof routePaths)[keyof typeof routePaths];
  iconSrc: string;
}

export const primaryNavigation = [
  { label: "今日总览", shortLabel: "今日", to: routePaths.overview, iconSrc: star },
  { label: "记账理财", shortLabel: "财务", to: routePaths.finance, iconSrc: moneyBag },
  { label: "习惯健康", shortLabel: "习惯", to: routePaths.habits, iconSrc: seedling },
  { label: "减脂健身", shortLabel: "健身", to: routePaths.fitness, iconSrc: sneakers },
  { label: "日程统筹", shortLabel: "日程", to: routePaths.schedule, iconSrc: pocketWatch },
  { label: "待买清单", shortLabel: "待买", to: routePaths.shopping, iconSrc: shoppingBag },
  { label: "书影音", shortLabel: "收藏", to: routePaths.media, iconSrc: book },
] as const satisfies ReadonlyArray<NavigationItem>;

export const dataNavigation = [
  { label: "时光档案", shortLabel: "档案", to: routePaths.timeline, iconSrc: fossil },
  { label: "回收站", shortLabel: "回收", to: routePaths.settings, iconSrc: recyclingBox },
] as const satisfies ReadonlyArray<NavigationItem>;

export const adminNavigation = [
  { label: "账号管理", shortLabel: "账号", to: routePaths.accounts, iconSrc: passport },
] as const satisfies ReadonlyArray<NavigationItem>;

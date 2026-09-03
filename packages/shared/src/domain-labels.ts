import type { FinanceEntryType } from "./schemas/finance.schema";
import type {
  HabitDayItem,
  MediaItem,
  ScheduleResponse,
  ShoppingItem,
  TimelineSource,
  TodoStatus,
  TrashSource,
} from "./schemas/life.schema";

export const financeEntryTypeLabels: Record<FinanceEntryType, string> = {
  expense: "支出",
  income: "收入",
};

export const habitTargetTypeLabels: Record<HabitDayItem["targetType"], string> = {
  boolean: "完成一次",
  count: "累计次数",
  duration: "累计时长",
};

export const habitStatusLabels: Record<HabitDayItem["status"], string> = {
  active: "进行中",
  paused: "已暂停",
  archived: "已归档",
};

export const todoPriorityLabels: Record<ScheduleResponse["items"][number]["priority"], string> = {
  low: "低",
  normal: "普通",
  high: "高",
  urgent: "紧急",
};

export const todoStatusLabels: Record<TodoStatus, string> = {
  pending: "待办",
  completed: "已完成",
  cancelled: "已取消",
};

export const shoppingCategoryLabels: Record<ShoppingItem["categoryId"], string> = {
  food: "食品",
  daily: "日用",
  clothing: "服饰",
  digital: "数码",
  home: "家居",
  gift: "礼物",
  other: "其他",
};

export const shoppingPriorityLabels: Record<ShoppingItem["priority"], string> = {
  casual: "随手记",
  someday: "有空买",
  soon: "近期买",
  urgent: "急需",
};

export const shoppingStatusLabels: Record<ShoppingItem["status"], string> = {
  wanted: "待买",
  purchased: "已买",
};

export const mediaTypeLabels: Record<MediaItem["type"], string> = {
  book: "书籍",
  movie: "电影",
  series: "剧集",
  show: "综艺",
  anime: "动漫",
  podcast: "播客",
  other: "其他",
};

export const mediaStatusLabels: Record<MediaItem["status"], string> = {
  wishlist: "想看 / 想读",
  in_progress: "进行中",
  completed: "已完成",
  paused: "搁置",
};

export const timelineSourceLabels: Record<TimelineSource, string> = {
  finance: "财务",
  habit: "习惯",
  fitness: "健身",
  schedule: "日程",
  shopping: "待买",
  media: "书影音",
};

export const trashSourceLabels: Record<TrashSource, string> = timelineSourceLabels;

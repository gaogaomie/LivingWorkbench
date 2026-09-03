import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestampColumns = () => ({
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member"),
    ...timestampColumns(),
  },
  (table) => [uniqueIndex("users_username_uq").on(table.username)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    idHash: text("id_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    csrfTokenHash: text("csrf_token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

const entityColumns = () => ({
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  schemaVersion: integer("schema_version").notNull().default(1),
  ...timestampColumns(),
});

export const appSettings = sqliteTable("app_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  locale: text("locale").notNull().default("zh-CN"),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  currency: text("currency").notNull().default("CNY"),
  weightUnit: text("weight_unit").notNull().default("kg"),
  theme: text("theme").notNull().default("animal-default"),
  updatedAt: text("updated_at").notNull(),
});

export const financeEntries = sqliteTable(
  "finance_entries",
  {
    ...entityColumns(),
    type: text("type").notNull(),
    amountFen: integer("amount_fen").notNull(),
    categoryId: text("category_id").notNull(),
    date: text("date").notNull(),
    month: text("month").notNull(),
    note: text("note"),
  },
  (table) => [
    index("finance_entries_type_date_idx").on(table.type, table.date),
    index("finance_entries_category_date_idx").on(table.categoryId, table.date),
  ],
);

export const monthlyBudgets = sqliteTable(
  "monthly_budgets",
  {
    ...entityColumns(),
    month: text("month").notNull(),
    amountFen: integer("amount_fen").notNull(),
  },
  (table) => [uniqueIndex("monthly_budgets_user_month_uq").on(table.userId, table.month)],
);

export const habits = sqliteTable(
  "habits",
  {
    ...entityColumns(),
    name: text("name").notNull(),
    targetType: text("target_type").notNull(),
    targetValue: integer("target_value").notNull(),
    unit: text("unit").notNull(),
    weekdays: text("weekdays", { mode: "json" }).$type<number[]>().notNull(),
    startDate: text("start_date").notNull(),
    colorKey: text("color_key").notNull(),
    status: text("status").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("habits_user_status_idx").on(table.userId, table.status)],
);

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    ...entityColumns(),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    value: integer("value").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [uniqueIndex("habit_logs_habit_date_uq").on(table.habitId, table.date)],
);

export const fitnessProfiles = sqliteTable(
  "fitness_profiles",
  {
    ...entityColumns(),
    singletonKey: text("singleton_key").notNull().default("default"),
    heightCm: integer("height_cm"),
    birthYear: integer("birth_year"),
    sexForFormula: text("sex_for_formula"),
    startWeightGram: integer("start_weight_gram"),
    targetWeightGram: integer("target_weight_gram"),
    targetDate: text("target_date"),
  },
  (table) => [
    uniqueIndex("fitness_profiles_user_singleton_uq").on(table.userId, table.singletonKey),
  ],
);

export const fitnessLogs = sqliteTable(
  "fitness_logs",
  {
    ...entityColumns(),
    date: text("date").notNull(),
    weightGram: integer("weight_gram"),
    bodyFatBasisPoints: integer("body_fat_basis_points"),
    calorieIntakeKcal: integer("calorie_intake_kcal"),
    exerciseMinutes: integer("exercise_minutes"),
    steps: integer("steps"),
    note: text("note"),
  },
  (table) => [uniqueIndex("fitness_logs_user_date_uq").on(table.userId, table.date)],
);

export const todoLists = sqliteTable(
  "todo_lists",
  {
    ...entityColumns(),
    name: text("name").notNull(),
    colorKey: text("color_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("todo_lists_user_name_uq").on(table.userId, table.name)],
);

export const todos = sqliteTable(
  "todos",
  {
    ...entityColumns(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    time: text("time"),
    listId: text("list_id").references(() => todoLists.id, { onDelete: "set null" }),
    priority: text("priority").notNull(),
    note: text("note"),
    reminderMinutesBefore: integer("reminder_minutes_before"),
    status: text("status").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [index("todos_user_status_date_idx").on(table.userId, table.status, table.date)],
);

export const shoppingItems = sqliteTable(
  "shopping_items",
  {
    ...entityColumns(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unit: text("unit"),
    categoryId: text("category_id").notNull(),
    estimatedUnitPriceFen: integer("estimated_unit_price_fen"),
    actualUnitPriceFen: integer("actual_unit_price_fen"),
    priority: text("priority").notNull(),
    note: text("note"),
    status: text("status").notNull(),
    purchasedOn: text("purchased_on"),
  },
  (table) => [index("shopping_items_user_status_idx").on(table.userId, table.status)],
);

export const mediaItems = sqliteTable(
  "media_items",
  {
    ...entityColumns(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    rating: integer("rating"),
    recordedOn: text("recorded_on").notNull(),
    completedOn: text("completed_on"),
    review: text("review"),
    coverAssetId: text("cover_asset_id"),
  },
  (table) => [index("media_items_user_type_status_idx").on(table.userId, table.type, table.status)],
);

export const assets = sqliteTable(
  "assets",
  {
    ...entityColumns(),
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    size: integer("size").notNull(),
  },
  (table) => [uniqueIndex("assets_storage_key_uq").on(table.storageKey)],
);

export const drafts = sqliteTable(
  "drafts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    module: text("module").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    updatedAt: text("updated_at").notNull(),
    expiresAt: text("expires_at"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.key] })],
);

export const aiProviderConfigs = sqliteTable("ai_provider_configs", {
  ...entityColumns(),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  baseUrl: text("base_url").notNull(),
  model: text("model").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  maskedKeyHint: text("masked_key_hint"),
  keyUpdatedAt: text("key_updated_at"),
  lastConnectionTestAt: text("last_connection_test_at"),
});

export const aiSecrets = sqliteTable("ai_secrets", {
  providerId: text("provider_id")
    .primaryKey()
    .references(() => aiProviderConfigs.id, { onDelete: "cascade" }),
  ciphertext: text("ciphertext").notNull(),
  nonce: text("nonce").notNull(),
  authTag: text("auth_tag").notNull(),
  algorithmVersion: integer("algorithm_version").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const aiConsents = sqliteTable(
  "ai_consents",
  {
    ...entityColumns(),
    scope: text("scope").notNull(),
    grantedAt: text("granted_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [uniqueIndex("ai_consents_user_scope_uq").on(table.userId, table.scope)],
);

export const aiInsights = sqliteTable(
  "ai_insights",
  {
    ...entityColumns(),
    type: text("type").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    dataVersion: text("data_version").notNull(),
    providerId: text("provider_id"),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    content: text("content", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    sourceRefs: text("source_refs", { mode: "json" })
      .$type<Array<{ entityType: string; entityId: string }>>()
      .notNull(),
    safetyStatus: text("safety_status").notNull(),
    generatedAt: text("generated_at").notNull(),
  },
  (table) => [
    index("ai_insights_user_type_period_idx").on(table.userId, table.type, table.periodEnd),
  ],
);

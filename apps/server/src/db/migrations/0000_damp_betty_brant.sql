CREATE TABLE `ai_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`scope` text NOT NULL,
	`granted_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_consents_user_scope_uq` ON `ai_consents` (`user_id`,`scope`);--> statement-breakpoint
CREATE TABLE `ai_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`type` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`data_version` text NOT NULL,
	`provider_id` text,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`content` text NOT NULL,
	`source_refs` text NOT NULL,
	`safety_status` text NOT NULL,
	`generated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_insights_user_type_period_idx` ON `ai_insights` (`user_id`,`type`,`period_end`);--> statement-breakpoint
CREATE TABLE `ai_provider_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`provider` text NOT NULL,
	`label` text NOT NULL,
	`base_url` text NOT NULL,
	`model` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`masked_key_hint` text,
	`key_updated_at` text,
	`last_connection_test_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_secrets` (
	`provider_id` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`nonce` text NOT NULL,
	`auth_tag` text NOT NULL,
	`algorithm_version` integer NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `ai_provider_configs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`locale` text DEFAULT 'zh-CN' NOT NULL,
	`timezone` text DEFAULT 'Asia/Shanghai' NOT NULL,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`theme` text DEFAULT 'animal-default' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`mime_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`checksum_sha256` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_storage_key_uq` ON `assets` (`storage_key`);--> statement-breakpoint
CREATE TABLE `drafts` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`module` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `finance_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`type` text NOT NULL,
	`amount_fen` integer NOT NULL,
	`category_id` text NOT NULL,
	`date` text NOT NULL,
	`month` text NOT NULL,
	`note` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finance_entries_type_date_idx` ON `finance_entries` (`type`,`date`);--> statement-breakpoint
CREATE INDEX `finance_entries_category_date_idx` ON `finance_entries` (`category_id`,`date`);--> statement-breakpoint
CREATE TABLE `fitness_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`date` text NOT NULL,
	`weight_gram` integer,
	`body_fat_basis_points` integer,
	`calorie_intake_kcal` integer,
	`exercise_minutes` integer,
	`steps` integer,
	`note` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_logs_user_date_uq` ON `fitness_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `fitness_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`singleton_key` text DEFAULT 'default' NOT NULL,
	`height_cm` integer,
	`birth_year` integer,
	`sex_for_formula` text,
	`start_weight_gram` integer,
	`target_weight_gram` integer,
	`target_date` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_profiles_user_singleton_uq` ON `fitness_profiles` (`user_id`,`singleton_key`);--> statement-breakpoint
CREATE TABLE `habit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`value` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_logs_habit_date_uq` ON `habit_logs` (`habit_id`,`date`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`target_type` text NOT NULL,
	`target_value` integer NOT NULL,
	`unit` text NOT NULL,
	`weekdays` text NOT NULL,
	`start_date` text NOT NULL,
	`color_key` text NOT NULL,
	`status` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `habits_user_status_idx` ON `habits` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`rating` integer,
	`recorded_on` text NOT NULL,
	`completed_on` text,
	`review` text,
	`cover_asset_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_items_user_type_status_idx` ON `media_items` (`user_id`,`type`,`status`);--> statement-breakpoint
CREATE TABLE `monthly_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`month` text NOT NULL,
	`amount_fen` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_budgets_user_month_uq` ON `monthly_budgets` (`user_id`,`month`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`csrf_token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `shopping_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit` text,
	`category_id` text NOT NULL,
	`estimated_unit_price_fen` integer,
	`actual_unit_price_fen` integer,
	`priority` text NOT NULL,
	`note` text,
	`status` text NOT NULL,
	`purchased_on` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shopping_items_user_status_idx` ON `shopping_items` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `todo_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`color_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `todo_lists_user_name_uq` ON `todo_lists` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`list_id` text,
	`priority` text NOT NULL,
	`note` text,
	`reminder_minutes_before` integer,
	`status` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `todos_user_status_date_idx` ON `todos` (`user_id`,`status`,`date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_uq` ON `users` (`username`);
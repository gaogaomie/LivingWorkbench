ALTER TABLE `users` ADD `role` text DEFAULT 'member' NOT NULL;
--> statement-breakpoint
UPDATE `users`
SET `role` = 'admin'
WHERE `id` = (
	SELECT `id`
	FROM `users`
	WHERE `deleted_at` IS NULL
	ORDER BY `created_at` ASC
	LIMIT 1
);

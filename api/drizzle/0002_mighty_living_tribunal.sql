CREATE TABLE `entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`headword` text NOT NULL,
	`part_of_speech` text,
	`data` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);

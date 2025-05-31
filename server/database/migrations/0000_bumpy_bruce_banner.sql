CREATE TABLE `business_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_id` text NOT NULL,
	`google_place_id` text,
	`apple_maps_id` text,
	`name` text,
	`address` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`website_url` text,
	`facebook_url` text,
	`instagram_username` text,
	`tiktok_username` text,
	`x_username` text,
	`linkedin_url` text,
	`youtube_url` text,
	`uber_eats_url` text,
	`door_dash_url` text,
	`deliveroo_url` text,
	`menulog_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

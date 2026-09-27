ALTER TABLE `profiles` ADD `view_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `profile_views` (
  `profile_id` text NOT NULL,
  `buyer_id` text NOT NULL,
  `viewed_at` text NOT NULL,
  PRIMARY KEY (`profile_id`, `buyer_id`)
);

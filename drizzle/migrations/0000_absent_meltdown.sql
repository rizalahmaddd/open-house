CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`recorded_by_user_id` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`title` text NOT NULL,
	`amount` integer NOT NULL,
	`expense_date` text NOT NULL,
	`receipt_photo_r2_key` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`lease_id` text NOT NULL,
	`property_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`public_token` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`due_date` text NOT NULL,
	`base_amount` integer NOT NULL,
	`additional_items_json` text DEFAULT '[]' NOT NULL,
	`discount_amount` integer DEFAULT 0 NOT NULL,
	`total_amount` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`payment_proof_r2_key` text,
	`paid_at` text,
	`verified_by_user_id` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lease_id`) REFERENCES `leases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_public_token_unique` ON `invoices` (`public_token`);--> statement-breakpoint
CREATE TABLE `leases` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`room_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`start_date` text NOT NULL,
	`next_due_date` text NOT NULL,
	`end_date` text,
	`base_rent_amount` integer NOT NULL,
	`recurring_addons_json` text DEFAULT '[]' NOT NULL,
	`deposit_amount` integer DEFAULT 0 NOT NULL,
	`deposit_status` text DEFAULT 'held' NOT NULL,
	`deposit_notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `maintenance_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`room_id` text,
	`reporter_name` text NOT NULL,
	`reporter_wa` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`photo_r2_key` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`expense_id` text,
	`created_at` text NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`assigned_property_ids` text DEFAULT '["*"]' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`plan_tier` text DEFAULT 'free' NOT NULL,
	`plan_expires_at` text,
	`max_rooms` integer DEFAULT 10 NOT NULL,
	`max_properties` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`area_malang` text NOT NULL,
	`address` text NOT NULL,
	`gender_type` text DEFAULT 'putra' NOT NULL,
	`rules_text` text DEFAULT '' NOT NULL,
	`bank_name` text DEFAULT 'BCA' NOT NULL,
	`bank_account_number` text DEFAULT '' NOT NULL,
	`bank_account_holder` text DEFAULT '' NOT NULL,
	`qris_image_url` text,
	`is_public_catalog_enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `properties_slug_unique` ON `properties` (`slug`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`room_number` text NOT NULL,
	`floor` integer DEFAULT 1 NOT NULL,
	`type_name` text DEFAULT 'Standar Kamar Mandi Dalam' NOT NULL,
	`facilities_json` text DEFAULT '["Kasur","Lemari","Meja Belajar","WiFi","KM Dalam"]' NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`price_monthly` integer DEFAULT 850000 NOT NULL,
	`price_quarterly` integer,
	`price_semester` integer,
	`price_yearly` integer,
	`photos_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`org_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`full_name` text NOT NULL,
	`phone_wa` text NOT NULL,
	`id_card_number` text DEFAULT '' NOT NULL,
	`id_card_photo_r2_key` text,
	`university_or_work` text DEFAULT '' NOT NULL,
	`origin_city` text DEFAULT '' NOT NULL,
	`emergency_contact_name` text DEFAULT '' NOT NULL,
	`emergency_contact_phone` text DEFAULT '' NOT NULL,
	`emergency_contact_relation` text DEFAULT 'Orang Tua' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
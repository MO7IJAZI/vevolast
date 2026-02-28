CREATE TABLE `calendar_events` (
	`id` varchar(36) NOT NULL,
	`source` varchar(50) NOT NULL DEFAULT 'manual',
	`event_type` varchar(50) NOT NULL DEFAULT 'manual',
	`title_ar` varchar(255) NOT NULL,
	`title_en` varchar(255),
	`date` varchar(20) NOT NULL,
	`time` varchar(20),
	`status` varchar(50) NOT NULL DEFAULT 'upcoming',
	`priority` varchar(50) NOT NULL DEFAULT 'medium',
	`client_id` varchar(36),
	`service_id` varchar(36),
	`employee_id` varchar(36),
	`sales_id` varchar(36),
	`notes` text,
	`reminder_days` varchar(50),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_payments` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`service_id` varchar(36),
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`payment_date` varchar(20) NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`payment_method` varchar(50),
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `client_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_services` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`main_package_id` varchar(36) NOT NULL,
	`sub_package_id` varchar(36),
	`service_name` varchar(255) NOT NULL,
	`service_name_en` varchar(255),
	`start_date` varchar(20) NOT NULL,
	`end_date` varchar(20),
	`status` varchar(50) NOT NULL DEFAULT 'not_started',
	`price` int,
	`currency` varchar(10),
	`sales_employee_id` varchar(36),
	`execution_employee_ids` json DEFAULT ('[]'),
	`notes` text,
	`completed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`service_id` varchar(36),
	`client_name` varchar(255) NOT NULL,
	`client_name_en` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`last_login` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`company` varchar(255),
	`country` varchar(100),
	`source` varchar(100),
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`sales_owner_id` varchar(36),
	`assigned_manager_id` varchar(36),
	`converted_from_lead_id` varchar(36),
	`lead_created_at` timestamp,
	`sales_owners` json DEFAULT ('[]'),
	`assigned_staff` json DEFAULT ('[]'),
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_salaries` (
	`id` varchar(36) NOT NULL,
	`employee_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`effective_date` varchar(20) NOT NULL,
	`type` varchar(50) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `employee_salaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255),
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`role_id` varchar(36) NOT NULL,
	`role_ar` varchar(50),
	`department` varchar(100),
	`job_title` varchar(100),
	`profile_image` text,
	`salary_type` varchar(50) NOT NULL DEFAULT 'monthly',
	`salary_amount` int,
	`rate` int,
	`rate_type` varchar(50),
	`salary_currency` varchar(10) NOT NULL DEFAULT 'USD',
	`salary_notes` text,
	`start_date` varchar(20) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` varchar(36) NOT NULL,
	`base` varchar(10) NOT NULL DEFAULT 'USD',
	`date` varchar(20) NOT NULL,
	`rates` text NOT NULL,
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `exchange_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`target` int NOT NULL,
	`current` int DEFAULT 0,
	`currency` varchar(10),
	`icon` varchar(50),
	`notes` text,
	`status` varchar(50) NOT NULL DEFAULT 'not_started',
	`responsible_person` varchar(255),
	`country` varchar(100),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`permissions` json DEFAULT ('[]'),
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`name` varchar(255),
	`name_en` varchar(255),
	`department` varchar(100),
	`employee_id` varchar(100),
	`used_at` datetime,
	`invited_by` varchar(36),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`invoice_number` varchar(50) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`service_id` varchar(36),
	`client_name` varchar(255) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`issue_date` varchar(20) NOT NULL,
	`due_date` varchar(20) NOT NULL,
	`paid_date` varchar(20),
	`payment_method` varchar(50),
	`items` json NOT NULL DEFAULT ('[]'),
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`company` varchar(255),
	`country` varchar(100),
	`source` varchar(100),
	`stage` varchar(50) NOT NULL DEFAULT 'new',
	`deal_value` int,
	`deal_currency` varchar(10),
	`notes` text,
	`negotiator_id` varchar(36),
	`was_confirmed_client` boolean DEFAULT false,
	`converted_from_client_id` varchar(36),
	`preserved_client_data` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `main_packages` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`icon` varchar(50),
	`description` text,
	`description_en` text,
	`order_num` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `main_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`title_ar` varchar(255) NOT NULL,
	`title_en` varchar(255),
	`message_ar` text NOT NULL,
	`message_en` text,
	`read` boolean NOT NULL DEFAULT false,
	`related_id` varchar(36),
	`related_type` varchar(50),
	`snoozed_until` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_resets_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `payroll_payments` (
	`id` varchar(36) NOT NULL,
	`employee_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`payment_date` varchar(20) NOT NULL,
	`period` varchar(50) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'paid',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payroll_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`name_ar` varchar(50) NOT NULL,
	`description` text,
	`permissions` json NOT NULL DEFAULT ('[]'),
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `service_deliverables` (
	`id` varchar(36) NOT NULL,
	`service_id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`label_ar` varchar(255) NOT NULL,
	`label_en` varchar(255) NOT NULL,
	`target` int NOT NULL,
	`completed` int NOT NULL DEFAULT 0,
	`icon` varchar(50),
	`is_boolean` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_deliverables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_reports` (
	`id` varchar(36) NOT NULL,
	`service_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`sid` varchar(255) NOT NULL,
	`sess` json NOT NULL,
	`expire` timestamp NOT NULL,
	CONSTRAINT `session_sid` PRIMARY KEY(`sid`)
);
--> statement-breakpoint
CREATE TABLE `sub_packages` (
	`id` varchar(36) NOT NULL,
	`main_package_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255) NOT NULL,
	`price` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`billing_type` varchar(50) NOT NULL,
	`description` text,
	`description_en` text,
	`duration` varchar(50),
	`duration_en` varchar(50),
	`deliverables` json DEFAULT ('[]'),
	`platforms` json DEFAULT ('[]'),
	`features` text,
	`features_en` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`order_num` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sub_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` varchar(36) NOT NULL DEFAULT 'current',
	`settings` json NOT NULL,
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` varchar(36) NOT NULL,
	`description` text NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`type` varchar(50) NOT NULL,
	`category` varchar(50) NOT NULL,
	`date` varchar(20) NOT NULL,
	`related_id` varchar(36),
	`related_type` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'completed',
	`notes` text,
	`client_id` varchar(36),
	`service_id` varchar(36),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role_id` varchar(36),
	`permissions` json DEFAULT ('[]'),
	`avatar` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`name_en` varchar(255),
	`department` varchar(100),
	`employee_id` varchar(100),
	`last_login` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `work_activity_logs` (
	`id` varchar(36) NOT NULL,
	`service_id` varchar(36) NOT NULL,
	`deliverable_id` varchar(36),
	`employee_id` varchar(36),
	`action` varchar(50) NOT NULL,
	`previous_value` text,
	`new_value` text,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `work_activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_sessions` (
	`id` varchar(36) NOT NULL,
	`employee_id` varchar(36) NOT NULL,
	`date` varchar(20) NOT NULL,
	`start_time` datetime,
	`end_time` datetime,
	`status` varchar(50) NOT NULL DEFAULT 'not_started',
	`segments` json DEFAULT ('[]'),
	`total_duration` int NOT NULL DEFAULT 0,
	`break_duration` int NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;
-- MySQL Migration Script
-- Run this file to create all tables in MySQL

CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` varchar(255) PRIMARY KEY,
  `source` varchar(50) DEFAULT 'manual',
  `event_type` varchar(50) DEFAULT 'manual',
  `title_ar` varchar(255) NOT NULL,
  `title_en` varchar(255),
  `date` varchar(20) NOT NULL,
  `time` varchar(20),
  `status` varchar(50) DEFAULT 'upcoming',
  `priority` varchar(50) DEFAULT 'medium',
  `client_id` varchar(255),
  `service_id` varchar(255),
  `employee_id` varchar(255),
  `sales_id` varchar(255),
  `notes` text,
  `reminder_days` varchar(20),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `client_payments` (
  `id` varchar(255) PRIMARY KEY,
  `client_id` varchar(255) NOT NULL,
  `service_id` varchar(255),
  `amount` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `payment_date` varchar(20) NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `payment_method` varchar(50),
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `client_services` (
  `id` varchar(255) PRIMARY KEY,
  `client_id` varchar(255) NOT NULL,
  `main_package_id` varchar(255) NOT NULL,
  `sub_package_id` varchar(255),
  `service_name` varchar(255) NOT NULL,
  `service_name_en` varchar(255),
  `start_date` varchar(20) NOT NULL,
  `end_date` varchar(20),
  `status` varchar(50) DEFAULT 'not_started',
  `price` int,
  `currency` varchar(10),
  `sales_employee_id` varchar(255),
  `execution_employee_ids` json DEFAULT (JSON_ARRAY()),
  `notes` text,
  `completed_at` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `client_users` (
  `id` varchar(255) PRIMARY KEY,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `client_id` varchar(255) NOT NULL,
  `client_name` varchar(255) NOT NULL,
  `client_name_en` varchar(255),
  `is_active` boolean DEFAULT true,
  `last_login` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `clients` (
  `id` varchar(255) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `email` varchar(255),
  `phone` varchar(50),
  `company` varchar(255),
  `country` varchar(100),
  `source` varchar(100),
  `status` varchar(50) DEFAULT 'active',
  `sales_owner_id` varchar(255),
  `assigned_manager_id` varchar(255),
  `converted_from_lead_id` varchar(255),
  `lead_created_at` timestamp NULL,
  `sales_owners` json DEFAULT (JSON_ARRAY()),
  `assigned_staff` json DEFAULT (JSON_ARRAY()),
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `employee_salaries` (
  `id` varchar(255) PRIMARY KEY,
  `employee_id` varchar(255) NOT NULL,
  `amount` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `effective_date` varchar(20) NOT NULL,
  `type` varchar(50) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `employees` (
  `id` varchar(255) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255),
  `email` varchar(255) NOT NULL UNIQUE,
  `phone` varchar(50),
  `role` varchar(50) NOT NULL,
  `role_ar` varchar(50),
  `department` varchar(100),
  `job_title` varchar(100),
  `profile_image` text,
  `salary_type` varchar(50) DEFAULT 'monthly',
  `salary_amount` int,
  `rate` int,
  `rate_type` varchar(50),
  `salary_currency` varchar(10) DEFAULT 'USD',
  `salary_notes` text,
  `start_date` varchar(20) NOT NULL,
  `is_active` boolean DEFAULT true,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `exchange_rates` (
  `id` varchar(255) PRIMARY KEY,
  `base` varchar(10) DEFAULT 'USD',
  `date` varchar(20) NOT NULL,
  `rates` text NOT NULL,
  `fetched_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `goals` (
  `id` varchar(255) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `target` int NOT NULL,
  `current` int DEFAULT 0,
  `currency` varchar(10),
  `icon` varchar(50),
  `notes` text,
  `status` varchar(50) DEFAULT 'not_started',
  `responsible_person` varchar(255),
  `country` varchar(100),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `invitations` (
  `id` varchar(255) PRIMARY KEY,
  `email` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'employee',
  `permissions` json DEFAULT (JSON_ARRAY()),
  `token` varchar(255) NOT NULL UNIQUE,
  `expires_at` timestamp NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `name` varchar(255),
  `name_en` varchar(255),
  `department` varchar(100),
  `employee_id` varchar(100),
  `used_at` timestamp NULL,
  `invited_by` varchar(255),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` varchar(255) PRIMARY KEY,
  `invoice_number` varchar(50) NOT NULL,
  `client_id` varchar(255) NOT NULL,
  `service_id` varchar(255),
  `client_name` varchar(255) NOT NULL,
  `amount` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `status` varchar(50) DEFAULT 'draft',
  `issue_date` varchar(20) NOT NULL,
  `due_date` varchar(20) NOT NULL,
  `paid_date` varchar(20),
  `items` json NOT NULL,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `leads` (
  `id` varchar(255) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `email` varchar(255),
  `phone` varchar(50),
  `company` varchar(255),
  `country` varchar(100),
  `source` varchar(100),
  `stage` varchar(50) DEFAULT 'new',
  `deal_value` int,
  `deal_currency` varchar(10),
  `notes` text,
  `negotiator_id` varchar(255),
  `was_confirmed_client` boolean DEFAULT false,
  `converted_from_client_id` varchar(255),
  `preserved_client_data` json,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `main_packages` (
  `id` varchar(255) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) NOT NULL,
  `icon` varchar(50),
  `description` text,
  `description_en` text,
  `order_num` int DEFAULT 0,
  `is_active` boolean DEFAULT true,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` varchar(255) PRIMARY KEY,
  `user_id` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title_ar` varchar(255) NOT NULL,
  `title_en` varchar(255),
  `message_ar` text NOT NULL,
  `message_en` text,
  `read` boolean DEFAULT false,
  `related_id` varchar(255),
  `related_type` varchar(50),
  `snoozed_until` timestamp,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` varchar(255) PRIMARY KEY,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL UNIQUE,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `payroll_payments` (
  `id` varchar(255) PRIMARY KEY,
  `employee_id` varchar(255) NOT NULL,
  `amount` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `payment_date` varchar(20) NOT NULL,
  `period` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'paid',
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `service_deliverables` (
  `id` varchar(255) PRIMARY KEY,
  `service_id` varchar(255) NOT NULL,
  `key` varchar(100) NOT NULL,
  `label_ar` varchar(255) NOT NULL,
  `label_en` varchar(255) NOT NULL,
  `target` int NOT NULL,
  `completed` int DEFAULT 0,
  `icon` varchar(50),
  `is_boolean` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `service_reports` (
  `id` varchar(255) PRIMARY KEY,
  `service_id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(255) NOT NULL PRIMARY KEY,
  `expires` datetime NOT NULL,
  `data` text
);

CREATE TABLE IF NOT EXISTS `sub_packages` (
  `id` varchar(255) PRIMARY KEY,
  `main_package_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) NOT NULL,
  `price` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `billing_type` varchar(50) NOT NULL,
  `description` text,
  `description_en` text,
  `duration` varchar(50),
  `duration_en` varchar(50),
  `deliverables` json DEFAULT (JSON_ARRAY()),
  `platforms` json DEFAULT (JSON_ARRAY()),
  `features` text,
  `features_en` text,
  `is_active` boolean DEFAULT true,
  `order_num` int DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` varchar(255) PRIMARY KEY DEFAULT 'current',
  `settings` json NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` varchar(255) PRIMARY KEY,
  `description` text NOT NULL,
  `amount` int NOT NULL,
  `currency` varchar(10) NOT NULL,
  `type` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL,
  `date` varchar(20) NOT NULL,
  `related_id` varchar(255),
  `related_type` varchar(50),
  `status` varchar(50) DEFAULT 'completed',
  `notes` text,
  `client_id` varchar(255),
  `service_id` varchar(255),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(255) PRIMARY KEY,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'employee',
  `permissions` json DEFAULT (JSON_ARRAY()),
  `avatar` text,
  `is_active` boolean DEFAULT true,
  `name_en` varchar(255),
  `department` varchar(100),
  `employee_id` varchar(100),
  `last_login` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `work_activity_logs` (
  `id` varchar(255) PRIMARY KEY,
  `service_id` varchar(255) NOT NULL,
  `deliverable_id` varchar(255),
  `employee_id` varchar(255),
  `action` varchar(50) NOT NULL,
  `previous_value` text,
  `new_value` text,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `work_sessions` (
  `id` varchar(255) PRIMARY KEY,
  `employee_id` varchar(255) NOT NULL,
  `date` varchar(20) NOT NULL,
  `start_time` timestamp NULL,
  `end_time` timestamp NULL,
  `status` varchar(50) DEFAULT 'not_started',
  `segments` json DEFAULT (JSON_ARRAY()),
  `total_duration` int DEFAULT 0,
  `break_duration` int DEFAULT 0,
  `notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

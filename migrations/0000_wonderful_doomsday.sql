CREATE TABLE "calendar_events" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"event_type" text DEFAULT 'manual' NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text,
	"date" text NOT NULL,
	"time" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"client_id" text,
	"service_id" text,
	"employee_id" text,
	"sales_id" text,
	"notes" text,
	"reminder_days" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_payments" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"service_id" text,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"payment_date" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_services" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"main_package_id" text NOT NULL,
	"sub_package_id" text,
	"service_name" text NOT NULL,
	"service_name_en" text,
	"start_date" text NOT NULL,
	"end_date" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"price" integer,
	"currency" text,
	"sales_employee_id" text,
	"execution_employee_ids" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_users" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"client_id" text NOT NULL,
	"client_name" text NOT NULL,
	"client_name_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"country" text,
	"source" text,
	"status" text DEFAULT 'active' NOT NULL,
	"sales_owner_id" text,
	"assigned_manager_id" text,
	"converted_from_lead_id" text,
	"lead_created_at" timestamp,
	"sales_owners" jsonb DEFAULT '[]'::jsonb,
	"assigned_staff" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_salaries" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"effective_date" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"email" text NOT NULL,
	"phone" text,
	"role" text NOT NULL,
	"role_ar" text,
	"department" text,
	"job_title" text,
	"profile_image" text,
	"salary_type" text DEFAULT 'monthly' NOT NULL,
	"salary_amount" integer,
	"rate" integer,
	"rate_type" text,
	"salary_currency" text DEFAULT 'USD' NOT NULL,
	"salary_notes" text,
	"start_date" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base" text DEFAULT 'USD' NOT NULL,
	"date" text NOT NULL,
	"rates" text NOT NULL,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"target" integer NOT NULL,
	"current" integer DEFAULT 0,
	"currency" text,
	"icon" text,
	"notes" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"responsible_person" text,
	"country" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"name" text,
	"name_en" text,
	"department" text,
	"employee_id" text,
	"used_at" timestamp,
	"invited_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"client_id" text NOT NULL,
	"client_name" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issue_date" text NOT NULL,
	"due_date" text NOT NULL,
	"paid_date" text,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"country" text,
	"source" text,
	"stage" text DEFAULT 'new' NOT NULL,
	"deal_value" integer,
	"deal_currency" text,
	"notes" text,
	"negotiator_id" text,
	"was_confirmed_client" boolean DEFAULT false,
	"converted_from_client_id" text,
	"preserved_client_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "main_packages" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"icon" text,
	"description" text,
	"description_en" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text,
	"message_ar" text NOT NULL,
	"message_en" text,
	"read" boolean DEFAULT false NOT NULL,
	"related_id" text,
	"related_type" text,
	"snoozed_until" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payroll_payments" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"payment_date" text NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_deliverables" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" text NOT NULL,
	"key" text NOT NULL,
	"label_ar" text NOT NULL,
	"label_en" text NOT NULL,
	"target" integer NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"icon" text,
	"is_boolean" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_reports" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_packages" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"main_package_id" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"price" integer NOT NULL,
	"currency" text NOT NULL,
	"billing_type" text NOT NULL,
	"description" text,
	"description_en" text,
	"duration" text,
	"duration_en" text,
	"deliverables" jsonb DEFAULT '[]'::jsonb,
	"platforms" jsonb DEFAULT '[]'::jsonb,
	"features" text,
	"features_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT 'current' NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"date" text NOT NULL,
	"related_id" text,
	"related_type" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"client_id" text,
	"service_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"avatar" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"name_en" text,
	"department" text,
	"employee_id" text,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "work_activity_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" text NOT NULL,
	"deliverable_id" text,
	"employee_id" text,
	"action" text NOT NULL,
	"previous_value" text,
	"new_value" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_sessions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" text NOT NULL,
	"date" text NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"status" text DEFAULT 'not_started' NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_duration" integer DEFAULT 0 NOT NULL,
	"break_duration" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

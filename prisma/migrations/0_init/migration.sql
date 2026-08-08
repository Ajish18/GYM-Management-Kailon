-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "supabase_vault";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_SUPER_ADMIN', 'GYM_OWNER', 'RECEPTIONIST', 'TRAINER', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GymStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "UnitPreference" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED', 'UPGRADED');

-- CreateEnum
CREATE TYPE "CheckMethod" AS ENUM ('MANUAL', 'SELF', 'QR', 'AUTO');

-- CreateEnum
CREATE TYPE "VacationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkoutPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('COMPLETED', 'SKIPPED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "MeasurementSource" AS ENUM ('TRAINER', 'SELF');

-- CreateEnum
CREATE TYPE "PhotoPose" AS ENUM ('FRONT', 'SIDE', 'BACK');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'PARTIALLY_PAID', 'UNPAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXPIRY', 'FEE_DUE', 'ATTENDANCE_REMINDER', 'WORKOUT_REMINDER', 'DIET_REMINDER', 'BIRTHDAY', 'ANNOUNCEMENT', 'SECURITY', 'PAYMENT_SUCCESS', 'TRAINER_MESSAGE', 'STREAK_MILESTONE', 'GOAL_ACHIEVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'PDF', 'WORKOUT_NOTE', 'DIET_NOTE');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'XLSX', 'PDF');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "name" TEXT NOT NULL,
    "email" CITEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "last_login_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "device_label" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "invited_by" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" DECIMAL(12,2) NOT NULL,
    "price_yearly" DECIMAL(12,2) NOT NULL,
    "max_members" INTEGER,
    "max_trainers" INTEGER,
    "feature_flags" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_subscriptions" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" TEXT NOT NULL,
    "platform_admin_id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "actions_log" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gyms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gym_code" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "logo_url" TEXT,
    "brand_color" TEXT,
    "address" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "GymStatus" NOT NULL DEFAULT 'TRIAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_settings" (
    "gym_id" TEXT NOT NULL,
    "attendance_grace_minutes" INTEGER NOT NULL DEFAULT 15,
    "max_session_hours" INTEGER NOT NULL DEFAULT 4,
    "self_checkin_enabled" BOOLEAN NOT NULL DEFAULT true,
    "streak_requires_checkin" BOOLEAN NOT NULL DEFAULT true,
    "streak_requires_workout_log" BOOLEAN NOT NULL DEFAULT false,
    "streak_requires_checkout" BOOLEAN NOT NULL DEFAULT false,
    "streak_freezes_per_month" INTEGER NOT NULL DEFAULT 1,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "invoice_next_seq" INTEGER NOT NULL DEFAULT 1,
    "default_tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "payment_due_in_days" INTEGER NOT NULL DEFAULT 7,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_settings_pkey" PRIMARY KEY ("gym_id")
);

-- CreateTable
CREATE TABLE "trainer_profiles" (
    "user_id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "specialization" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "years_experience" INTEGER,
    "max_member_capacity" INTEGER,

    CONSTRAINT "trainer_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "user_id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "dob" DATE,
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "health_notes" TEXT,
    "assigned_trainer_id" TEXT,
    "join_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaderboard_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "unit_preference" "UnitPreference" NOT NULL DEFAULT 'METRIC',

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "includes_trainer" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_memberships" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "price_paid" DECIMAL(12,2) NOT NULL,
    "previous_membership_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_freezes" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "check_in_at" TIMESTAMP(3) NOT NULL,
    "check_in_method" "CheckMethod" NOT NULL DEFAULT 'MANUAL',
    "check_in_by_id" TEXT,
    "check_out_at" TIMESTAMP(3),
    "check_out_method" "CheckMethod",
    "auto_checked_out" BOOLEAN NOT NULL DEFAULT false,
    "session_duration_minutes" INTEGER,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_streaks" (
    "member_id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "current_month_streak" INTEGER NOT NULL DEFAULT 0,
    "last_credit_date" DATE,
    "streak_freezes_remaining" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_streaks_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "streak_freeze_usages" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "used_on_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streak_freeze_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_mode_periods" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "status" "VacationStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacation_mode_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "criteria" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_badges" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT,
    "name" TEXT NOT NULL,
    "muscle_group" TEXT,
    "equipment" TEXT,
    "instructions" TEXT,
    "media_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_templates" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_template_days" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "day_order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "workout_template_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_template_exercises" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "template_day_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "target_sets" INTEGER NOT NULL,
    "target_reps" INTEGER NOT NULL,
    "target_weight" DECIMAL(6,2),
    "rest_seconds" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "workout_template_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "template_id" TEXT,
    "assigned_by_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "status" "WorkoutPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "workout_plan_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "status" "LogStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_log_sets" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "workout_log_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "actual_reps" INTEGER,
    "actual_weight" DECIMAL(6,2),
    "is_pr" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workout_log_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "best_weight" DECIMAL(6,2) NOT NULL,
    "best_reps_at_weight" INTEGER NOT NULL,
    "achieved_at" DATE NOT NULL,
    "source_log_set_id" TEXT,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_templates" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "diet_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_template_meals" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "meal_name" TEXT NOT NULL,
    "time_slot" TEXT,
    "calories" INTEGER,
    "protein_g" DECIMAL(6,2),
    "carbs_g" DECIMAL(6,2),
    "fat_g" DECIMAL(6,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "diet_template_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_plans" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "template_id" TEXT,
    "assigned_by_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "status" "WorkoutPlanStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "diet_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_plan_meals" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "diet_plan_id" TEXT NOT NULL,
    "meal_name" TEXT NOT NULL,
    "time_slot" TEXT,
    "calories" INTEGER,
    "protein_g" DECIMAL(6,2),
    "carbs_g" DECIMAL(6,2),
    "fat_g" DECIMAL(6,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "diet_plan_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_intake_logs" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "log_date" DATE NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_intake_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplement_recommendations" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "diet_plan_id" TEXT,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "timing_note" TEXT,
    "recommended_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplement_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_notes" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "diet_plan_id" TEXT NOT NULL,
    "note_date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "diet_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "measured_at" DATE NOT NULL,
    "recorded_by_id" TEXT,
    "weight_kg" DECIMAL(5,2),
    "height_cm" DECIMAL(5,2),
    "bmi" DECIMAL(4,1),
    "body_fat_percent" DECIMAL(4,1),
    "muscle_percent" DECIMAL(4,1),
    "chest_cm" DECIMAL(5,2),
    "waist_cm" DECIMAL(5,2),
    "shoulder_cm" DECIMAL(5,2),
    "arms_cm" DECIMAL(5,2),
    "legs_cm" DECIMAL(5,2),
    "source" "MeasurementSource" NOT NULL DEFAULT 'TRAINER',

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_photos" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "taken_at" DATE NOT NULL,
    "pose" "PhotoPose" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "related_membership_id" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_reason" TEXT,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE,
    "pdf_storage_path" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference_note" TEXT,
    "collected_by_id" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_reversal" BOOLEAN NOT NULL DEFAULT false,
    "reversed_payment_id" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "vendor_note" TEXT,
    "receipt_storage_path" TEXT,
    "recorded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "attachment_storage_path" TEXT,
    "related_workout_plan_id" TEXT,
    "related_diet_plan_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "file_storage_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "gym_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "before_state" JSONB,
    "after_state" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "users_gym_id_role_idx" ON "users"("gym_id", "role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_gym_id_email_key" ON "users"("gym_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_gym_id_phone_key" ON "users"("gym_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_jti_key" ON "user_sessions"("jti");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_hash_key" ON "invites"("token_hash");

-- CreateIndex
CREATE INDEX "invites_gym_id_email_idx" ON "invites"("gym_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_identifier_created_at_idx" ON "login_attempts"("identifier", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_address_created_at_idx" ON "login_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gym_subscriptions_gym_id_key" ON "gym_subscriptions"("gym_id");

-- CreateIndex
CREATE INDEX "gym_subscriptions_status_idx" ON "gym_subscriptions"("status");

-- CreateIndex
CREATE INDEX "gym_subscriptions_current_period_end_idx" ON "gym_subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "impersonation_sessions_gym_id_idx" ON "impersonation_sessions"("gym_id");

-- CreateIndex
CREATE INDEX "impersonation_sessions_platform_admin_id_idx" ON "impersonation_sessions"("platform_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "gyms_slug_key" ON "gyms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "gyms_gym_code_key" ON "gyms"("gym_code");

-- CreateIndex
CREATE UNIQUE INDEX "gyms_owner_user_id_key" ON "gyms"("owner_user_id");

-- CreateIndex
CREATE INDEX "branches_gym_id_idx" ON "branches"("gym_id");

-- CreateIndex
CREATE INDEX "trainer_profiles_gym_id_idx" ON "trainer_profiles"("gym_id");

-- CreateIndex
CREATE INDEX "member_profiles_gym_id_idx" ON "member_profiles"("gym_id");

-- CreateIndex
CREATE INDEX "member_profiles_assigned_trainer_id_idx" ON "member_profiles"("assigned_trainer_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_gym_id_name_key" ON "membership_plans"("gym_id", "name");

-- CreateIndex
CREATE INDEX "member_memberships_gym_id_member_id_idx" ON "member_memberships"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "member_memberships_gym_id_status_idx" ON "member_memberships"("gym_id", "status");

-- CreateIndex
CREATE INDEX "member_memberships_end_date_idx" ON "member_memberships"("end_date");

-- CreateIndex
CREATE INDEX "membership_freezes_gym_id_idx" ON "membership_freezes"("gym_id");

-- CreateIndex
CREATE INDEX "attendance_records_gym_id_member_id_check_in_at_idx" ON "attendance_records"("gym_id", "member_id", "check_in_at");

-- CreateIndex
CREATE INDEX "member_streaks_gym_id_idx" ON "member_streaks"("gym_id");

-- CreateIndex
CREATE UNIQUE INDEX "streak_freeze_usages_member_id_used_on_date_key" ON "streak_freeze_usages"("member_id", "used_on_date");

-- CreateIndex
CREATE INDEX "vacation_mode_periods_gym_id_member_id_idx" ON "vacation_mode_periods"("gym_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_badges_member_id_badge_id_key" ON "member_badges"("member_id", "badge_id");

-- CreateIndex
CREATE INDEX "exercises_gym_id_idx" ON "exercises"("gym_id");

-- CreateIndex
CREATE INDEX "workout_templates_gym_id_idx" ON "workout_templates"("gym_id");

-- CreateIndex
CREATE INDEX "workout_template_days_template_id_idx" ON "workout_template_days"("template_id");

-- CreateIndex
CREATE INDEX "workout_template_exercises_template_day_id_idx" ON "workout_template_exercises"("template_day_id");

-- CreateIndex
CREATE INDEX "workout_plans_gym_id_member_id_idx" ON "workout_plans"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "workout_plans_gym_id_member_id_status_idx" ON "workout_plans"("gym_id", "member_id", "status");

-- CreateIndex
CREATE INDEX "workout_logs_gym_id_member_id_log_date_idx" ON "workout_logs"("gym_id", "member_id", "log_date");

-- CreateIndex
CREATE INDEX "workout_log_sets_workout_log_id_idx" ON "workout_log_sets"("workout_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_records_member_id_exercise_id_key" ON "personal_records"("member_id", "exercise_id");

-- CreateIndex
CREATE INDEX "diet_templates_gym_id_idx" ON "diet_templates"("gym_id");

-- CreateIndex
CREATE INDEX "diet_template_meals_template_id_idx" ON "diet_template_meals"("template_id");

-- CreateIndex
CREATE INDEX "diet_plans_gym_id_member_id_idx" ON "diet_plans"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "diet_plan_meals_diet_plan_id_idx" ON "diet_plan_meals"("diet_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "water_intake_logs_member_id_log_date_key" ON "water_intake_logs"("member_id", "log_date");

-- CreateIndex
CREATE INDEX "supplement_recommendations_gym_id_member_id_idx" ON "supplement_recommendations"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "diet_notes_gym_id_member_id_idx" ON "diet_notes"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "body_measurements_gym_id_member_id_measured_at_idx" ON "body_measurements"("gym_id", "member_id", "measured_at");

-- CreateIndex
CREATE INDEX "progress_photos_gym_id_member_id_taken_at_idx" ON "progress_photos"("gym_id", "member_id", "taken_at");

-- CreateIndex
CREATE INDEX "invoices_gym_id_member_id_idx" ON "invoices"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "invoices_gym_id_status_idx" ON "invoices"("gym_id", "status");

-- CreateIndex
CREATE INDEX "invoices_gym_id_due_date_idx" ON "invoices"("gym_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_gym_id_invoice_number_key" ON "invoices"("gym_id", "invoice_number");

-- CreateIndex
CREATE INDEX "payments_gym_id_member_id_idx" ON "payments"("gym_id", "member_id");

-- CreateIndex
CREATE INDEX "payments_gym_id_paid_at_idx" ON "payments"("gym_id", "paid_at");

-- CreateIndex
CREATE INDEX "expenses_gym_id_expense_date_idx" ON "expenses"("gym_id", "expense_date");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_gym_id_type_related_entity_id_created_at_idx" ON "notifications"("gym_id", "type", "related_entity_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_gym_id_trainer_id_member_id_key" ON "conversations"("gym_id", "trainer_id", "member_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "report_exports_gym_id_status_idx" ON "report_exports"("gym_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_gym_id_created_at_idx" ON "audit_logs"("gym_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_subscriptions" ADD CONSTRAINT "gym_subscriptions_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_subscriptions" ADD CONSTRAINT "gym_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gyms" ADD CONSTRAINT "gyms_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_settings" ADD CONSTRAINT "gym_settings_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_profiles" ADD CONSTRAINT "trainer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_assigned_trainer_id_fkey" FOREIGN KEY ("assigned_trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_memberships" ADD CONSTRAINT "member_memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_memberships" ADD CONSTRAINT "member_memberships_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "member_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_check_in_by_id_fkey" FOREIGN KEY ("check_in_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_mode_periods" ADD CONSTRAINT "vacation_mode_periods_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_badges" ADD CONSTRAINT "member_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_template_days" ADD CONSTRAINT "workout_template_days_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workout_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_template_day_id_fkey" FOREIGN KEY ("template_day_id") REFERENCES "workout_template_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workout_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_workout_plan_id_fkey" FOREIGN KEY ("workout_plan_id") REFERENCES "workout_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_log_sets" ADD CONSTRAINT "workout_log_sets_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "workout_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_log_sets" ADD CONSTRAINT "workout_log_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_source_log_set_id_fkey" FOREIGN KEY ("source_log_set_id") REFERENCES "workout_log_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_templates" ADD CONSTRAINT "diet_templates_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_templates" ADD CONSTRAINT "diet_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_template_meals" ADD CONSTRAINT "diet_template_meals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "diet_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "diet_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plan_meals" ADD CONSTRAINT "diet_plan_meals_diet_plan_id_fkey" FOREIGN KEY ("diet_plan_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_notes" ADD CONSTRAINT "diet_notes_diet_plan_id_fkey" FOREIGN KEY ("diet_plan_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_notes" ADD CONSTRAINT "diet_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_related_membership_id_fkey" FOREIGN KEY ("related_membership_id") REFERENCES "member_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_id_fkey" FOREIGN KEY ("collected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"current_stage" integer DEFAULT 1 NOT NULL,
	"lesson_plan" jsonb,
	"failed_questions" jsonb,
	"personality_tone" text DEFAULT 'Hype Man',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

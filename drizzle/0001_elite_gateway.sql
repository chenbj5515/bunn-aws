ALTER TABLE "memo_card" ADD COLUMN "end_time_ms" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "is_music" boolean DEFAULT false NOT NULL;
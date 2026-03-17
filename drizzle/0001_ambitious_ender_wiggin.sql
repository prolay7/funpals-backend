CREATE TABLE "private_meetings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "private_meetings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invited_user_id" integer NOT NULL,
	"stream_call_id" text,
	"is_cuss_word_on" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE users 
ALTER COLUMN location TYPE geography(Point,4326)
USING ST_SetSRID(location::geometry, 4326)::geography;
ALTER TABLE "likedUsers" ALTER COLUMN "id" SET CACHE 1;--> statement-breakpoint
ALTER TABLE "private_meetings" ADD CONSTRAINT "private_meetings_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private_meetings" ADD CONSTRAINT "private_meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
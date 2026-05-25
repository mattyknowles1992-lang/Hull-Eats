DO $$
BEGIN
  CREATE TYPE "contact_message_origin" AS ENUM ('merchant_hub', 'customer_web', 'customer_app_via_web');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "contact_message_status" AS ENUM ('new', 'in_progress', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" TEXT NOT NULL,
  "origin" "contact_message_origin" NOT NULL,
  "status" "contact_message_status" NOT NULL DEFAULT 'new',
  "sender_name" TEXT NOT NULL,
  "sender_email" TEXT NOT NULL,
  "sender_phone" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "order_number" TEXT,
  "source_path" TEXT,
  "hub_id" UUID,
  "customer_profile_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");
CREATE INDEX IF NOT EXISTS "contact_messages_origin_created_at_idx" ON "contact_messages"("origin", "created_at");
CREATE INDEX IF NOT EXISTS "contact_messages_hub_id_idx" ON "contact_messages"("hub_id");
CREATE INDEX IF NOT EXISTS "contact_messages_customer_profile_id_idx" ON "contact_messages"("customer_profile_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_messages_hub_id_fkey'
  ) THEN
    ALTER TABLE "contact_messages"
      ADD CONSTRAINT "contact_messages_hub_id_fkey"
      FOREIGN KEY ("hub_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_messages_customer_profile_id_fkey'
  ) THEN
    ALTER TABLE "contact_messages"
      ADD CONSTRAINT "contact_messages_customer_profile_id_fkey"
      FOREIGN KEY ("customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

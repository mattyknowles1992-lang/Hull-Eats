-- Platform audit trail and modular business package entitlements

CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "scope" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "business_id" UUID,
  "actor_user_id" TEXT,
  "actor_email" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_audit_logs_business_id_created_at_idx"
  ON "platform_audit_logs"("business_id", "created_at");

CREATE INDEX IF NOT EXISTS "platform_audit_logs_scope_action_created_at_idx"
  ON "platform_audit_logs"("scope", "action", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_audit_logs_business_id_fkey') THEN
    ALTER TABLE "platform_audit_logs"
      ADD CONSTRAINT "platform_audit_logs_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "business_package_entitlements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_id" UUID NOT NULL,
  "package_key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "enabled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "business_package_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_package_entitlements_business_id_package_key_key"
  ON "business_package_entitlements"("business_id", "package_key");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_package_entitlements_business_id_fkey') THEN
    ALTER TABLE "business_package_entitlements"
      ADD CONSTRAINT "business_package_entitlements_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

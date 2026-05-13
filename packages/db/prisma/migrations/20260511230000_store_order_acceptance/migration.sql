-- Hub order acceptance: auto-accept with quoted prep cap vs manual 120s window (enforced in API).

ALTER TABLE "stores"
ADD COLUMN IF NOT EXISTS "auto_accept_orders" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "stores"
ADD COLUMN IF NOT EXISTS "auto_accept_max_prep_minutes" INTEGER NOT NULL DEFAULT 60;

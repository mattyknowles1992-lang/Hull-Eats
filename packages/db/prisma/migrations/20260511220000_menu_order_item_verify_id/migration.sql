-- Age-restricted / ID-at-door flag per menu line and snapshot on order lines.

ALTER TABLE "menu_items"
ADD COLUMN IF NOT EXISTS "requires_id_verification" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "order_items"
ADD COLUMN IF NOT EXISTS "requires_id_verification" BOOLEAN NOT NULL DEFAULT false;

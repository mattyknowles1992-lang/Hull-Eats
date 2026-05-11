-- Links Hull Eats courier profiles to a hub store so the courier app only sees assigned takeaways.

CREATE TABLE "store_courier_assignments" (
    "id" TEXT NOT NULL,
    "store_id" UUID NOT NULL,
    "courier_profile_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_courier_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_courier_assignments_store_id_courier_profile_id_key" ON "store_courier_assignments"("store_id", "courier_profile_id");

CREATE INDEX "store_courier_assignments_courier_profile_id_idx" ON "store_courier_assignments"("courier_profile_id");

ALTER TABLE "store_courier_assignments" ADD CONSTRAINT "store_courier_assignments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_courier_assignments" ADD CONSTRAINT "store_courier_assignments_courier_profile_id_fkey" FOREIGN KEY ("courier_profile_id") REFERENCES "courier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

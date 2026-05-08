CREATE TABLE IF NOT EXISTS "CourierAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courierProfileId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "status" "hub_user_status" NOT NULL DEFAULT 'active',
  "rating" DECIMAL(3, 2) NOT NULL DEFAULT 5.0,
  "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
  "weeklyEarnings" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "rewardPoints" INTEGER NOT NULL DEFAULT 0,
  "nextPayoutDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CourierAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CourierAccount_userId_key" ON "CourierAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "CourierAccount_courierProfileId_key" ON "CourierAccount"("courierProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "CourierAccount_username_key" ON "CourierAccount"("username");

ALTER TABLE "CourierAccount"
  ADD CONSTRAINT "CourierAccount_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourierAccount"
  ADD CONSTRAINT "CourierAccount_courierProfileId_fkey"
  FOREIGN KEY ("courierProfileId") REFERENCES "CourierProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

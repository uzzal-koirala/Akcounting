-- AlterTable
ALTER TABLE `User` DROP COLUMN `fiscalYearStartMonth`,
    DROP COLUMN `fiscalYearEndMonth`,
    ADD COLUMN `businessCycleStartDay` INTEGER NOT NULL DEFAULT 1;

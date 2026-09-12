-- AlterTable
ALTER TABLE `ReferralReward` ADD COLUMN `paidOut` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paidOutAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `AffiliateSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `rewardAmount` INTEGER NOT NULL DEFAULT 500,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `AffiliateSettings` ADD COLUMN `minWithdrawal` INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE `AffiliateWithdrawal` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'Cash',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `bankName` VARCHAR(191) NOT NULL DEFAULT '',
    `accountName` VARCHAR(191) NOT NULL DEFAULT '',
    `accountNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `note` TEXT NOT NULL DEFAULT '',
    `adminNote` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,

    INDEX `AffiliateWithdrawal_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `emailVerifyToken` VARCHAR(191) NULL,
    ADD COLUMN `emailVerifyExpiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_emailVerifyToken_key` ON `user`(`emailVerifyToken`);

-- Backfill: existing accounts predate this requirement and should not be locked out of the
-- dashboard on their next login — only new signups from here on must verify their email.
UPDATE `user` SET `emailVerifiedAt` = NOW() WHERE `emailVerifiedAt` IS NULL;

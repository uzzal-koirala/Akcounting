-- AlterTable
ALTER TABLE `user` ADD COLUMN `passwordSetToken` VARCHAR(191) NULL,
    ADD COLUMN `passwordSetExpiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_passwordSetToken_key` ON `user`(`passwordSetToken`);

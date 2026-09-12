-- AlterTable
ALTER TABLE `user` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    ADD COLUMN `suspendReason` TEXT NOT NULL DEFAULT '';

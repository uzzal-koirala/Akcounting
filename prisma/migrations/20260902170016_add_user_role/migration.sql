-- AlterTable
ALTER TABLE `product` MODIFY `description` TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'user';

-- AlterTable
ALTER TABLE `invoice` ADD COLUMN `accentColor` VARCHAR(191) NOT NULL DEFAULT '#dc2626',
    MODIFY `template` VARCHAR(191) NOT NULL DEFAULT 'bold';

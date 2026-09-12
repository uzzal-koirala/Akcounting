-- CreateTable
CREATE TABLE `Due` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL DEFAULT '',
    `totalAmount` INTEGER NOT NULL,
    `paidAmount` INTEGER NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NULL,
    `notes` TEXT NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Due_userId_idx`(`userId`),
    INDEX `Due_contactId_idx`(`contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DuePayment` (
    `id` VARCHAR(191) NOT NULL,
    `dueId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `note` VARCHAR(191) NOT NULL DEFAULT '',
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DuePayment_dueId_idx`(`dueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Due` ADD CONSTRAINT `Due_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Due` ADD CONSTRAINT `Due_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DuePayment` ADD CONSTRAINT `DuePayment_dueId_fkey` FOREIGN KEY (`dueId`) REFERENCES `Due`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

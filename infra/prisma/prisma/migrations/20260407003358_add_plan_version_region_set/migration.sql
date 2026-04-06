-- AlterTable
ALTER TABLE `PlanVersion` ADD COLUMN `regionSetId` VARCHAR(191) NULL;

-- Backfill existing versions from their parent Plan
UPDATE `PlanVersion` pv
INNER JOIN `Plan` p ON p.`id` = pv.`planId`
SET pv.`regionSetId` = p.`regionSetId`
WHERE pv.`regionSetId` IS NULL;

ALTER TABLE `PlanVersion` MODIFY `regionSetId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `PlanVersion_regionSetId_idx` ON `PlanVersion`(`regionSetId`);

-- AddForeignKey
ALTER TABLE `PlanVersion` ADD CONSTRAINT `PlanVersion_regionSetId_fkey` FOREIGN KEY (`regionSetId`) REFERENCES `RegionSet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

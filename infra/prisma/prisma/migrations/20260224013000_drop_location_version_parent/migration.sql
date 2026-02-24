ALTER TABLE `LocationVersion`
  DROP FOREIGN KEY `LocationVersion_parentVersionId_fkey`;

DROP INDEX `LocationVersion_parentVersionId_idx` ON `LocationVersion`;

ALTER TABLE `LocationVersion`
  DROP COLUMN `parentVersionId`;

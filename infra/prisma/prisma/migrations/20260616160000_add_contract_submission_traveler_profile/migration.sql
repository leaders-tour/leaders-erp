-- AlterTable
ALTER TABLE `ContractSubmission`
  ADD COLUMN `travelerGender` VARCHAR(191) NULL AFTER `receivedStatus`,
  ADD COLUMN `travelerBirthCode` VARCHAR(191) NULL AFTER `travelerGender`,
  ADD COLUMN `travelerNote` TEXT NULL AFTER `travelerBirthCode`;

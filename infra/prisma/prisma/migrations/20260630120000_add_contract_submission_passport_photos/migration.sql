-- ContractSubmission: mirror passport photos from Google Form uploads to S3
ALTER TABLE `ContractSubmission`
  ADD COLUMN `passportPhotoUrls` JSON NOT NULL DEFAULT ('[]'),
  ADD COLUMN `passportPhotoSourceDigest` VARCHAR(191) NULL;

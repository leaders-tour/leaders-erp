-- AlterEnum (MySQL): CatalogPlace에 식당 유형 추가
ALTER TABLE `CatalogPlace` MODIFY `placeType` ENUM('LODGING', 'RESTAURANT', 'EXPERIENCE', 'MEETING', 'GATE', 'AREA') NOT NULL;

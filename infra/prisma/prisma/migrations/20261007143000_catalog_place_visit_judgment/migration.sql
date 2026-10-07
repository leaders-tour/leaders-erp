-- Catalog place visit-judgment rules (T01-03). Existing rows stay unset.

ALTER TABLE `CatalogPlace`
  ADD COLUMN `visitJudgmentType` ENUM('PASS', 'STAY') NULL,
  ADD COLUMN `visitMinStayMinutes` INTEGER NULL;

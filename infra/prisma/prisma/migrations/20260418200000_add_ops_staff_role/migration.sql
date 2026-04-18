-- AlterTable: Employee.role enum에 OPS_STAFF 추가
ALTER TABLE `Employee`
  MODIFY COLUMN `role` ENUM('ADMIN', 'STAFF', 'OPS_STAFF') NOT NULL DEFAULT 'STAFF';

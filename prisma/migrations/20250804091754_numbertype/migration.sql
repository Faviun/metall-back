/*
  Warnings:

  - The `price1` column on the `Parser` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `price2` column on the `Parser` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `price3` column on the `Parser` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Parser" DROP COLUMN "price1",
ADD COLUMN     "price1" DOUBLE PRECISION,
DROP COLUMN "price2",
ADD COLUMN     "price2" DOUBLE PRECISION,
DROP COLUMN "price3",
ADD COLUMN     "price3" DOUBLE PRECISION;

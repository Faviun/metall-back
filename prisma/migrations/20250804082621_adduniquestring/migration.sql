/*
  Warnings:

  - A unique constraint covering the columns `[uniqueString]` on the table `Parser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uniqueString` to the `Parser` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Parser_link_key";

-- AlterTable
ALTER TABLE "Parser" ADD COLUMN     "uniqueString" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Parser_uniqueString_key" ON "Parser"("uniqueString");

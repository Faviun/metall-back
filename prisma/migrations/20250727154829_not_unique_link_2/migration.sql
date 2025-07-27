/*
  Warnings:

  - A unique constraint covering the columns `[link]` on the table `Parser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Parser_link_key" ON "Parser"("link");

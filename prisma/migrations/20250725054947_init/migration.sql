/*
  Warnings:

  - You are about to drop the `MetalProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PriceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockMovement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Supplier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Warehouse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MetalProduct" DROP CONSTRAINT "MetalProduct_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "MetalProduct" DROP CONSTRAINT "MetalProduct_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "PriceHistory" DROP CONSTRAINT "PriceHistory_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_fromWarehouseId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_productId_fkey";

-- DropForeignKey
ALTER TABLE "StockMovement" DROP CONSTRAINT "StockMovement_toWarehouseId_fkey";

-- DropTable
DROP TABLE "MetalProduct";

-- DropTable
DROP TABLE "PriceHistory";

-- DropTable
DROP TABLE "ProductImage";

-- DropTable
DROP TABLE "StockMovement";

-- DropTable
DROP TABLE "Supplier";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Warehouse";

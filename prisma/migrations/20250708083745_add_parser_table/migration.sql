-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parser" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "size" TEXT,
    "mark" TEXT,
    "length" TEXT,
    "location" TEXT,
    "price1" TEXT,
    "price2" TEXT,
    "image" TEXT,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

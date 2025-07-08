import { Injectable } from '@nestjs/common';
import { PrismaClient, Parser as ProductEntity } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProductService {
  async saveMany(products: ProductEntity[]) {
    for (const parser of products) {
      try {
        if (!parser.link) return;
        await prisma.parser.upsert({
          where: { link: parser.link }, 
          update: parser,
          create: parser,
        });
      } catch (e) {
        console.error(`Ошибка при сохранении товара ${parser.name}`, e);
      }
    }
  }
}
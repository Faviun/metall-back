import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Product } from 'src/types/product.type';

@Injectable()
export class SaveProductsService {
  private readonly logger = new Logger(SaveProductsService.name);
  private readonly BATCH_SIZE = 100;

  constructor(private readonly prisma: PrismaService) {}

  async saveMany(products: Product[]) {
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < products.length; i += this.BATCH_SIZE) {
      const batch = products.slice(i, i + this.BATCH_SIZE);
      this.logger.log(
        `🚀 Обработка партии с ${i} по ${i + batch.length - 1} (всего: ${batch.length})`,
      );

      for (const product of batch) {
        try {
          const result = await this.prisma.parser.upsert({
            where: { uniqueString: product.uniqueString },
            update: {
              provider: product.provider,
              category: product.category,
              name: product.name,
              size: product.size,
              mark: product.mark,
              length: product.length,
              weight: product.weight,
              location: product.location,
              price1: product.price1,
              units1: product.units1,
              price2: product.price2,
              units2: product.units2,
              price3: product.price3,
              units3: product.units3,
              image: product.image,
              available: product.available,
              link: product.link,
              uniqueString: product.uniqueString,
              description: product.description,
            },
            create: product,
          });

          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            createdCount++;
          } else {
            updatedCount++;
          }
        } catch (error) {
          failedCount++;
          this.logger.warn(
            `⛔ Ошибка в товаре: ${product.name} (${product.link}) → ${error.message}`,
          );
          if ((error as any).meta) {
            this.logger.warn(`↪️ Prisma Meta: ${(error as any).meta.target}`);
          }
        }
      }
    }

    this.logger.log(`🎉 Всего товаров обработано: ${products.length}`);
    this.logger.log(`✅ Создано: ${createdCount}`);
    this.logger.log(`🔁 Обновлено: ${updatedCount}`);
    this.logger.warn(`❌ Не удалось сохранить: ${failedCount}`);
  }
}

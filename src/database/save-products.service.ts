import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Product } from 'src/types/product.type';

@Injectable()
export class SaveProductsService {
  private readonly logger = new Logger(SaveProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly BATCH_SIZE = 100;

  async saveMany(products: Product[]) {
    const validProducts = products.filter(p => p.link);

    for (let i = 0; i < validProducts.length; i += this.BATCH_SIZE) {
      const batch = validProducts.slice(i, i + this.BATCH_SIZE);

      try {
        await this.prisma.$transaction(
          batch.map(product =>
            this.prisma.parser.upsert({
              where: { link: product.link || ''},
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
                price2: product.price2,
                price3: product.price3,
                units1: product.units1,
                units2: product.units2,
                units3: product.units3,
                image: product.image,
                available: product.available,
              },
              create: product,
            }),
          ),
        );
        this.logger.log(`✅ Сохранено товаров: ${i + batch.length} / ${validProducts.length}`);
      } catch (error) {
        this.logger.error(`❌ Ошибка при сохранении партии с ${i} по ${i + batch.length}: ${error.message}`);
      }
    }

    this.logger.log(`🎉 Всего успешно обработано: ${validProducts.length} товаров`);
  }
}

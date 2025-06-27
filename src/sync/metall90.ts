import { PrismaClient } from '@prisma/client';
import { parseMetall90 } from '../parser/metall90';

const prisma = new PrismaClient();

export async function syncMetall90() {
  const data = await parseMetall90();
  
console.log('📦 Найдено товаров:', data.length);
console.log('🧪 Примеры:');
console.log(data.slice(0, 5));

  for (const item of data) {
    const prod = await prisma.metalProduct.findFirst({
      where: { name: item.name },
    });

    if (!prod) {
      console.log(`🔍 Продукт не найден: ${item.name}`);
      continue;
    }

    await prisma.metalProduct.update({
      where: { id: prod.id },
      data: {
  pricePerUnit: item.price,
  
},
    });
  }

  console.log('✅ Обновление завершено');
}

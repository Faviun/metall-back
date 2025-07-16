import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // Разрешает запросы с любых доменов
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
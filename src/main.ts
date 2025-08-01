import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Разрешаем CORS с любого источника (все домены)
  app.enableCors({
    origin: true, // разрешить все источники
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // если нужны куки/авторизация
  });

  const config = new DocumentBuilder()
    .setTitle('Metal Parser API')
    .setDescription('Документация всех эндпоинтов')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3000);
}

bootstrap();

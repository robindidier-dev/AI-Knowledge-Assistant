import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // supprime les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // rejette la requête si des champs inconnus sont présents
      transform: true, // convertit automatiquement les types (string -> number si attendu)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(config.get<string>('PORT') ?? process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`, 'Bootstrap');

  const mongo: Connection = app.get(getConnectionToken());
  const uri = config.get<string>('MONGODB_URI') ?? '';
  const logMongo = () =>
    Logger.log(
      `MongoDB connected (${mongo.name}) ${uri.replace(/:[^:@/]+@/, ':****@')}`,
      'Bootstrap',
    );
  if (mongo.readyState === 1) logMongo();
  else mongo.once('connected', logMongo);
}
bootstrap();

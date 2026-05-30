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
  const safeHost = parseMongoHost(uri);
  const env = process.env.NODE_ENV ?? 'development';
  const logMongo = () =>
    Logger.log(
      `MongoDB connected db=${mongo.name} host=${safeHost} env=${env}`,
      'Bootstrap',
    );
  if (mongo.readyState === 1) logMongo();
  else mongo.once('connected', logMongo);
}

// Extract only the host from a MongoDB URI — never credentials, query string,
// or path. Returns 'unknown' if the URI is missing/unparseable so a malformed
// URI can never fall through to a raw log.
function parseMongoHost(uri: string): string {
  if (!uri) return 'unknown';
  try {
    return new URL(uri).hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}
bootstrap();

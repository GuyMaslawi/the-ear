import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly mongo: Connection) {}

  @Get()
  check() {
    return {
      status: 'ok',
      mongo: this.mongo.readyState === 1 ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

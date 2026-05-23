import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DropsModule } from './drops/drops.module';
import { AnswersModule } from './answers/answers.module';
import { GeoModule } from './geo/geo.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AiSummaryModule } from './ai-summary/ai-summary.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/the-ear',
      }),
      inject: [ConfigService],
    }),
    GeoModule,
    RealtimeModule,
    AiSummaryModule,
    UsersModule,
    AuthModule,
    DropsModule,
    AnswersModule,
    ReportsModule,
  ],
})
export class AppModule {}

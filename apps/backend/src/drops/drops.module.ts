import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Drop, DropSchema } from './schemas/drop.schema';
import { DropsService } from './drops.service';
import { DropsController } from './drops.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Drop.name, schema: DropSchema }]),
    RealtimeModule,
    UsersModule,
  ],
  controllers: [DropsController],
  providers: [DropsService],
  exports: [DropsService, MongooseModule],
})
export class DropsModule {}

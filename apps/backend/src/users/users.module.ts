import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RealtimeModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AuthGuard],
  exports: [UsersService, MongooseModule, AuthGuard],
})
export class UsersModule {}

import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import type { Request } from 'express';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: Request) {
    const u = req.user!;
    return {
      id: String(u._id),
      anonymousName: u.anonymousName,
    };
  }

  @Patch('location')
  async updateLocation(@Req() req: Request, @Body() dto: UpdateLocationDto) {
    const user = req.user!;
    await this.users.updateLocation(String(user._id), dto.lat, dto.lng);
    return { ok: true };
  }
}

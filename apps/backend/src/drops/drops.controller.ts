import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DropsService } from './drops.service';
import { CreateDropDto } from './dto/create-drop.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import type { Request } from 'express';

@Controller('drops')
export class DropsController {
  constructor(private readonly drops: DropsService) {}

  @Get('nearby')
  @UseGuards(AuthGuard)
  nearby(@Query() q: NearbyQueryDto, @Req() req: Request) {
    return this.drops.findNearby(
      q.lat,
      q.lng,
      q.radius,
      String(req.user!._id),
    );
  }

  /** Questions created by the current user (newest first). */
  @Get('mine')
  @UseGuards(AuthGuard)
  mine(@Req() req: Request) {
    return this.drops.findMine(String(req.user!._id));
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async one(@Param('id') id: string, @Req() req: Request) {
    return this.drops.findById(id, String(req.user!._id));
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: Request, @Body() dto: CreateDropDto) {
    return this.drops.create(String(req.user!._id), dto);
  }
}

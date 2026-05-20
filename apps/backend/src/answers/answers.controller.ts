import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AnswersService } from './answers.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import type { Request } from 'express';

@Controller('drops')
@UseGuards(AuthGuard)
export class AnswersController {
  constructor(private readonly answers: AnswersService) {}

  @Post(':id/answers')
  postAnswer(
    @Param('id') dropId: string,
    @Req() req: Request,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.answers.create(dropId, String(req.user!._id), dto);
  }

  @Get(':id/answers')
  list(@Param('id') dropId: string, @Req() req: Request) {
    return this.answers.listForDrop(dropId, String(req.user!._id));
  }
}

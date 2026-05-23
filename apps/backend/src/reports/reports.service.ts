import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  private readonly log = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
  ) {}

  async create(reporterUserId: string, dto: CreateReportDto) {
    const doc = await this.reportModel.create({
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      details: dto.details,
      reporterUserId: new Types.ObjectId(reporterUserId),
      status: 'open',
    });
    this.log.log(
      `Report created id=${String(doc._id)} target=${dto.targetType}:${dto.targetId}`,
    );
    return { ok: true };
  }
}

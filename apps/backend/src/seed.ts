import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from './app.module';
import { User, UserDocument } from './users/schemas/user.schema';
import { Drop, DropDocument } from './drops/schemas/drop.schema';
import { Answer, AnswerDocument } from './answers/schemas/answer.schema';
import { DropCategory, DropStatus, QuickStatus } from './common/enums';
import { GeoService } from './geo/geo.service';
import { AiSummaryService } from './ai-summary/ai-summary.service';

const log = new Logger('Seed');

const TLV_POINTS: { lat: number; lng: number; question: string; category: DropCategory }[] = [
  {
    lat: 32.0853,
    lng: 34.7818,
    question: 'כמה עמוס הדיון בכיכר רבין עכשיו?',
    category: DropCategory.CROWD,
  },
  {
    lat: 32.0804,
    lng: 34.7749,
    question: 'יש חניה ליד שוק הכרמל?',
    category: DropCategory.PARKING,
  },
  {
    lat: 32.0901,
    lng: 34.7897,
    question: 'כמה זמן התור בדואר?',
    category: DropCategory.QUEUE,
  },
  {
    lat: 32.073,
    lng: 34.7955,
    question: 'האם יש עומס בכניסה ליפו העתיקה?',
    category: DropCategory.CROWD,
  },
  {
    lat: 32.0958,
    lng: 34.7762,
    question: 'האם יש אירוע שחוסם את הרחוב?',
    category: DropCategory.INCIDENT,
  },
];

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    const dropModel = app.get<Model<DropDocument>>(getModelToken(Drop.name));
    const answerModel = app.get<Model<AnswerDocument>>(getModelToken(Answer.name));
    const geo = app.get(GeoService);
    const ai = app.get(AiSummaryService);

    await answerModel.deleteMany({}).exec();
    await dropModel.deleteMany({}).exec();
    await userModel.deleteMany({}).exec();

    const users = await userModel.insertMany([
      {
        sessionToken: 'seed_token_creator',
        anonymousName: 'אוזן #seed1',
        trustScore: 72,
      },
      {
        sessionToken: 'seed_token_responder_a',
        anonymousName: 'אוזן #seed2',
        trustScore: 55,
      },
      {
        sessionToken: 'seed_token_responder_b',
        anonymousName: 'אוזן #seed3',
        trustScore: 48,
      },
    ]);

    const creatorId = users[0]._id as Types.ObjectId;
    const responderA = users[1]._id as Types.ObjectId;
    const responderB = users[2]._id as Types.ObjectId;

    const ttlMs = 48 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const drops: DropDocument[] = [];

    for (const p of TLV_POINTS) {
      const loc = geo.point(p.lat, p.lng);
      const d = await dropModel.create({
        question: p.question,
        category: p.category,
        location: loc,
        radiusMeters: 450,
        status: DropStatus.ACTIVE,
        createdBy: creatorId,
        expiresAt,
        answerCount: 0,
        aiSummary: '',
        confidenceScore: 0,
      });
      drops.push(d);
    }

    const quickCycle: QuickStatus[] = [
      QuickStatus.BUSY,
      QuickStatus.BUSY,
      QuickStatus.BUSY,
      QuickStatus.BUSY,
      QuickStatus.NORMAL,
      QuickStatus.EMPTY,
      QuickStatus.VERY_BUSY,
      QuickStatus.UNKNOWN,
      QuickStatus.BUSY,
      QuickStatus.NORMAL,
    ];

    const now = Date.now();
    const twoMinAgo = now - 90_000;

    for (let i = 0; i < 10; i++) {
      const drop = drops[i % drops.length];
      const userId = i % 2 === 0 ? responderA : responderB;
      const lat = drop.location.coordinates[1] + 0.0004 * (i - 5);
      const lng = drop.location.coordinates[0] + 0.0004 * (i - 5);
      const answerPoint = geo.point(lat, lng);
      const dist = Math.round(
        geo.distanceMeters(drop.location, answerPoint),
      );
      const createdAt = i < 4 ? new Date(now - 30_000 * (i + 1)) : new Date(twoMinAgo - i * 60_000);

      await answerModel.collection.insertOne({
        dropId: drop._id,
        userId,
        text: `תשובת דמו #${i + 1}`,
        quickStatus: quickCycle[i] ?? QuickStatus.UNKNOWN,
        locationAtAnswer: geo.approximatePoint(lat, lng),
        distanceFromDrop: Math.min(dist, 400),
        trustWeight: 0.5,
        createdAt,
      });
    }

    for (const drop of drops) {
      const answers = await answerModel.find({ dropId: drop._id }).exec();
      const { text, confidenceScore } = ai.summarize(answers);
      await dropModel.updateOne(
        { _id: drop._id },
        {
          answerCount: answers.length,
          aiSummary: text,
          confidenceScore,
        },
      );
    }

    log.log('Seed complete: 3 users, 5 drops (Tel Aviv area), 10 answers with mixed statuses.');
  } finally {
    await app.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

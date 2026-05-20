import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService) {}

  async createAnonymousSession() {
    const accessToken = randomBytes(24).toString('hex');
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const anonymousName = `אוזן #${suffix}`;
    const user = await this.users.createAnonymous(accessToken, anonymousName);
    return {
      accessToken,
      user: {
        id: String(user._id),
        anonymousName: user.anonymousName,
      },
    };
  }
}

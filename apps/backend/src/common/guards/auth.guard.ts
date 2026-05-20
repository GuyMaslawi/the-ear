import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'] as string | undefined;
    const token = header?.startsWith('Bearer ')
      ? header.slice(7)
      : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    const user = await this.users.findBySessionToken(token);
    if (!user) throw new UnauthorizedException('Invalid token');
    req.user = user;
    return true;
  }
}

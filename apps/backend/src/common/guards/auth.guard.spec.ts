import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import type { UsersService } from '../../users/users.service';

function ctx(headers: Record<string, string | undefined>): {
  context: ExecutionContext;
  req: { headers: typeof headers; user?: unknown };
} {
  const req = { headers } as { headers: typeof headers; user?: unknown };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { context, req };
}

describe('AuthGuard', () => {
  it('rejects requests with no Authorization header', async () => {
    const users = { findBySessionToken: jest.fn() } as unknown as UsersService;
    const guard = new AuthGuard(users);
    const { context } = ctx({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findBySessionToken).not.toHaveBeenCalled();
  });

  it('rejects when token is not a Bearer scheme', async () => {
    const users = { findBySessionToken: jest.fn() } as unknown as UsersService;
    const guard = new AuthGuard(users);
    const { context } = ctx({ authorization: 'Basic abc' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when token does not resolve to a user', async () => {
    const users = {
      findBySessionToken: jest.fn().mockResolvedValue(null),
    } as unknown as UsersService;
    const guard = new AuthGuard(users);
    const { context } = ctx({ authorization: 'Bearer deadbeef' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches user on req when bearer token is valid', async () => {
    const user = { _id: 'u1' };
    const users = {
      findBySessionToken: jest.fn().mockResolvedValue(user),
    } as unknown as UsersService;
    const guard = new AuthGuard(users);
    const { context, req } = ctx({ authorization: 'Bearer the-token' });
    const ok = await guard.canActivate(context);
    expect(ok).toBe(true);
    expect(req.user).toBe(user);
    expect(users.findBySessionToken).toHaveBeenCalledWith('the-token');
  });
});

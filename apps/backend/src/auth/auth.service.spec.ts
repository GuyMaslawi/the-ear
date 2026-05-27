import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  it('creates anonymous session with a 48-char hex token and Hebrew name', async () => {
    const created = {
      _id: 'u1',
      anonymousName: 'placeholder',
    };
    const users = {
      createAnonymous: jest.fn(async (token: string, name: string) => ({
        ...created,
        anonymousName: name,
      })),
    } as unknown as UsersService;
    const auth = new AuthService(users);

    const res = await auth.createAnonymousSession();

    expect(res.accessToken).toMatch(/^[0-9a-f]{48}$/);
    expect(res.user.id).toBe('u1');
    expect(res.user.anonymousName).toMatch(/^אוזן #\d{4}$/);
    expect(users.createAnonymous).toHaveBeenCalledWith(
      res.accessToken,
      res.user.anonymousName,
    );
  });

  it('generates a fresh token on each call', async () => {
    const users = {
      createAnonymous: jest.fn(async (_t: string, n: string) => ({
        _id: '1',
        anonymousName: n,
      })),
    } as unknown as UsersService;
    const auth = new AuthService(users);
    const a = await auth.createAnonymousSession();
    const b = await auth.createAnonymousSession();
    expect(a.accessToken).not.toEqual(b.accessToken);
  });
});

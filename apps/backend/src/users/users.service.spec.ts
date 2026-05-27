import { UsersService } from './users.service';
import { GeoService } from '../geo/geo.service';

describe('UsersService', () => {
  const geo = new GeoService();
  let model: {
    create: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    find: jest.Mock;
  };
  let realtime: { setUserLocation: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    model = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
    };
    realtime = { setUserLocation: jest.fn() };
    service = new UsersService(model as never, geo, realtime as never);
  });

  it('createAnonymous persists default trustScore=50 with provided token/name', async () => {
    model.create.mockResolvedValue({ _id: 'u1', sessionToken: 't', anonymousName: 'אוזן' });
    await service.createAnonymous('t', 'אוזן');
    expect(model.create).toHaveBeenCalledWith({
      sessionToken: 't',
      anonymousName: 'אוזן',
      trustScore: 50,
    });
  });

  it('findBySessionToken queries by token', async () => {
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'u1' }),
    });
    const out = await service.findBySessionToken('the-token');
    expect(model.findOne).toHaveBeenCalledWith({ sessionToken: 'the-token' });
    expect(out).toEqual({ _id: 'u1' });
  });

  it('updateLocation writes [lng, lat] GeoJSON point and updates realtime cache', async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: 'u1' }),
    });
    await service.updateLocation('u1', 32.08, 34.78);
    const [id, update, opts] = model.findByIdAndUpdate.mock.calls[0];
    expect(id).toBe('u1');
    expect(update.currentLocation).toEqual({
      type: 'Point',
      coordinates: [34.78, 32.08],
    });
    expect(update.lastSeenAt).toBeInstanceOf(Date);
    expect(opts).toEqual({ new: true });
    expect(realtime.setUserLocation).toHaveBeenCalledWith('u1', 32.08, 34.78);
  });

  it('findUserIdsNear uses $centerSphere with radius in radians', async () => {
    const exec = jest.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]);
    const lean = jest.fn().mockReturnValue({ exec });
    const select = jest.fn().mockReturnValue({ lean });
    model.find.mockReturnValue({ select });

    const out = await service.findUserIdsNear(32, 34, 6378.1);
    const filter = model.find.mock.calls[0][0];
    expect(filter.currentLocation.$geoWithin.$centerSphere[0]).toEqual([34, 32]);
    // 6378.1 meters / earth radius (6378100m) = 0.001 radians
    expect(filter.currentLocation.$geoWithin.$centerSphere[1]).toBeCloseTo(
      0.001,
      6,
    );
    expect(out).toEqual(['a', 'b']);
  });
});

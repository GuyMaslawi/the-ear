import { RealtimeService } from './realtime.service';
import { GeoService } from '../geo/geo.service';

type Emit = { sid: string; event: string; payload: unknown };

function fakeServer() {
  const emits: Emit[] = [];
  return {
    emits,
    server: {
      to: (sid: string) => ({
        emit: (event: string, payload: unknown) => {
          emits.push({ sid, event, payload });
        },
      }),
    },
  };
}

describe('RealtimeService', () => {
  const geo = new GeoService();
  let svc: RealtimeService;
  let server: ReturnType<typeof fakeServer>;

  beforeEach(() => {
    svc = new RealtimeService(geo);
    server = fakeServer();
    svc.attachServer(server.server as never);
  });

  it('registerSocket / unregisterSocket cleans up sockets and location cache', () => {
    svc.registerSocket('u1', 's1');
    svc.registerSocket('u1', 's2');
    svc.setUserLocation('u1', 32, 34);

    svc.unregisterSocket('s1');
    // Still has s2 — location should remain
    svc.emitNewDropNearby({
      dropId: 'd1',
      question: 'q',
      category: 'QUEUE',
      lat: 32,
      lng: 34,
      radiusMeters: 100,
    });
    expect(server.emits.map((e) => e.sid)).toEqual(['s2']);

    svc.unregisterSocket('s2');
    server.emits.length = 0;
    svc.emitNewDropNearby({
      dropId: 'd2',
      question: 'q',
      category: 'QUEUE',
      lat: 32,
      lng: 34,
      radiusMeters: 100,
    });
    expect(server.emits).toEqual([]);
  });

  it('emitNewDropNearby only emits to users within max(radius, 3000m)', () => {
    svc.registerSocket('near', 'sn');
    svc.registerSocket('far', 'sf');
    svc.setUserLocation('near', 32.001, 34); // ~111m away
    svc.setUserLocation('far', 33, 34); // ~111km away

    svc.emitNewDropNearby({
      dropId: 'd1',
      question: 'q',
      category: 'QUEUE',
      lat: 32,
      lng: 34,
      radiusMeters: 100,
    });

    const targets = server.emits.map((e) => e.sid);
    expect(targets).toContain('sn');
    expect(targets).not.toContain('sf');
  });

  it('uses drop radius when it is larger than the 3000m discovery floor', () => {
    svc.registerSocket('out', 'so');
    svc.setUserLocation('out', 32.04, 34); // ~4.4km away

    svc.emitNewDropNearby({
      dropId: 'd1',
      question: 'q',
      category: 'QUEUE',
      lat: 32,
      lng: 34,
      radiusMeters: 5000,
    });

    expect(server.emits.map((e) => e.sid)).toContain('so');
  });

  it('emitDropUpdated broadcasts to drop room and creator sockets', () => {
    svc.registerSocket('creator', 'sc1');
    svc.registerSocket('creator', 'sc2');
    const room = jest.fn();
    const roomEmit = { emit: room };
    // Override server.to to track both room and per-socket targets
    const calls: { target: string; event: string; payload: unknown }[] = [];
    (svc as unknown as { server: unknown }).server = {
      to: (target: string) => ({
        emit: (event: string, payload: unknown) => {
          calls.push({ target, event, payload });
          return roomEmit;
        },
      }),
    };

    svc.emitDropUpdated('d1', { answerCount: 1 }, 'creator');

    const targets = calls.map((c) => c.target);
    expect(targets).toContain('drop:d1');
    expect(targets).toContain('sc1');
    expect(targets).toContain('sc2');
    expect(calls.every((c) => c.event === 'drop_updated')).toBe(true);
  });

  it('is a no-op when no server is attached', () => {
    const svc2 = new RealtimeService(geo);
    expect(() =>
      svc2.emitNewDropNearby({
        dropId: 'd',
        question: 'q',
        category: 'QUEUE',
        lat: 0,
        lng: 0,
        radiusMeters: 100,
      }),
    ).not.toThrow();
    expect(() => svc2.emitDropUpdated('d', {})).not.toThrow();
  });
});

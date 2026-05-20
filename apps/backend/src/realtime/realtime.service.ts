import { Injectable, Logger } from '@nestjs/common';
import { GeoService } from '../geo/geo.service';
import type { Server, Socket } from 'socket.io';

type LatLng = { lat: number; lng: number };

@Injectable()
export class RealtimeService {
  private readonly log = new Logger(RealtimeService.name);
  private server: Server | null = null;
  /** userId -> latest coords */
  private readonly userLocations = new Map<string, LatLng>();
  /** socketId -> userId */
  private readonly socketUsers = new Map<string, string>();
  /** userId -> Set socketId */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly geo: GeoService) {}

  attachServer(server: Server) {
    this.server = server;
  }

  registerSocket(userId: string, socketId: string) {
    this.socketUsers.set(socketId, userId);
    let set = this.userSockets.get(userId);
    if (!set) {
      set = new Set();
      this.userSockets.set(userId, set);
    }
    set.add(socketId);
  }

  unregisterSocket(socketId: string) {
    const userId = this.socketUsers.get(socketId);
    if (!userId) return;
    this.socketUsers.delete(socketId);
    const set = this.userSockets.get(userId);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) {
        this.userSockets.delete(userId);
        this.userLocations.delete(userId);
      }
    }
  }

  setUserLocation(userId: string, lat: number, lng: number) {
    this.userLocations.set(userId, { lat, lng });
  }

  emitNewDropNearby(payload: {
    dropId: string;
    question: string;
    category: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  }) {
    if (!this.server) return;
    this.log.log(
      `emit new_drop_nearby dropId=${payload.dropId} category=${payload.category}`,
    );
    const center = this.geo.point(payload.lat, payload.lng);
    for (const [userId, pos] of this.userLocations) {
      const d = this.geo.distanceMeters(
        center,
        this.geo.point(pos.lat, pos.lng),
      );
      if (d <= payload.radiusMeters) {
        const sockets = this.userSockets.get(userId);
        if (!sockets) continue;
        for (const sid of sockets) {
          this.server.to(sid).emit('new_drop_nearby', payload);
        }
      }
    }
  }

  emitDropUpdated(
    dropId: string,
    payload: Record<string, unknown>,
    creatorUserId?: string,
  ) {
    if (!this.server) return;
    this.log.log(`emit drop_updated dropId=${dropId}`);
    this.server.to(`drop:${dropId}`).emit('drop_updated', payload);
    if (creatorUserId) {
      const sockets = this.userSockets.get(creatorUserId);
      if (sockets) {
        for (const sid of sockets) {
          this.server.to(sid).emit('drop_updated', payload);
        }
      }
    }
  }

  joinDropRoom(socket: Socket, dropId: string) {
    void socket.join(`drop:${dropId}`);
  }

  leaveDropRoom(socket: Socket, dropId: string) {
    void socket.leave(`drop:${dropId}`);
  }
}

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import * as ngeohash from 'ngeohash';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RealtimeService } from './realtime.service';

const GEO_PRECISION = 6;

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attachServer(server);
  }

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ||
      (client.handshake.query?.token as string | undefined);
    if (!token || typeof token !== 'string') {
      this.logger.warn('Socket rejected: missing token');
      client.disconnect(true);
      return;
    }
    const user = await this.userModel.findOne({ sessionToken: token }).exec();
    if (!user) {
      this.logger.warn('Socket rejected: bad token');
      client.disconnect(true);
      return;
    }
    const userId = String(user._id);
    client.data.userId = userId;
    this.realtime.registerSocket(userId, client.id);
    client.emit('authenticated', { userId });
    this.logger.log('User connected');
  }

  handleDisconnect(client: Socket) {
    const room = client.data.geoRoom as string | undefined;
    if (room) void client.leave(room);
    this.realtime.unregisterSocket(client.id);
    this.logger.log(`Socket disconnected id=${client.id}`);
  }

  @SubscribeMessage('geo:update')
  async onGeoUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { lat?: number; lng?: number },
  ) {
    this.logger.debug(`event=geo:update socket=${client.id}`);
    const userId = client.data.userId as string | undefined;
    if (!userId || body.lat == null || body.lng == null) return;
    this.realtime.setUserLocation(userId, body.lat, body.lng);
    const hash = ngeohash.encode(body.lat, body.lng, GEO_PRECISION);
    const nextRoom = `gh:${hash}`;
    const prev = client.data.geoRoom as string | undefined;
    if (prev && prev !== nextRoom) await client.leave(prev);
    await client.join(nextRoom);
    client.data.geoRoom = nextRoom;
    return { ok: true, room: nextRoom };
  }

  @SubscribeMessage('drop:join')
  async joinDrop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { dropId?: string },
  ) {
    this.logger.log(`event=drop:join socket=${client.id} dropId=${body.dropId ?? ''}`);
    if (!body.dropId) return { ok: false };
    this.realtime.joinDropRoom(client, body.dropId);
    return { ok: true };
  }

  @SubscribeMessage('drop:leave')
  async leaveDrop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { dropId?: string },
  ) {
    this.logger.log(`event=drop:leave socket=${client.id} dropId=${body.dropId ?? ''}`);
    if (!body.dropId) return { ok: false };
    this.realtime.leaveDropRoom(client, body.dropId);
    return { ok: true };
  }
}

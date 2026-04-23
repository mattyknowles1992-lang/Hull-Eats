import { Logger } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({
  namespace: "/ws/orders",
  cors: {
    origin: "*",
  },
})
export class OrderUpdatesGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OrderUpdatesGateway.name);

  afterInit(): void {
    this.logger.log("Order updates gateway initialized");
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Realtime client connected: ${client.id}`);
  }

  emitOrderUpdate(orderId: string, payload: Record<string, unknown>): void {
    this.server.to(orderId).emit("order.updated", payload);
  }
}

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from "@microsoft/signalr";
import { HUB_URL } from "./config";

let connection: HubConnection | null = null;
let inLobby = false;
const gameIds = new Set<string>();
const reconnectHandlers = new Set<() => void>();

function getConnection() {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.onreconnected(async () => {
      try {
        if (inLobby) {
          await connection!.invoke("JoinLobby");
        }
        for (const gameId of gameIds) {
          await connection!.invoke("JoinGame", gameId);
        }
        reconnectHandlers.forEach((handler) => handler());
      } catch {
        // ignore reconnect join errors, next update will retry
      }
    });
  }
  return connection;
}

async function connect() {
  const c = getConnection();
  if (c.state === HubConnectionState.Disconnected) {
    await c.start();
  }
  return c;
}

export async function joinLobby() {
  await (await connect()).invoke("JoinLobby");
  inLobby = true;
}

export async function leaveLobby() {
  inLobby = false;
  const c = getConnection();
  if (c.state === HubConnectionState.Connected) {
    await c.invoke("LeaveLobby");
  }
}

export async function joinGame(gameId: string) {
  await (await connect()).invoke("JoinGame", gameId);
  gameIds.add(gameId);
}

export async function leaveGame(gameId: string) {
  gameIds.delete(gameId);
  const c = getConnection();
  if (c.state === HubConnectionState.Connected) {
    await c.invoke("LeaveGame", gameId);
  }
}

export function onLobbyUpdated(handler: () => void) {
  const c = getConnection();
  c.on("LobbyUpdated", handler);
  return () => c.off("LobbyUpdated", handler);
}

export function onGameUpdated(handler: (gameId: string) => void) {
  const c = getConnection();
  const fn = (msg: { gameId: string }) => handler(msg.gameId);
  c.on("GameUpdated", fn);
  return () => c.off("GameUpdated", fn);
}

export function onReconnected(handler: () => void) {
  reconnectHandlers.add(handler);
  return () => reconnectHandlers.delete(handler);
}

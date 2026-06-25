import { API_URL } from "./config";
import type {
  FleetShip,
  GameCard,
  GameState,
  OwnShip,
  Player,
  ShotResult,
} from "./types";

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Server is not running");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Bad response (${res.status})`);
    }
  }

  if (!res.ok) {
    if (data && typeof data === "object" && "message" in data) {
      throw new Error(String((data as { message: unknown }).message));
    }
    throw new Error(`Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  createPlayer: (name: string) => call<Player>("/api/players", "POST", { name }),

  getPlayer: (id: string) => call<Player>(`/api/players/${id}`),

  openGames: () => call<GameCard[]>("/api/games"),

  gameCard: (id: string) => call<GameCard>(`/api/games/${id}`),

  createGame: (hostId: string, gridSize: number, fleet: FleetShip[]) =>
    call<{ id: string }>("/api/games", "POST", { hostId, gridSize, fleet }),

  joinGame: (gameId: string, playerId: string) =>
    call<{ id: string }>(`/api/games/${gameId}/join`, "POST", { playerId }),

  state: (gameId: string, playerId: string) =>
    call<GameState>(`/api/games/${gameId}/state?playerId=${playerId}`),

  placeFleet: (gameId: string, playerId: string, ships: OwnShip[]) =>
    call<void>(`/api/games/${gameId}/fleet`, "POST", { playerId, ships }),

  fire: (gameId: string, playerId: string, x: number, y: number) =>
    call<ShotResult>(`/api/games/${gameId}/fire`, "POST", { playerId, x, y }),
};

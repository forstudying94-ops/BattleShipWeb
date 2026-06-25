export type Player = {
  id: string;
  displayName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
};

export type FleetShip = {
  size: number;
};

export type GameCard = {
  id: string;
  hostId: string;
  hostName: string;
  gridSize: number;
  shipCount: number;
  shipCells: number;
  status: string;
  createdAt: string;
};

export type GameStatus = "WaitingForOpponent" | "Placing" | "Active" | "Finished";

export type Cell = { x: number; y: number; hit: boolean };

export type OwnShip = {
  size: number;
  x: number;
  y: number;
  horizontal: boolean;
};

export type EnemyShip = { size: number; sunk: boolean };

export type GameState = {
  id: string;
  gridSize: number;
  fleet: FleetShip[];
  status: GameStatus;
  hostId: string;
  opponentId: string | null;
  hostName: string;
  opponentName: string | null;
  youAreHost: boolean;
  turnPlayerId: string | null;
  winnerId: string | null;
  youPlaced: boolean;
  opponentPlaced: boolean;
  myShips: OwnShip[];
  shotsByMe: Cell[];
  shotsAtMe: Cell[];
  enemyFleet: EnemyShip[];
};

export type ShotResult = {
  x: number;
  y: number;
  hit: boolean;
  sunkSize: number | null;
  finished: boolean;
  winnerId: string | null;
  nextTurnPlayerId: string | null;
};

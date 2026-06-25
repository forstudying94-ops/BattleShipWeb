import type { FleetShip, OwnShip } from "./types";

export const DEFAULT_FLEET: FleetShip[] = [
  { size: 5 },
  { size: 4 },
  { size: 3 },
  { size: 3 },
  { size: 2 },
];

export const MIN_GRID = 6;
export const MAX_GRID = 16;
export const MAX_SHIP_SIZE = 7;

export function cellsOf(ship: OwnShip): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < ship.size; i++) {
    if (ship.horizontal) cells.push([ship.x + i, ship.y]);
    else cells.push([ship.x, ship.y + i]);
  }
  return cells;
}

export function inBounds(ship: OwnShip, grid: number): boolean {
  for (const [x, y] of cellsOf(ship)) {
    if (x < 0 || y < 0 || x >= grid || y >= grid) return false;
  }
  return true;
}

export function overlaps(a: OwnShip, b: OwnShip): boolean {
  const aCells = cellsOf(a);
  for (const [x, y] of cellsOf(b)) {
    if (aCells.some(([ax, ay]) => ax === x && ay === y)) return true;
  }
  return false;
}

export function shipColor(index: number): string {
  return `ship-color-${(index % 8) + 1}`;
}

export function columnLabel(i: number): string {
  return String.fromCharCode(65 + i);
}

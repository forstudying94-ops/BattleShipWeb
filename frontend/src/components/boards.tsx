import { cellsOf, shipColor } from "../fleet";
import type { Cell, OwnShip } from "../types";
import { Grid } from "./Grid";

function shotMap(shots: Cell[]) {
  const m = new Map<string, boolean>();
  for (const s of shots) m.set(`${s.x},${s.y}`, s.hit);
  return m;
}

function buildOwnerMap(ships: OwnShip[]) {
  const m = new Map<string, number>();
  for (let i = 0; i < ships.length; i++) {
    for (const [x, y] of cellsOf(ships[i])) m.set(`${x},${y}`, i);
  }
  return m;
}

export function FireBoard({
  gridSize,
  shotsByMe,
  onFire,
  disabled,
}: {
  gridSize: number;
  shotsByMe: Cell[];
  onFire: (x: number, y: number) => void;
  disabled: boolean;
}) {
  const shots = shotMap(shotsByMe);

  return (
    <Grid
      size={gridSize}
      cell={(x, y) => {
        const key = `${x},${y}`;
        const fired = shots.has(key);
        const hit = shots.get(key);
        let cls = "cell cell-empty";
        if (!fired && !disabled) cls = "cell cell-empty cell-clickable";
        if (fired && hit) cls = "cell cell-hit";
        if (fired && !hit) cls = "cell cell-miss";
        return (
          <button
            disabled={disabled || fired}
            onClick={() => onFire(x, y)}
            className={cls}
          >
            {fired && hit ? "X" : fired ? "." : ""}
          </button>
        );
      }}
    />
  );
}

export function FleetBoard({
  gridSize,
  myShips,
  shotsAtMe,
}: {
  gridSize: number;
  myShips: OwnShip[];
  shotsAtMe: Cell[];
}) {
  const owner = buildOwnerMap(myShips);
  const incoming = shotMap(shotsAtMe);

  return (
    <Grid
      size={gridSize}
      cell={(x, y) => {
        const key = `${x},${y}`;
        const ship = owner.get(key);
        const wasShot = incoming.has(key);
        const hit = incoming.get(key);

        let cls = "cell cell-empty";
        if (ship !== undefined) cls = `cell ${shipColor(ship)}`;
        if (wasShot && hit) cls = "cell cell-hit";
        else if (wasShot) cls = "cell cell-miss";

        return (
          <div className={cls}>
            {wasShot && hit ? "X" : wasShot ? "." : ""}
          </div>
        );
      }}
    />
  );
}

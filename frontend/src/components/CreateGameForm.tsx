import { useState } from "react";
import { api } from "../api";
import { DEFAULT_FLEET, MAX_GRID, MAX_SHIP_SIZE, MIN_GRID } from "../fleet";
import type { FleetShip } from "../types";
import { Button, Card, Notice } from "./ui";

export function CreateGameForm({
  playerId,
  onCreated,
}: {
  playerId: string;
  onCreated: (id: string) => void;
}) {
  const [grid, setGrid] = useState(10);
  const [fleet, setFleet] = useState<FleetShip[]>(() => DEFAULT_FLEET.map((s) => ({ ...s })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cells = fleet.reduce((n, s) => n + s.size, 0);
  const maxCells = Math.floor(grid * grid * 0.6);
  const tooBig = cells > maxCells;
  const empty = fleet.length === 0;

  const maxShipSize = Math.min(grid, MAX_SHIP_SIZE);

  function changeGrid(value: number) {
    const g = Math.min(MAX_GRID, Math.max(MIN_GRID, value));
    const maxSize = Math.min(g, MAX_SHIP_SIZE);
    setGrid(g);
    setFleet((f) => f.map((s) => ({ ...s, size: Math.min(s.size, maxSize) })));
  }

  function setSize(index: number, size: number) {
    setFleet((f) =>
      f.map((s, i) =>
        i === index ? { ...s, size: Math.min(maxShipSize, Math.max(1, size)) } : s
      )
    );
  }

  function addShip() {
    setFleet((f) => [...f, { size: Math.min(2, maxShipSize) }]);
  }

  function removeShip(index: number) {
    setFleet((f) => f.filter((_, i) => i !== index));
  }

  async function create() {
    setBusy(true);
    setError("");
    try {
      const { id } = await api.createGame(playerId, grid, fleet);
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create game");
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2>Create game</h2>

      <div className="form-stack">
        <div className="control">
          <label htmlFor="grid-size">Board size</label>
          <select
            id="grid-size"
            className="control-field"
            value={grid}
            onChange={(e) => changeGrid(Number(e.target.value))}
          >
            {Array.from({ length: MAX_GRID - MIN_GRID + 1 }, (_, i) => MIN_GRID + i).map((n) => (
              <option key={n} value={n}>
                {n} x {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span>Fleet</span>

          <table>
            <thead>
              <tr>
                <th></th>
                <th className="num">Size</th>
                <th className="num">Action</th>
              </tr>
            </thead>
            <tbody>
              {fleet.map((ship, i) => (
                <tr key={i}>
                  <td>
                    <span className="ship-preview">
                      {Array.from({ length: ship.size }).map((_, c) => (
                        <span key={c} className="ship-preview-cell" />
                      ))}
                    </span>
                  </td>
                  <td className="num">
                    <button onClick={() => setSize(i, ship.size - 1)} disabled={ship.size <= 1}>
                      -
                    </button>
                    <span className="size-value">{ship.size}</span>
                    <button
                      onClick={() => setSize(i, ship.size + 1)}
                      disabled={ship.size >= maxShipSize}
                    >
                      +
                    </button>
                  </td>
                  <td className="num">
                    <button onClick={() => removeShip(i)}>
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={addShip}
            disabled={fleet.length >= 12}
          >
            + add ship
          </button>

          <p className={tooBig ? "status-error" : "muted"}>
            {fleet.length} ships, {cells} cells (max {maxCells})
          </p>
        </div>

        {error && <Notice>{error}</Notice>}

        <Button onClick={create} loading={busy} disabled={empty || tooBig}>
          Create game
        </Button>
      </div>
    </Card>
  );
}

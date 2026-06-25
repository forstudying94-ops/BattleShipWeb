import { useState } from "react";
import { api } from "../api";
import { cellsOf, inBounds, overlaps, shipColor } from "../fleet";
import type { GameState, OwnShip } from "../types";
import type { StoredPlayer } from "../player";
import { Grid } from "./Grid";
import { Button, Card, Notice } from "./ui";

function buildOwnerMap(placed: (OwnShip | null)[]) {
  const map = new Map<string, number>();
  for (let i = 0; i < placed.length; i++) {
    const ship = placed[i];
    if (!ship) continue;
    for (const [x, y] of cellsOf(ship)) map.set(`${x},${y}`, i);
  }
  return map;
}

export function PlacementPhase({
  state,
  player,
}: {
  state: GameState;
  player: StoredPlayer;
}) {
  const grid = state.gridSize;
  const fleet = state.fleet ?? [];

  const [placed, setPlaced] = useState<(OwnShip | null)[]>(() => fleet.map(() => null));
  const [selected, setSelected] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const owner = buildOwnerMap(placed);
  const selectedShip = fleet[selected];

  let preview: OwnShip | null = null;
  if (hover && selectedShip && !placed[selected]) {
    preview = {
      size: selectedShip.size ?? 1,
      x: hover[0],
      y: hover[1],
      horizontal,
    };
  }

  const previewCells = new Set<string>();
  if (preview) {
    for (const [x, y] of cellsOf(preview)) previewCells.add(`${x},${y}`);
  }

  const previewOk =
    preview && inBounds(preview, grid) && !placed.some((p) => p && overlaps(p, preview!));

  function selectShip(i: number) {
    if (placed[i]) setPlaced((p) => p.map((s, idx) => (idx === i ? null : s)));
    setSelected(i);
  }

  function place(x: number, y: number) {
    if (!selectedShip || placed[selected]) return;
    const ship: OwnShip = {
      size: selectedShip.size ?? 1,
      x,
      y,
      horizontal,
    };
    if (!inBounds(ship, grid)) return;
    if (placed.some((p) => p && overlaps(p, ship))) return;

    const next = placed.map((p, i) => (i === selected ? ship : p));
    setPlaced(next);
    const nextEmpty = next.findIndex((p) => !p);
    if (nextEmpty !== -1) setSelected(nextEmpty);
  }

  function randomize() {
    const result: (OwnShip | null)[] = fleet.map(() => null);
    for (let i = 0; i < fleet.length; i++) {
      const s = fleet[i];
      if (!s) continue;
      const shipSize = s.size ?? 1;
      for (let attempt = 0; attempt < 300; attempt++) {
        const h = Math.random() < 0.5;
        const x = Math.floor(Math.random() * (h ? grid - shipSize + 1 : grid));
        const y = Math.floor(Math.random() * (h ? grid : grid - shipSize + 1));
        const ship: OwnShip = { size: shipSize, x, y, horizontal: h };
        if (!result.some((p) => p && overlaps(p, ship))) {
          result[i] = ship;
          break;
        }
      }
    }
    setPlaced(result);
    const next = result.findIndex((p) => !p);
    setSelected(next === -1 ? Math.max(0, fleet.length - 1) : next);
  }

  const allPlaced = placed.every(Boolean);

  if (fleet.length === 0) {
    return (
      <Card className="message-card">
        <Notice>Game fleet is missing</Notice>
      </Card>
    );
  }

  async function submit() {
    if (!allPlaced) return;
    setBusy(true);
    setError("");
    try {
      await api.placeFleet(state.id, player.id, placed.filter(Boolean) as OwnShip[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save fleet");
      setBusy(false);
    }
  }

  return (
    <div className="placement-layout">
      <Card>
        <h2>Place ships</h2>

        <ul className="ship-list">
          {fleet.map((s, i) => {
            const size = s?.size ?? 1;
            const isPlaced = !!placed[i];
            const active = selected === i && !isPlaced;
            return (
              <li key={i}>
                <button
                  onClick={() => selectShip(i)}
                  className={`ship-button ${active ? "active" : ""}`}
                >
                  <span className="ship-preview">
                    {Array.from({ length: size }).map((_, c) => (
                      <span key={c} className={`ship-preview-cell ${isPlaced ? "placed" : ""}`} />
                    ))}
                  </span>
                  <span>{isPlaced ? "remove" : size}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="button-column">
          <button onClick={() => setHorizontal((h) => !h)}>
            {horizontal ? "Horizontal" : "Vertical"}
          </button>
          <button onClick={randomize}>Random</button>
          {placed.some(Boolean) && (
            <button onClick={() => setPlaced(fleet.map(() => null))}>Clear</button>
          )}
        </div>

        {error && <Notice>{error}</Notice>}

        <Button onClick={submit} loading={busy} disabled={!allPlaced} className="full-width">
          Ready
        </Button>
      </Card>

      <Card>
        <div className="board-wrap">
          <Grid
            size={grid}
            onLeave={() => setHover(null)}
            cell={(x, y) => {
              const key = `${x},${y}`;
              const own = owner.get(key);
              const inPreview = previewCells.has(key);
              let cls = "cell cell-empty";
              if (inPreview) cls = previewOk ? "cell cell-preview-ok" : "cell cell-hit";
              else if (own !== undefined) cls = `cell ${shipColor(own)}`;
              return (
                <button
                  onMouseEnter={() => setHover([x, y])}
                  onClick={() => place(x, y)}
                  className={cls}
                />
              );
            }}
          />
        </div>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { api } from "../api";
import type { GameState } from "../types";
import type { StoredPlayer } from "../player";
import { Button, Card, Notice } from "./ui";
import { FireBoard, FleetBoard } from "./boards";

export function BattlePhase({
  state,
  player,
  onUpdate,
}: {
  state: GameState;
  player: StoredPlayer;
  onUpdate?: () => void;
}) {
  const myTurn = state.turnPlayerId === player.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastMessage, setLastMessage] = useState("");

  async function fire(x: number, y: number) {
    if (!myTurn || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.fire(state.id, player.id, x, y);
      setLastMessage(
        r.finished
          ? "Hit - you won!"
          : r.sunkSize
          ? `Sunk a ${r.sunkSize}-cell ship.`
          : r.hit
          ? "Hit. Go again."
          : "Miss."
      );
      onUpdate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Shot failed");
    } finally {
      setBusy(false);
    }
  }

  const opponentName = state.youAreHost ? state.opponentName : state.hostName;

  return (
    <div className="page-stack">
      <div className="status-message">
        {myTurn ? <strong>Your turn.</strong> : `Waiting for ${opponentName ?? "opponent"}...`}
        {lastMessage && <span> {lastMessage}</span>}
      </div>

      {error && <Notice>{error}</Notice>}

      <div className="two-cols">
        <Card>
          <p>Enemy board</p>
          <FireBoard
            gridSize={state.gridSize}
            shotsByMe={state.shotsByMe}
            onFire={fire}
            disabled={!myTurn || busy}
          />
          <div className="pill-row">
            {state.enemyFleet.map((s, i) => (
              <span
                key={i}
                className={`pill ${s?.sunk ? "pill-danger" : ""}`}
              >
                {s?.size ?? "?"}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <p>Your board</p>
          <FleetBoard gridSize={state.gridSize} myShips={state.myShips} shotsAtMe={state.shotsAtMe} />
        </Card>
      </div>
    </div>
  );
}

export function ResultPhase({
 state,
 player,
 goLobby,
}: {
 state: GameState;
 player: StoredPlayer;
 goLobby: () => void;
}) {
  const won = state.winnerId === player.id;
  const opponent = state.youAreHost ? state.opponentName : state.hostName;
  return (
    <div className="page-stack">
      <Card>
        <h2>{won ? "You win!" : "You lose!"}</h2>
        <p>
          {won
            ? `You sank all of ${opponent}'s ships.`
            : `${opponent} sank all your ships.`}
        </p>
        <Button onClick={goLobby}>Back to lobby</Button>
      </Card>

      <div className="two-cols">
        <Card>
          <p>Enemy board</p>
          <FireBoard gridSize={state.gridSize} shotsByMe={state.shotsByMe} onFire={() => {}} disabled />
        </Card>
        <Card>
          <p>Your board</p>
          <FleetBoard gridSize={state.gridSize} myShips={state.myShips} shotsAtMe={state.shotsAtMe} />
        </Card>
      </div>
    </div>
  );
}

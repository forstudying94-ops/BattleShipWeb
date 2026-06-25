import { useState } from "react";
import type { GameCard, GameState } from "../types";
import { Button, Card } from "./ui";

function InviteLink({ gameId }: { gameId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/game/${gameId}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="inline-form">
      <input readOnly value={url} className="control-field" />
      <Button onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
    </div>
  );
}

export function HostWaiting({ state, goLobby }: { state: GameState; goLobby: () => void }) {
  return (
    <Card className="message-card">
      <h2>Waiting for opponent</h2>
      <p>
        Board {state.gridSize}x{state.gridSize}, {(state.fleet ?? []).length} ships. Send this link:
      </p>
      <InviteLink gameId={state.id} />
      <button onClick={goLobby}>Back to lobby</button>
    </Card>
  );
}

export function JoinPanel({
  card,
  joining,
  onJoin,
}: {
  card: GameCard;
  joining: boolean;
  onJoin: () => void;
}) {
  return (
    <Card className="message-card">
      <h2>{card.hostName} wants to play</h2>
      <p>
        Board {card.gridSize}x{card.gridSize}, {card.shipCount} ships.
      </p>
      <Button onClick={onJoin} loading={joining}>
        Join
      </Button>
    </Card>
  );
}

export function WaitingForOpponent({ state }: { state: GameState }) {
  const name = state.opponentName ?? "opponent";
  return (
    <div className="narrow-page">
      <Card>
        <h2>Ships placed</h2>
        <p>Waiting for {name}...</p>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api";
import { joinLobby, leaveLobby, onLobbyUpdated, onReconnected } from "../realtime";
import type { GameCard } from "../types";
import { Button, Card, Notice } from "./ui";

export function OpenGames({
  player,
  onOpen,
}: {
  player: { id: string; displayName: string };
  onOpen: (id: string) => void;
}) {
  const [games, setGames] = useState<GameCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState<string | null>(null);

  async function load() {
    try {
      setGames(await api.openGames());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load games");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    joinLobby().catch(() => {});
    load();
    const offUpdate = onLobbyUpdated(load);
    const offReconnect = onReconnected(load);
    return () => {
      offUpdate();
      offReconnect();
      leaveLobby().catch(() => {});
    };
  }, []);

  async function join(id: string) {
    setJoining(id);
    setError("");
    try {
      await api.joinGame(id, player.id);
      onOpen(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
      setJoining(null);
      load();
    }
  }

  return (
    <Card>
      <div className="section-row">
        <h2>Open games</h2>
        <button onClick={load}>Refresh</button>
      </div>

      {error && <Notice>{error}</Notice>}
      {loading && <p className="status-message">Loading...</p>}
      {!loading && games.length === 0 && (
        <p className="status-message">No open games</p>
      )}

      {games.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Host</th>
              <th>Board</th>
              <th className="num">Action</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const mine = g.hostId === player.id;
              return (
                <tr key={g.id}>
                  <td>
                    {g.hostName}
                    {mine && " (you)"}
                  </td>
                  <td>
                    {g.gridSize}x{g.gridSize}, {g.shipCount} ships
                  </td>
                  <td className="num">
                    {mine ? (
                      <button onClick={() => onOpen(g.id)}>Open</button>
                    ) : (
                      <Button onClick={() => join(g.id)} loading={joining === g.id}>
                        Join
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

import { useEffect, useState } from "react";
import { api } from "./api";
import { usePlayer, type StoredPlayer } from "./player";
import type { GameCard, GameState, Player } from "./types";
import { joinGame, leaveGame, onGameUpdated, onReconnected } from "./realtime";
import { Button, Card, Notice } from "./components/ui";
import { CreateGameForm } from "./components/CreateGameForm";
import { OpenGames } from "./components/OpenGames";
import { HostWaiting, JoinPanel, WaitingForOpponent } from "./components/phases";
import { PlacementPhase } from "./components/PlacementPhase";
import { BattlePhase, ResultPhase } from "./components/battle";

type Route = {
  name: "login" | "lobby" | "game";
  gameId?: string;
};

function readRoute(): Route {
  const path = window.location.pathname;
  const gameMatch = path.match(/^\/game\/([^/]+)/);
  if (gameMatch) return { name: "game", gameId: gameMatch[1] };
  if (path === "/lobby") return { name: "lobby" };
  return { name: "login" };
}

export default function App() {
  const { player, loaded, save, clear } = usePlayer();
  const [route, setRoute] = useState(readRoute);

  function navigate(path: string) {
    window.history.pushState(null, "", path);
    setRoute(readRoute());
  }

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!player && route.name !== "login") navigate("/");
    if (player && route.name === "login") navigate("/lobby");
  }, [loaded, player, route.name]);

  if (!loaded) {
    return <p className="status-message">Loading...</p>;
  }

  return (
    <>
      <header className="toolbar app-toolbar">
        <button className="brand-button" onClick={() => navigate(player ? "/lobby" : "/")}>
          BattleshipWeb
        </button>
        {player && (
          <div className="toolbar-user">
            <span>{player.displayName}</span>
            <button
              onClick={() => {
                clear();
                navigate("/");
              }}
            >
              Change name
            </button>
          </div>
        )}
      </header>

      <main>
        {route.name === "login" && <Login save={save} goLobby={() => navigate("/lobby")} />}
        {route.name === "lobby" && player && (
          <Lobby player={player} openGame={(id) => navigate(`/game/${id}`)} />
        )}
        {route.name === "game" && route.gameId && player && (
          <GamePage
            key={route.gameId}
            gameId={route.gameId}
            player={player}
            goLobby={() => navigate("/lobby")}
          />
        )}
      </main>
    </>
  );
}

function Login({
  save,
  goLobby,
}: {
  save: (player: StoredPlayer) => void;
  goLobby: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError("");
    try {
      const created = await api.createPlayer(trimmed);
      save({ id: created.id, displayName: created.displayName });
      goLobby();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <section className="login-page">
      <Card className="login-card">
        <h1>Login</h1>
        <div className="form-stack">
          <label>Nickname</label>
          <input
            className="control-field"
            autoFocus
            value={name}
            maxLength={40}
            placeholder="player1"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <Notice>{error}</Notice>}
          <Button onClick={submit} loading={busy} disabled={!name.trim()}>
            Login
          </Button>
        </div>
      </Card>
    </section>
  );
}

function Lobby({
  player,
  openGame,
}: {
  player: StoredPlayer;
  openGame: (id: string) => void;
}) {
  const [stats, setStats] = useState<Player | null>(null);

  useEffect(() => {
    api.getPlayer(player.id).then(setStats).catch(() => {});
  }, [player.id]);

  return (
    <div className="page">
      <div className="page-title-row">
        <h1>Lobby</h1>
        <span>
          {player.displayName} ({stats?.wins ?? 0}W/{stats?.losses ?? 0}L)
        </span>
      </div>
      <div className="two-cols">
        <CreateGameForm playerId={player.id} onCreated={openGame} />
        <OpenGames player={player} onOpen={openGame} />
      </div>
    </div>
  );
}

function GamePage({
  gameId,
  player,
  goLobby,
}: {
  gameId: string;
  player: StoredPlayer;
  goLobby: () => void;
}) {
  const [state, setState] = useState<GameState | null>(null);
  const [card, setCard] = useState<GameCard | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState(false);

  async function load() {
    try {
      const next = normalizeState(await api.state(gameId, player.id));
      setState(next);
      setCard(null);
      setError("");
    } catch (e) {
      if (e instanceof Error && e.message.includes("not part")) {
        try {
          setCard(await api.gameCard(gameId));
          setState(null);
          setError("");
        } catch {
          setError("Game not found");
        }
      } else {
        setError(e instanceof Error ? e.message : "Could not load game");
      }
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    setReady(false);
    setState(null);
    setCard(null);
    setError("");

    joinGame(gameId).catch(() => {});
    load();
    const offUpdate = onGameUpdated((id) => {
      if (id === gameId) load();
    });
    const offReconnect = onReconnected(() => {
      load();
    });
    return () => {
      offUpdate();
      offReconnect();
      leaveGame(gameId).catch(() => {});
    };
  }, [gameId, player.id]);

  async function join() {
    setJoining(true);
    setError("");
    try {
      await api.joinGame(gameId, player.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join");
    } finally {
      setJoining(false);
    }
  }

  if (!ready) return <p className="status-message">Loading...</p>;

  const knownStatus =
    state &&
    (state.status === "WaitingForOpponent" ||
      state.status === "Placing" ||
      state.status === "Active" ||
      state.status === "Finished");

  return (
    <div className="page">
      {error && (
        <Card className="message-card">
          <Notice>{error}</Notice>
          <button onClick={goLobby}>Back to lobby</button>
        </Card>
      )}

      {!error && card && (
        card.status === "WaitingForOpponent" ? (
          <JoinPanel card={card} joining={joining} onJoin={join} />
        ) : (
          <Card className="message-card">
            <p>Game already started without you.</p>
            <button onClick={goLobby}>Back to lobby</button>
          </Card>
        )
      )}

      {!error && state && knownStatus && (
        <>
          {state.status === "WaitingForOpponent" && <HostWaiting state={state} goLobby={goLobby} />}
          {state.status === "Placing" &&
            (state.youPlaced ? (
              <WaitingForOpponent state={state} />
            ) : (
              <PlacementPhase key={`${gameId}-placing`} state={state} player={player} />
            ))}
          {state.status === "Active" && <BattlePhase state={state} player={player} onUpdate={load} />}
          {state.status === "Finished" && (
            <ResultPhase state={state} player={player} goLobby={goLobby} />
          )}
        </>
      )}

      {!error && state && !knownStatus && (
        <Card className="message-card">
          <Notice>Could not show game ({state.status})</Notice>
          <button onClick={() => load()}>Retry</button>
        </Card>
      )}
    </div>
  );
}

function normalizeState(state: GameState): GameState {
  const pickSize = (value: { size?: number; Size?: number }) => value.size ?? value.Size ?? 1;

  return {
    ...state,
    fleet: (state.fleet ?? []).map((ship) => ({ size: pickSize(ship) })),
    myShips: (state.myShips ?? []).map((ship) => ({
      size: pickSize(ship),
      x: ship.x ?? (ship as { X?: number }).X ?? 0,
      y: ship.y ?? (ship as { Y?: number }).Y ?? 0,
      horizontal: ship.horizontal ?? (ship as { Horizontal?: boolean }).Horizontal ?? true,
    })),
    enemyFleet: (state.enemyFleet ?? []).map((ship) => ({
      size: pickSize(ship),
      sunk: ship.sunk ?? (ship as { Sunk?: boolean }).Sunk ?? false,
    })),
  };
}

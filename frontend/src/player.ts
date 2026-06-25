import { useEffect, useState } from "react";

const KEY = "battleshipweb.player";

export type StoredPlayer = { id: string; displayName: string };

export function readPlayer(): StoredPlayer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredPlayer) : null;
  } catch {
    return null;
  }
}

export function usePlayer() {
  const [player, setPlayer] = useState<StoredPlayer | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPlayer(readPlayer());
    setLoaded(true);
  }, []);

  function save(p: StoredPlayer) {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    setPlayer(p);
  }

  function clear() {
    window.localStorage.removeItem(KEY);
    setPlayer(null);
  }

  return { player, loaded, save, clear };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { ClientGameState } from "@/lib/types";

let globalSocket: Socket | null = null;

export function useSocket() {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    if (!globalSocket) {
      globalSocket = io({
        path: "/api/socket.io",
        transports: ["websocket"],   // skip HTTP polling upgrade — direct WS, zero extra round-trip
        upgrade: false,              // stay on WebSocket, never downgrade
        reconnectionDelay: 300,      // retry in 300ms instead of default 1s
        reconnectionDelayMax: 1500,  // cap at 1.5s instead of default 5s
        timeout: 5000,               // fail fast if server unreachable
      });
    }

    const s = globalSocket;

    function onConnect() {
      setIsConnected(true);
      setSocketId(s.id || null);
      setError(null);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onGameState(state: ClientGameState) {
      setGameState(state);
    }

    function onError(err: { message: string }) {
      setError(err.message);
      // Auto-clear error after 5s
      setTimeout(() => setError(null), 5000);
    }

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("gameState", onGameState);
    s.on("error", onError);

    if (s.connected) {
      onConnect();
    }

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("gameState", onGameState);
      s.off("error", onError);
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    globalSocket?.emit("createRoom", { playerName });
  }, []);

  const joinRoom = useCallback((playerName: string, code: string) => {
    globalSocket?.emit("joinRoom", { playerName, code });
  }, []);

  const rejoinRoom = useCallback((code: string) => {
    globalSocket?.emit("rejoinRoom", { code });
  }, []);

  const startGame = useCallback(() => {
    globalSocket?.emit("startGame");
  }, []);

  const revealDone = useCallback(() => {
    globalSocket?.emit("revealDone");
  }, []);

  const castVote = useCallback((targetId: string) => {
    globalSocket?.emit("castVote", { targetId });
  }, []);

  const endVoting = useCallback(() => {
    globalSocket?.emit("endVoting");
  }, []);

  const startVote = useCallback(() => {
    globalSocket?.emit("startVote");
  }, []);

  const nightAction = useCallback((targetId: string) => {
    globalSocket?.emit("nightAction", { targetId });
  }, []);

  const advanceNight = useCallback(() => {
    globalSocket?.emit("advanceNight");
  }, []);

  const advanceDawn = useCallback(() => {
    globalSocket?.emit("advanceDawn");
  }, []);

  const resetGame = useCallback(() => {
    globalSocket?.emit("resetGame");
  }, []);

  return {
    socket: globalSocket,
    socketId,
    isConnected,
    gameState,
    error,
    actions: {
      createRoom,
      joinRoom,
      rejoinRoom,
      startGame,
      revealDone,
      castVote,
      endVoting,
      startVote,
      nightAction,
      advanceNight,
      advanceDawn,
      resetGame,
    },
  };
}

import type { Server, Socket } from "socket.io";
import {
  rooms,
  playerToRoom,
  createRoom,
  joinRoom,
  rejoinRoom,
  startGame,
  advanceReveal,
  castVote,
  resolveVote,
  startNightPhase,
  setNightAction,
  advanceNightPhase,
  checkWinCondition,
  endGame,
  disconnectPlayer,
  getClientState,
  startDayPhase,
} from "./gameLogic.js";

function broadcastRoom(io: Server, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  for (const player of room.players) {
    const state = getClientState(room, player.id);
    io.to(player.id).emit("gameState", state);
  }
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    const playerId = socket.id;
    socket.join(playerId);

    socket.on("createRoom", ({ playerName }: { playerName: string }) => {
      if (!playerName?.trim()) return;
      const room = createRoom(playerId, playerName.trim());
      socket.join(`room:${room.code}`);
      broadcastRoom(io, room.code);
    });

    socket.on("joinRoom", ({ playerName, code }: { playerName: string; code: string }) => {
      if (!playerName?.trim() || !code?.trim()) return;
      const room = joinRoom(playerId, playerName.trim(), code.trim());
      if (!room) {
        socket.emit("error", { message: "Could not join room. Check the code or room may be full/started." });
        return;
      }
      socket.join(`room:${room.code}`);
      broadcastRoom(io, room.code);
    });

    socket.on("rejoinRoom", ({ code }: { code: string }) => {
      const room = rejoinRoom(playerId, code);
      if (!room) {
        socket.emit("error", { message: "Could not rejoin room." });
        return;
      }
      socket.join(`room:${room.code}`);
      broadcastRoom(io, room.code);
    });

    socket.on("startGame", () => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.hostId !== playerId) return;
      const ok = startGame(room);
      if (!ok) {
        socket.emit("error", { message: "Need at least 4 players to start." });
        return;
      }
      broadcastRoom(io, code);
    });

    socket.on("revealDone", () => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "roleReveal") return;
      const currentRevealId = room.revealQueue[room.currentRevealIndex];
      if (currentRevealId !== playerId) return;
      advanceReveal(room);
      broadcastRoom(io, code);
    });

    socket.on("castVote", ({ targetId }: { targetId: string }) => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.phase !== "vote") return;
      castVote(room, playerId, targetId);
      broadcastRoom(io, code);
    });

    socket.on("endVoting", () => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.hostId !== playerId || room.phase !== "vote") return;
      const { eliminated } = resolveVote(room);
      const winner = checkWinCondition(room);
      if (winner) {
        endGame(room, winner);
      } else {
        startNightPhase(room);
      }
      broadcastRoom(io, code);
    });

    socket.on("startVote", () => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.hostId !== playerId || room.phase !== "day") return;
      room.phase = "vote";
      room.votes = {};
      room.timerEnd = undefined;
      broadcastRoom(io, code);
    });

    socket.on("nightAction", ({ targetId }: { targetId: string }) => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      const isNightPhase = ["mafia", "doctor", "detective"].includes(room.phase);
      if (!isNightPhase) return;
      setNightAction(room, playerId, targetId);
      broadcastRoom(io, code);
    });

    socket.on("advanceNight", () => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.hostId !== playerId) return;
      const isNightPhase = ["mafia", "doctor", "detective"].includes(room.phase);
      if (!isNightPhase) return;
      advanceNightPhase(room);
      broadcastRoom(io, code);
    });

    socket.on("advanceDawn", () => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.hostId !== playerId || room.phase !== "dawn") return;
      const winner = checkWinCondition(room);
      if (winner) {
        endGame(room, winner);
      } else {
        room.round++;
        startDayPhase(room);
      }
      broadcastRoom(io, code);
    });

    socket.on("resetGame", () => {
      const code = playerToRoom.get(playerId);
      if (!code) return;
      const room = rooms.get(code);
      if (!room || room.hostId !== playerId) return;
      room.phase = "lobby";
      room.round = 0;
      room.votes = {};
      room.nightActions = {};
      room.winner = undefined;
      room.timerEnd = undefined;
      room.revealQueue = [];
      room.currentRevealIndex = 0;
      room.players.forEach(p => {
        p.alive = true;
        p.role = undefined;
      });
      room.log = [{ id: "reset", message: "Game reset. Ready to play again!", type: "system", timestamp: Date.now() }];
      broadcastRoom(io, code);
    });

    socket.on("disconnect", () => {
      const room = disconnectPlayer(playerId);
      if (room) {
        broadcastRoom(io, room.code);
      }
    });
  });
}

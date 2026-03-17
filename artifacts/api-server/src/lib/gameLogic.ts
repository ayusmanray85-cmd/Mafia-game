import { nanoid } from "nanoid";
import type { Room, Player, Role, Phase, LogEntry, ClientGameState, ClientPlayer } from "./gameTypes.js";

export const rooms = new Map<string, Room>();
export const playerToRoom = new Map<string, string>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateUniqueCode(): string {
  let code = generateCode();
  while (rooms.has(code)) {
    code = generateCode();
  }
  return code;
}

export function createRoom(hostId: string, hostName: string): Room {
  const code = generateUniqueCode();
  const room: Room = {
    code,
    hostId,
    players: [{ id: hostId, name: hostName, alive: true, connected: true }],
    phase: "lobby",
    round: 0,
    votes: {},
    nightActions: {},
    log: [{ id: nanoid(), message: `Room ${code} created. Waiting for players...`, type: "system", timestamp: Date.now() }],
    revealQueue: [],
    currentRevealIndex: 0,
  };
  rooms.set(code, room);
  playerToRoom.set(hostId, code);
  return room;
}

export function joinRoom(playerId: string, playerName: string, code: string): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (room.phase !== "lobby") return null;
  if (room.players.length >= 12) return null;

  const existing = room.players.find(p => p.id === playerId);
  if (existing) {
    existing.connected = true;
    return room;
  }

  const nameTaken = room.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
  if (nameTaken) return null;

  room.players.push({ id: playerId, name: playerName, alive: true, connected: true });
  playerToRoom.set(playerId, code.toUpperCase());
  room.log.push({ id: nanoid(), message: `${playerName} joined the room.`, type: "info", timestamp: Date.now() });
  return room;
}

export function rejoinRoom(playerId: string, code: string): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;
  player.connected = true;
  playerToRoom.set(playerId, code.toUpperCase());
  return room;
}

export function assignRoles(players: Player[]): void {
  const count = players.length;
  const roles: Role[] = [];

  const mafiaCount = count >= 7 ? 2 : 1;
  for (let i = 0; i < mafiaCount; i++) roles.push("mafia");
  roles.push("doctor");
  roles.push("detective");
  while (roles.length < count) roles.push("villager");

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  players.forEach((p, i) => { p.role = roles[i]; });
}

export function startGame(room: Room): boolean {
  if (room.players.length < 4) return false;
  if (room.phase !== "lobby") return false;

  room.players.forEach(p => { p.alive = true; });
  assignRoles(room.players);
  room.phase = "roleReveal";
  room.round = 1;
  room.votes = {};
  room.nightActions = {};
  room.revealQueue = room.players.map(p => p.id);
  room.currentRevealIndex = 0;
  room.log.push({ id: nanoid(), message: "The game has begun. Roles have been assigned.", type: "system", timestamp: Date.now() });
  return true;
}

export function advanceReveal(room: Room): void {
  if (room.currentRevealIndex < room.revealQueue.length - 1) {
    room.currentRevealIndex++;
  } else {
    startDayPhase(room);
  }
}

export function startDayPhase(room: Room): void {
  room.phase = "day";
  room.votes = {};
  room.timerEnd = Date.now() + 2 * 60 * 1000;
  room.log.push({ id: nanoid(), message: `Day ${room.round}: The town wakes up. Discuss and find the Mafia!`, type: "info", timestamp: Date.now() });
}

export function castVote(room: Room, voterId: string, targetId: string): void {
  const voter = room.players.find(p => p.id === voterId);
  const target = room.players.find(p => p.id === targetId);
  if (!voter || !voter.alive) return;
  if (!target || !target.alive) return;
  room.votes[voterId] = targetId;
}

export function resolveVote(room: Room): { eliminated?: Player; tied: boolean } {
  const alivePlayers = room.players.filter(p => p.alive);
  const tally: Record<string, number> = {};

  for (const targetId of Object.values(room.votes)) {
    tally[targetId] = (tally[targetId] || 0) + 1;
  }

  let maxVotes = 0;
  let topCandidates: string[] = [];
  for (const [pid, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      topCandidates = [pid];
    } else if (count === maxVotes) {
      topCandidates.push(pid);
    }
  }

  if (topCandidates.length === 0 || maxVotes === 0) {
    room.log.push({ id: nanoid(), message: "No votes cast. No one is eliminated.", type: "vote", timestamp: Date.now() });
    return { tied: false };
  }

  if (topCandidates.length > 1) {
    const randomWinner = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    topCandidates = [randomWinner];
    room.log.push({ id: nanoid(), message: "It's a tie! Random elimination selected.", type: "vote", timestamp: Date.now() });
  }

  const eliminated = room.players.find(p => p.id === topCandidates[0]);
  if (eliminated) {
    eliminated.alive = false;
    room.log.push({
      id: nanoid(),
      message: `${eliminated.name} was eliminated by the town. They were a ${eliminated.role?.toUpperCase()}.`,
      type: "death",
      timestamp: Date.now()
    });
  }

  return { eliminated, tied: false };
}

export function startNightPhase(room: Room): void {
  room.phase = "mafia";
  room.nightActions = {};
  room.timerEnd = undefined;
  room.log.push({ id: nanoid(), message: `Night ${room.round}: The town falls asleep...`, type: "info", timestamp: Date.now() });
}

export function setNightAction(room: Room, playerId: string, targetId: string): boolean {
  const actor = room.players.find(p => p.id === playerId);
  if (!actor || !actor.alive) return false;
  const target = room.players.find(p => p.id === targetId);
  if (!target || !target.alive) return false;

  if (actor.role === "mafia") {
    room.nightActions.mafiaTarget = targetId;
    return true;
  }
  if (actor.role === "doctor") {
    room.nightActions.doctorTarget = targetId;
    return true;
  }
  if (actor.role === "detective") {
    room.nightActions.detectiveTarget = targetId;
    room.nightActions.detectiveResult = actor.role === "detective"
      ? target.role === "mafia"
      : undefined;
    return true;
  }
  return false;
}

export function advanceNightPhase(room: Room): void {
  if (room.phase === "mafia") {
    const doctor = room.players.find(p => p.role === "doctor" && p.alive);
    room.phase = doctor ? "doctor" : "detective";
  } else if (room.phase === "doctor") {
    const detective = room.players.find(p => p.role === "detective" && p.alive);
    room.phase = detective ? "detective" : "dawn";
    if (room.phase === "dawn") resolveDawn(room);
  } else if (room.phase === "detective") {
    room.phase = "dawn";
    resolveDawn(room);
  }
}

export function resolveDawn(room: Room): void {
  const { mafiaTarget, doctorTarget } = room.nightActions;

  if (mafiaTarget && mafiaTarget !== doctorTarget) {
    const victim = room.players.find(p => p.id === mafiaTarget);
    if (victim) {
      victim.alive = false;
      room.log.push({ id: nanoid(), message: `${victim.name} was killed during the night.`, type: "death", timestamp: Date.now() });
    }
  } else if (mafiaTarget && mafiaTarget === doctorTarget) {
    const saved = room.players.find(p => p.id === mafiaTarget);
    room.log.push({ id: nanoid(), message: `The doctor saved someone last night. No one died!`, type: "info", timestamp: Date.now() });
  } else {
    room.log.push({ id: nanoid(), message: "The night passed quietly. No one died.", type: "info", timestamp: Date.now() });
  }
}

export function checkWinCondition(room: Room): "mafia" | "villagers" | null {
  const alivePlayers = room.players.filter(p => p.alive);
  const aliveMafia = alivePlayers.filter(p => p.role === "mafia");
  const aliveVillagers = alivePlayers.filter(p => p.role !== "mafia");

  if (aliveMafia.length === 0) return "villagers";
  if (aliveMafia.length >= aliveVillagers.length) return "mafia";
  return null;
}

export function endGame(room: Room, winner: "mafia" | "villagers"): void {
  room.phase = "ended";
  room.winner = winner;
  room.timerEnd = undefined;
  if (winner === "villagers") {
    room.log.push({ id: nanoid(), message: "The villagers have won! All Mafia members are eliminated.", type: "win", timestamp: Date.now() });
  } else {
    room.log.push({ id: nanoid(), message: "The Mafia has won! They now outnumber the innocent.", type: "win", timestamp: Date.now() });
  }
}

export function getClientState(room: Room, playerId: string): ClientGameState {
  const requestingPlayer = room.players.find(p => p.id === playerId);

  const players: ClientPlayer[] = room.players.map(p => {
    const isSelf = p.id === playerId;
    const isMafiaSeeing = requestingPlayer?.role === "mafia" && p.role === "mafia";
    const shouldRevealRole = isSelf || isMafiaSeeing || room.phase === "ended";

    return {
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: p.connected,
      role: shouldRevealRole ? p.role : undefined,
    };
  });

  const currentRevealPlayerId = room.revealQueue[room.currentRevealIndex];
  const isMyRevealTurn = currentRevealPlayerId === playerId;

  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    players,
    log: room.log,
    winner: room.winner,
    hostId: room.hostId,
    votes: room.votes,
    revealQueue: room.revealQueue,
    currentRevealIndex: room.currentRevealIndex,
    timerEnd: room.timerEnd,
    nightActions: {
      detectiveResult: requestingPlayer?.role === "detective" ? room.nightActions.detectiveResult : undefined,
      mafiaTargetSet: !!room.nightActions.mafiaTarget,
      doctorTargetSet: !!room.nightActions.doctorTarget,
      detectiveTargetSet: !!room.nightActions.detectiveTarget,
    },
  };
}

export function disconnectPlayer(playerId: string): Room | null {
  const code = playerToRoom.get(playerId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.connected = false;
  return room;
}

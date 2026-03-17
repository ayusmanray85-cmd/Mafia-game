export type Role = "mafia" | "doctor" | "detective" | "villager";
export type Phase =
  | "lobby"
  | "roleReveal"
  | "day"
  | "vote"
  | "night"
  | "mafia"
  | "doctor"
  | "detective"
  | "dawn"
  | "ended";

export interface Player {
  id: string;
  name: string;
  role?: Role;
  alive: boolean;
  connected: boolean;
}

export interface LogEntry {
  id: string;
  message: string;
  type: "info" | "death" | "vote" | "system" | "win";
  timestamp: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  round: number;
  votes: Record<string, string>;
  nightActions: {
    mafiaTarget?: string;
    doctorTarget?: string;
    detectiveTarget?: string;
    detectiveResult?: boolean;
  };
  log: LogEntry[];
  winner?: "mafia" | "villagers";
  dayTimer?: ReturnType<typeof setTimeout>;
  revealQueue: string[];
  currentRevealIndex: number;
  timerEnd?: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  alive: boolean;
  connected: boolean;
  role?: Role;
}

export interface ClientGameState {
  code: string;
  phase: Phase;
  round: number;
  players: ClientPlayer[];
  log: LogEntry[];
  winner?: "mafia" | "villagers";
  hostId: string;
  votes: Record<string, string>;
  revealQueue: string[];
  currentRevealIndex: number;
  timerEnd?: number;
  nightActions: {
    detectiveResult?: boolean;
    mafiaTargetSet?: boolean;
    doctorTargetSet?: boolean;
    detectiveTargetSet?: boolean;
  };
}

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

export interface LogEntry {
  id: string;
  message: string;
  type: "info" | "death" | "vote" | "system" | "win";
  timestamp: number;
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

export const ROLE_INFO: Record<Role, { name: string; desc: string; icon: string; color: string }> = {
  mafia: {
    name: "Mafia",
    desc: "Work in the shadows. Kill villagers each night and stay hidden.",
    icon: "🗡️",
    color: "text-mafia",
  },
  doctor: {
    name: "Doctor",
    desc: "Save one player each night from the Mafia's clutches.",
    icon: "🩺",
    color: "text-doctor",
  },
  detective: {
    name: "Detective",
    desc: "Investigate one player per night to learn if they're Mafia.",
    icon: "🔍",
    color: "text-detective",
  },
  villager: {
    name: "Villager",
    desc: "Vote wisely during the day to eliminate the Mafia.",
    icon: "👤",
    color: "text-villager",
  },
};

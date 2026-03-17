/**
 * Mafia Game Integration Test
 * Simulates 4 players: Alice (host), Bob, Charlie, Diana
 * Plays through a complete game loop
 */
import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:80";
const SOCKET_PATH = "/api/socket.io";
const DELAY = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Role = "mafia" | "doctor" | "detective" | "villager";
type Phase =
  | "lobby" | "roleReveal" | "day" | "vote" | "night"
  | "mafia" | "doctor" | "detective" | "dawn" | "ended";

interface Player {
  id: string; name: string; alive: boolean; connected: boolean; role?: Role;
}
interface GameState {
  code: string; phase: Phase; round: number; players: Player[];
  winner?: string; hostId: string; votes: Record<string, string>;
  revealQueue: string[]; currentRevealIndex: number;
  nightActions: { mafiaTargetSet?: boolean; doctorTargetSet?: boolean; detectiveTargetSet?: boolean; detectiveResult?: boolean };
  log: Array<{ message: string; type: string }>;
}

interface TestPlayer {
  name: string; socket: Socket; state: GameState | null; id: string | null;
}

function createPlayer(name: string): TestPlayer {
  const socket = io(SERVER_URL, {
    path: SOCKET_PATH,
    transports: ["websocket"],
    forceNew: true,
  });
  return { name, socket, state: null, id: null };
}

function waitForConnect(player: TestPlayer): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${player.name} connect timeout`)), 5000);
    if (player.socket.connected) {
      player.id = player.socket.id || null;
      clearTimeout(timeout);
      resolve();
      return;
    }
    player.socket.once("connect", () => {
      player.id = player.socket.id || null;
      clearTimeout(timeout);
      resolve();
    });
  });
}

function waitForState(player: TestPlayer, predicate: (s: GameState) => boolean, label: string, timeoutMs = 5000): Promise<GameState> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      player.socket.off("gameState", handler);
      reject(new Error(`Timeout waiting for: ${label} (current phase: ${player.state?.phase})`));
    }, timeoutMs);

    if (player.state && predicate(player.state)) {
      clearTimeout(timeout);
      resolve(player.state);
      return;
    }

    function handler(state: GameState) {
      player.state = state;
      if (predicate(state)) {
        clearTimeout(timeout);
        player.socket.off("gameState", handler);
        resolve(state);
      }
    }
    player.socket.on("gameState", handler);
  });
}

function listenForState(player: TestPlayer) {
  player.socket.on("gameState", (state: GameState) => {
    player.state = state;
  });
  player.socket.on("error", (err: { message: string }) => {
    console.error(`  ❌ [${player.name}] Server error: ${err.message}`);
  });
}

function log(msg: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${msg}`);
  console.log(`${"─".repeat(60)}`);
}

function playerInfo(p: TestPlayer) {
  const myPlayer = p.state?.players.find(pl => pl.id === p.id);
  return `${p.name} [${myPlayer?.role?.toUpperCase() ?? "?"}] (${myPlayer?.alive ? "alive" : "dead"})`;
}

async function runTest() {
  console.log("\n🎭 MAFIA GAME INTEGRATION TEST\n");

  // ── Connect all 4 players ──────────────────────────────────────
  log("Step 1: Connecting 4 players...");
  const alice = createPlayer("Alice");
  const bob = createPlayer("Bob");
  const charlie = createPlayer("Charlie");
  const diana = createPlayer("Diana");
  const allPlayers = [alice, bob, charlie, diana];

  await Promise.all(allPlayers.map(waitForConnect));
  allPlayers.forEach(listenForState);
  console.log("  ✅ All 4 players connected");
  allPlayers.forEach(p => console.log(`     ${p.name}: socketId=${p.id}`));

  // ── Alice creates a room ───────────────────────────────────────
  log("Step 2: Alice creates a room...");
  alice.socket.emit("createRoom", { playerName: "Alice" });
  const aliceLobbyState = await waitForState(alice, s => s.phase === "lobby" && s.players.length === 1, "Alice in lobby");
  const roomCode = aliceLobbyState.code;
  console.log(`  ✅ Room created: ${roomCode}`);

  // ── Bob, Charlie, Diana join ───────────────────────────────────
  log("Step 3: Bob, Charlie, Diana join the room...");
  bob.socket.emit("joinRoom", { playerName: "Bob", code: roomCode });
  charlie.socket.emit("joinRoom", { playerName: "Charlie", code: roomCode });
  diana.socket.emit("joinRoom", { playerName: "Diana", code: roomCode });

  await waitForState(alice, s => s.players.length === 4, "4 players in room");
  console.log("  ✅ All 4 players in lobby");
  console.log(`     Players: ${alice.state!.players.map(p => p.name).join(", ")}`);

  // ── Alice starts the game ──────────────────────────────────────
  log("Step 4: Alice starts the game...");
  alice.socket.emit("startGame");
  await waitForState(alice, s => s.phase === "roleReveal", "roleReveal phase");
  await Promise.all(allPlayers.map(p => waitForState(p, s => s.phase === "roleReveal", `${p.name} in roleReveal`)));
  console.log("  ✅ Game started — Role Reveal phase");

  // Print roles (alice can see her own role)
  allPlayers.forEach(p => {
    const myPlayer = p.state?.players.find(pl => pl.id === p.id);
    console.log(`     ${p.name}: ${myPlayer?.role?.toUpperCase() ?? "unknown"}`);
  });

  // ── Role Reveal: each player in queue taps "done" ─────────────
  log("Step 5: Each player reveals their role in turn...");
  const revealQueue = alice.state!.revealQueue;
  const playerMap: Record<string, TestPlayer> = {};
  allPlayers.forEach(p => { if (p.id) playerMap[p.id] = p; });

  for (let i = 0; i < revealQueue.length; i++) {
    const pid = revealQueue[i];
    const pl = playerMap[pid];
    if (!pl) { console.log(`  ⚠️  Could not find player for id ${pid}, skipping`); continue; }

    // Wait for this player's turn
    await waitForState(pl, s => s.currentRevealIndex === i && s.phase === "roleReveal", `${pl.name}'s reveal turn`);
    console.log(`     ${pl.name} viewing their role...`);
    await DELAY(200);
    pl.socket.emit("revealDone");
  }

  await waitForState(alice, s => s.phase === "day", "day phase");
  await Promise.all(allPlayers.map(p => waitForState(p, s => s.phase === "day", `${p.name} in day phase`)));
  console.log("  ✅ All roles revealed — Day phase begins");

  // ── Day Discussion → Vote ──────────────────────────────────────
  log("Step 6: Day discussion... then Alice (host) starts voting...");
  await DELAY(500);
  alice.socket.emit("startVote");
  await waitForState(alice, s => s.phase === "vote", "vote phase");
  await Promise.all(allPlayers.map(p => waitForState(p, s => s.phase === "vote", `${p.name} in vote`)));
  console.log("  ✅ Voting phase started");

  // ── Each alive player votes for a target (not themselves) ──────
  log("Step 7: Players vote...");
  for (const player of allPlayers) {
    const state = player.state!;
    const alivePlayers = state.players.filter(p => p.alive && p.id !== player.id);
    if (alivePlayers.length === 0) continue;
    // Vote for the first alive non-self player
    const target = alivePlayers[0];
    console.log(`     ${player.name} votes for ${target.name}`);
    player.socket.emit("castVote", { targetId: target.id });
  }
  await DELAY(300);

  // Check vote tally
  const voteState = alice.state!;
  console.log(`  Vote tally: ${JSON.stringify(voteState.votes)}`);

  // ── Alice ends voting ──────────────────────────────────────────
  log("Step 8: Alice closes the vote...");
  alice.socket.emit("endVoting");
  await waitForState(alice, s => ["mafia", "doctor", "detective", "dawn", "ended"].includes(s.phase), "after vote");
  console.log(`  ✅ Voting resolved. Phase: ${alice.state!.phase}`);

  // Print who was eliminated
  const eliminated = alice.state!.players.find(p => !p.alive);
  if (eliminated) console.log(`  ☠️  ${eliminated.name} was eliminated`);
  else console.log("  No elimination (tie/no votes)");

  if (alice.state!.phase === "ended") {
    console.log(`\n🏆 Game over! Winner: ${alice.state!.winner?.toUpperCase()}`);
    allPlayers.forEach(p => p.socket.disconnect());
    return;
  }

  // ── Night Phases ───────────────────────────────────────────────
  log("Step 9: Night phases begin...");

  // Helper to find alive players excluding self
  const getAliveTargets = (player: TestPlayer) =>
    player.state!.players.filter(p => p.alive && p.id !== player.id);

  // MAFIA phase
  await waitForState(alice, s => s.phase === "mafia", "mafia phase");
  console.log("  🌙 Mafia phase...");
  for (const player of allPlayers) {
    const myPlayer = player.state?.players.find(p => p.id === player.id);
    if (myPlayer?.role === "mafia" && myPlayer.alive) {
      const targets = getAliveTargets(player).filter(p => {
        const pp = player.state!.players.find(x => x.id === p.id);
        return pp?.role !== "mafia";
      });
      if (targets.length > 0) {
        console.log(`     ${player.name} (Mafia) kills ${targets[0].name}`);
        player.socket.emit("nightAction", { targetId: targets[0].id });
      }
    }
  }
  await DELAY(300);
  alice.socket.emit("advanceNight");

  // DOCTOR phase
  await waitForState(alice, s => ["doctor", "detective", "dawn"].includes(s.phase), "after mafia advance");
  if (alice.state!.phase === "doctor") {
    console.log("  🌙 Doctor phase...");
    for (const player of allPlayers) {
      const myPlayer = player.state?.players.find(p => p.id === player.id);
      if (myPlayer?.role === "doctor" && myPlayer.alive) {
        const targets = getAliveTargets(player);
        if (targets.length > 0) {
          console.log(`     ${player.name} (Doctor) saves ${targets[0].name}`);
          player.socket.emit("nightAction", { targetId: targets[0].id });
        }
      }
    }
    await DELAY(300);
    alice.socket.emit("advanceNight");
    await waitForState(alice, s => ["detective", "dawn"].includes(s.phase), "after doctor advance");
  }

  // DETECTIVE phase
  if (alice.state!.phase === "detective") {
    console.log("  🌙 Detective phase...");
    for (const player of allPlayers) {
      const myPlayer = player.state?.players.find(p => p.id === player.id);
      if (myPlayer?.role === "detective" && myPlayer.alive) {
        const targets = getAliveTargets(player);
        if (targets.length > 0) {
          console.log(`     ${player.name} (Detective) investigates ${targets[0].name}`);
          player.socket.emit("nightAction", { targetId: targets[0].id });
          await DELAY(300);
          // Check result
          const detectiveState = player.state!;
          const result = detectiveState.nightActions.detectiveResult;
          console.log(`     Investigation result: ${targets[0].name} is ${result ? "MAFIA 🔪" : "INNOCENT ✅"}`);
        }
      }
    }
    await DELAY(300);
    alice.socket.emit("advanceNight");
    await waitForState(alice, s => s.phase === "dawn", "dawn phase");
  }

  // ── Dawn ───────────────────────────────────────────────────────
  await waitForState(alice, s => s.phase === "dawn", "dawn", 5000);
  console.log("\n  ── DAWN ANNOUNCEMENT ──────────────────────────");
  const lastLogs = alice.state!.log.slice(-3);
  lastLogs.forEach(l => console.log(`  📜 ${l.message}`));

  alice.socket.emit("advanceDawn");
  await waitForState(alice, s => s.phase === "day" || s.phase === "ended", "after dawn", 5000);

  if (alice.state!.phase === "ended") {
    console.log(`\n🏆 Game over! Winner: ${alice.state!.winner?.toUpperCase()}`);
  } else {
    console.log(`\n  ✅ Round 2 begins — Phase: ${alice.state!.phase}`);
    console.log(`  Alive players: ${alice.state!.players.filter(p => p.alive).map(p => p.name).join(", ")}`);
  }

  // Print full game log
  log("GAME LOG:");
  alice.state!.log.forEach(l => console.log(`  [${l.type.toUpperCase().padEnd(7)}] ${l.message}`));

  // Print final player status
  log("FINAL PLAYER STATUS:");
  allPlayers.forEach(p => console.log(`  ${playerInfo(p)}`));

  console.log("\n✅ TEST COMPLETE — All game phases verified successfully\n");

  allPlayers.forEach(p => p.socket.disconnect());
  process.exit(0);
}

runTest().catch(err => {
  console.error("\n❌ TEST FAILED:", err.message);
  process.exit(1);
});

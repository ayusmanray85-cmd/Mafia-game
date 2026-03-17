import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ClientGameState, ROLE_INFO, Role } from "@/lib/types";
import { PlayerCard } from "./PlayerCard";
import { LogPanel } from "./LogPanel";
import confetti from "canvas-confetti";
import { Shield, Target, UserX, Moon, Sun, ArrowRight, Eye } from "lucide-react";

interface PhaseProps {
  gameState: ClientGameState;
  myId: string;
  actions: any;
}

// ---------------- LOBBY ----------------
export function LobbyPhase({ gameState, myId, actions }: PhaseProps) {
  const isHost = gameState.hostId === myId;
  const canStart = gameState.players.length >= 4;

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-2xl text-muted-foreground font-medium uppercase tracking-widest">Room Code</h2>
        <div className="text-6xl md:text-8xl font-display font-black tracking-widest text-primary drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">
          {gameState.code}
        </div>
        <p className="text-foreground/80">Share this code with your friends to join.</p>
      </div>

      <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <AnimatePresence>
          {gameState.players.map((p) => (
            <motion.div
              key={p.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <PlayerCard player={p} isHost={gameState.hostId === p.id} isSelf={p.id === myId} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {isHost ? (
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={actions.startGame}
            disabled={!canStart}
            className="w-64 text-lg"
          >
            Start Game
          </Button>
          {!canStart && <p className="text-sm text-destructive">Need at least 4 players to start.</p>}
        </div>
      ) : (
        <div className="text-center p-6 glass-panel rounded-2xl animate-pulse-slow">
          <p className="text-lg font-medium">Waiting for host to start the game...</p>
        </div>
      )}
    </div>
  );
}

// ---------------- ROLE REVEAL ----------------
export function RoleRevealPhase({ gameState, myId, actions }: PhaseProps) {
  const currentRevealerId = gameState.revealQueue[gameState.currentRevealIndex];
  const currentRevealer = gameState.players.find(p => p.id === currentRevealerId);
  const isMyTurn = currentRevealerId === myId;
  const me = gameState.players.find(p => p.id === myId);
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when turn changes
  useEffect(() => setIsFlipped(false), [currentRevealerId]);

  if (!currentRevealer || !me) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {isMyTurn ? (
        <div className="flex flex-col items-center space-y-8">
          <h2 className="text-3xl font-display text-primary">Your Role</h2>
          
          <div className="perspective-1000 w-64 h-96 cursor-pointer" onClick={() => !isFlipped && setIsFlipped(true)}>
            <motion.div
              className="w-full h-full relative transform-style-3d transition-transform duration-700"
              initial={false}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
            >
              {/* BACK OF CARD */}
              <div className="absolute inset-0 backface-hidden rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <img src={`${import.meta.env.BASE_URL}images/card-back.png`} alt="Card Back" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white/80 font-display text-xl uppercase tracking-widest bg-black/60 px-6 py-2 rounded-full backdrop-blur-sm border border-white/20">
                    Tap to Reveal
                  </span>
                </div>
              </div>

              {/* FRONT OF CARD */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-card border-2 border-primary/50 shadow-[0_0_30px_rgba(234,179,8,0.15)] p-6 flex flex-col items-center justify-center text-center">
                {me.role && (
                  <>
                    <div className="text-7xl mb-6 filter drop-shadow-lg">{ROLE_INFO[me.role].icon}</div>
                    <h3 className={`text-3xl font-display font-bold uppercase tracking-wider mb-4 ${ROLE_INFO[me.role].color}`}>
                      {ROLE_INFO[me.role].name}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {ROLE_INFO[me.role].desc}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {isFlipped && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Button size="lg" onClick={actions.revealDone} className="w-64">
                  Hide & Pass <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto border-2 border-primary/30 candle-glow">
            <Eye className="w-10 h-10 text-primary/70" />
          </div>
          <h2 className="text-3xl font-display">
            <span className="text-primary">{currentRevealer.name}</span> is viewing their role...
          </h2>
          <p className="text-muted-foreground text-lg">Please pass the device or look away.</p>
        </div>
      )}
    </div>
  );
}

// ---------------- DAY PHASE ----------------
export function DayPhase({ gameState, myId, actions }: PhaseProps) {
  const isHost = gameState.hostId === myId;
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!gameState.timerEnd) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((gameState.timerEnd! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) { clearInterval(interval); }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.timerEnd]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-background to-background pointer-events-none" />
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-card/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-4xl font-display font-bold text-primary flex items-center gap-3">
            <Sun className="w-8 h-8 text-amber-500 animate-[spin_10s_linear_infinite]" />
            Day {gameState.round}
          </h2>
          <p className="text-muted-foreground mt-2">Discuss and find the culprits.</p>
        </div>
        
        {gameState.timerEnd && (
          <div className="text-3xl font-mono font-bold bg-background/80 px-6 py-3 rounded-2xl border border-primary/20 candle-glow text-primary">
            {mins}:{secs.toString().padStart(2, "0")}
          </div>
        )}

        {isHost && (
          <Button size="lg" onClick={actions.startVote} className="shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground">
            Begin Voting <Vote className="ml-2 w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {gameState.players.map((p) => (
          <PlayerCard key={p.id} player={p} isHost={gameState.hostId === p.id} isSelf={p.id === myId} />
        ))}
      </div>

      <LogPanel log={gameState.log} />
    </div>
  );
}

// ---------------- VOTE PHASE ----------------
export function VotePhase({ gameState, myId, actions }: PhaseProps) {
  const isHost = gameState.hostId === myId;
  const me = gameState.players.find(p => p.id === myId);
  const myVote = gameState.votes[myId];

  // Count votes
  const voteCounts: Record<string, number> = {};
  Object.values(gameState.votes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });

  const totalVotes = Object.keys(gameState.votes).length;
  const alivePlayersCount = gameState.players.filter(p => p.alive).length;

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-display font-bold text-destructive flex items-center justify-center gap-3">
          <UserX className="w-8 h-8" /> Town Tribunal
        </h2>
        <p className="text-lg text-muted-foreground">
          {me?.alive ? "Select a player to eliminate." : "You are dead. Watch the living cast their votes."}
        </p>
        <div className="inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-full text-sm font-medium">
          <span className="text-primary">{totalVotes}</span> / {alivePlayersCount} Votes Cast
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {gameState.players.map((p) => (
          <PlayerCard 
            key={p.id} 
            player={p} 
            selectable={me?.alive && p.alive}
            selected={myVote === p.id}
            onClick={() => actions.castVote(p.id)}
            voteCount={voteCounts[p.id]}
          />
        ))}
      </div>

      {isHost && (
        <div className="flex justify-center pt-8 border-t border-white/5">
          <Button variant="destructive" size="lg" onClick={actions.endVoting} className="w-full max-w-md">
            Close Voting & Resolve <Skull className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------- NIGHT PHASE (Mafia/Doctor/Detective) ----------------
export function NightPhase({ gameState, myId, actions }: PhaseProps) {
  const isHost = gameState.hostId === myId;
  const me = gameState.players.find(p => p.id === myId);
  const phase = gameState.phase as "mafia" | "doctor" | "detective";
  
  // Is it my turn to act?
  const isMyTurn = me?.alive && me?.role === phase;

  let title = "";
  let desc = "";
  let icon = null;
  let targetId = "";
  let isActionSet = false;

  if (phase === "mafia") {
    title = "Mafia Phase";
    desc = isMyTurn ? "Select a victim." : "The Mafia is choosing their victim...";
    icon = <Target className="w-8 h-8 text-mafia" />;
    targetId = gameState.nightActions.mafiaTargetSet ? "hidden" : ""; // actual target hidden from state
    isActionSet = !!gameState.nightActions.mafiaTargetSet;
  } else if (phase === "doctor") {
    title = "Doctor Phase";
    desc = isMyTurn ? "Select someone to protect." : "The Doctor is visiting a patient...";
    icon = <Shield className="w-8 h-8 text-doctor" />;
    isActionSet = !!gameState.nightActions.doctorTargetSet;
  } else if (phase === "detective") {
    title = "Detective Phase";
    desc = isMyTurn ? "Select someone to investigate." : "The Detective is gathering clues...";
    icon = <SearchIcon className="w-8 h-8 text-detective" />;
    isActionSet = !!gameState.nightActions.detectiveTargetSet;
  }

  // Find who I clicked (stored locally for UI feedback since backend hides it from general state)
  const [localTarget, setLocalTarget] = useState<string | null>(null);

  const handleAction = (id: string) => {
    if (!isMyTurn) return;
    setLocalTarget(id);
    actions.nightAction(id);
  };

  return (
    <div className="space-y-8 animate-in fade-in relative min-h-screen">
      {/* Dark overlay for night */}
      <div className="fixed inset-0 bg-black/90 z-[-1]" />
      
      {/* CSS Stars */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none opacity-50">
        {Array.from({ length: 50 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-4 relative z-10 pt-8">
        <Moon className="w-12 h-12 text-blue-200 mx-auto opacity-80" />
        <h2 className="text-4xl font-display font-bold text-white flex items-center justify-center gap-3">
          {icon} {title}
        </h2>
        <p className="text-xl text-white/70">{desc}</p>
      </div>

      {isMyTurn ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10">
          {gameState.players.map((p) => (
            <PlayerCard 
              key={p.id} 
              player={p} 
              selectable={true}
              selected={localTarget === p.id}
              onClick={() => handleAction(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex justify-center py-12 relative z-10">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {isMyTurn && phase === "detective" && gameState.nightActions.detectiveResult !== undefined && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border-2 border-detective p-6 rounded-2xl max-w-md mx-auto text-center relative z-10"
        >
          <h3 className="text-xl font-bold text-detective mb-2">Investigation Result</h3>
          <p className="text-lg">
            This player is <span className="font-bold text-white">{gameState.nightActions.detectiveResult ? "MAFIA" : "NOT MAFIA"}</span>.
          </p>
        </motion.div>
      )}

      {isHost && (
        <div className="flex justify-center mt-12 relative z-10 pb-8">
          <Button size="lg" onClick={actions.advanceNight} disabled={!isActionSet} className="w-64">
            Next Phase <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// SVG Helper for Detective (Search is not exported from lucide directly by that name in some versions)
function SearchIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  )
}

// ---------------- DAWN PHASE ----------------
export function DawnPhase({ gameState, myId, actions }: PhaseProps) {
  const isHost = gameState.hostId === myId;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000 relative">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,_var(--tw-gradient-stops))] from-amber-900/30 to-background pointer-events-none" />
      
      <div className="text-center space-y-6 pt-12">
        <Sun className="w-16 h-16 text-amber-500 mx-auto" />
        <h2 className="text-5xl font-display font-bold text-white">Dawn Breaks</h2>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">The town wakes up to discover what happened in the shadows.</p>
      </div>

      <LogPanel log={gameState.log} />

      {isHost && (
        <div className="flex justify-center pt-8">
          <Button size="lg" onClick={actions.advanceDawn} className="w-64">
            Start Day <Sun className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------- END SCREEN ----------------
export function EndPhase({ gameState, myId, actions }: PhaseProps) {
  const isHost = gameState.hostId === myId;
  const isMafiaWin = gameState.winner === "mafia";

  useEffect(() => {
    // Fire confetti on load
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const colors = isMafiaWin ? ['#dc2626', '#000000'] : ['#eab308', '#ffffff'];

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [isMafiaWin]);

  return (
    <div className="space-y-12 animate-in zoom-in duration-700">
      <div className="text-center space-y-6 pt-8">
        <h2 className={cn("text-6xl md:text-8xl font-display font-black uppercase tracking-widest", 
          isMafiaWin ? "text-destructive drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]" : "text-primary drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]"
        )}>
          {isMafiaWin ? "Mafia Wins" : "Town Wins"}
        </h2>
        <p className="text-2xl text-muted-foreground">
          {isMafiaWin ? "The shadows have consumed the town." : "The village is safe once more."}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {gameState.players.map((p) => (
          <PlayerCard key={p.id} player={p} showRoleAlways={true} />
        ))}
      </div>

      {isHost && (
        <div className="flex justify-center pb-12">
          <Button size="lg" variant="outline" onClick={actions.resetGame} className="w-64 border-primary text-primary hover:bg-primary/20">
            Play Again
          </Button>
        </div>
      )}
    </div>
  );
}

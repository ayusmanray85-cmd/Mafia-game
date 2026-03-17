import { useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { 
  LobbyPhase, 
  RoleRevealPhase, 
  DayPhase, 
  VotePhase, 
  NightPhase, 
  DawnPhase, 
  EndPhase 
} from "@/components/game/PhaseViews";

export default function Room() {
  const [match, params] = useRoute("/room/:code");
  const [, setLocation] = useLocation();
  const { socket, isConnected, gameState, error, actions, socketId } = useSocket();
  const initialized = useRef(false);

  // Parse query params
  const urlParams = new URLSearchParams(window.location.search);
  const playerName = urlParams.get("name") || "";
  const codeParam = params?.code || "";

  useEffect(() => {
    if (!playerName || !codeParam) {
      setLocation("/");
      return;
    }

    if (isConnected && socketId && !initialized.current) {
      initialized.current = true;
      if (codeParam === "new") {
        actions.createRoom(playerName);
      } else {
        actions.joinRoom(playerName, codeParam);
      }
    }
  }, [isConnected, socketId, playerName, codeParam, actions, setLocation]);

  // Handle URL update if creating a new room
  useEffect(() => {
    if (gameState?.code && codeParam === "new") {
      setLocation(`/room/${gameState.code}?name=${encodeURIComponent(playerName)}`, { replace: true });
    }
  }, [gameState?.code, codeParam, playerName, setLocation]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-xl font-display animate-pulse text-muted-foreground">Connecting to the shadows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Connection Failed</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => setLocation("/")} variant="outline" className="w-full">
            Return to Lobby
          </Button>
        </div>
      </div>
    );
  }

  if (!gameState || !socketId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Render correct phase
  const renderPhase = () => {
    const props = { gameState, myId: socketId, actions };
    switch (gameState.phase) {
      case "lobby": return <LobbyPhase {...props} />;
      case "roleReveal": return <RoleRevealPhase {...props} />;
      case "day": return <DayPhase {...props} />;
      case "vote": return <VotePhase {...props} />;
      case "mafia":
      case "doctor":
      case "detective": return <NightPhase {...props} />;
      case "dawn": return <DawnPhase {...props} />;
      case "ended": return <EndPhase {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen w-full relative">
      {/* Dynamic background handled within phases or globally here */}
      <main className="container mx-auto px-4 py-8 relative z-10 min-h-screen flex flex-col">
        {renderPhase()}
      </main>
    </div>
  );
}

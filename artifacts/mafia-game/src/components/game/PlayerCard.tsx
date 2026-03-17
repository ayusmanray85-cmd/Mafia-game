import { motion } from "framer-motion";
import { ClientPlayer, Role, ROLE_INFO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skull, Crown } from "lucide-react";

interface PlayerCardProps {
  player: ClientPlayer;
  isHost?: boolean;
  isSelf?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  voteCount?: number;
  showRoleAlways?: boolean;
}

export function PlayerCard({
  player,
  isHost,
  isSelf,
  selectable,
  selected,
  onClick,
  voteCount = 0,
  showRoleAlways,
}: PlayerCardProps) {
  const displayRole = showRoleAlways || player.role;
  const roleInfo = displayRole ? ROLE_INFO[displayRole as Role] : null;

  return (
    <motion.button
      whileHover={selectable && player.alive ? { y: -5, scale: 1.02 } : {}}
      whileTap={selectable && player.alive ? { scale: 0.98 } : {}}
      onClick={() => selectable && player.alive && onClick?.()}
      disabled={!selectable || !player.alive}
      className={cn(
        "relative w-full aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-4 transition-all duration-300",
        "border-2",
        !player.alive && "opacity-60 grayscale cursor-not-allowed",
        player.alive && !selectable && "cursor-default",
        selected
          ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
          : "border-border bg-card/80 hover:border-border/80 glass-panel"
      )}
    >
      {/* Status Overlay */}
      {!player.alive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-[1px]">
          <Skull className="w-16 h-16 text-destructive/80 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
        </div>
      )}

      {/* Host Badge */}
      {isHost && (
        <div className="absolute -top-3 -right-3 z-20 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
          <Crown className="w-4 h-4" />
        </div>
      )}

      {/* Vote Counter */}
      {voteCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-3 -left-3 z-20 bg-destructive text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg"
        >
          {voteCount}
        </motion.div>
      )}

      {/* Connection Status */}
      {!player.connected && (
        <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full gap-3">
        {roleInfo ? (
          <div className="text-4xl filter drop-shadow-md">{roleInfo.icon}</div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary border border-white/10 flex items-center justify-center">
            <span className="text-xl font-display text-muted-foreground">{player.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        
        <div className="text-center w-full">
          <p className="font-display font-bold text-lg truncate px-2" title={player.name}>
            {player.name}
            {isSelf && " (You)"}
          </p>
          {roleInfo && (
            <p className={cn("text-xs font-semibold uppercase tracking-wider mt-1", roleInfo.color)}>
              {roleInfo.name}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

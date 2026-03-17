import { useEffect, useRef } from "react";
import { LogEntry } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Vote, Info, AlertTriangle, Trophy } from "lucide-react";

export function LogPanel({ log }: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const getIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "death": return <Skull className="w-4 h-4 text-destructive" />;
      case "vote": return <Vote className="w-4 h-4 text-accent" />;
      case "system": return <AlertTriangle className="w-4 h-4 text-primary" />;
      case "win": return <Trophy className="w-4 h-4 text-amber-400" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 w-full max-w-md mx-auto h-[250px] flex flex-col">
      <h3 className="font-display font-semibold text-primary mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Town Records
      </h3>
      <ScrollArea className="flex-1 pr-4">
        <div className="flex flex-col gap-3 pb-4">
          <AnimatePresence initial={false}>
            {log.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                className="flex items-start gap-3 text-sm"
              >
                <div className="mt-0.5 shrink-0 bg-secondary p-1.5 rounded-md border border-white/5 shadow-sm">
                  {getIcon(entry.type)}
                </div>
                <p className="text-foreground/90 leading-relaxed font-medium pt-1">
                  {entry.message}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

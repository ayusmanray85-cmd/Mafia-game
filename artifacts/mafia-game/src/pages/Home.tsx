import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Skull } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLocation(`/room/new?name=${encodeURIComponent(name)}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLocation(`/room/${code.toUpperCase()}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image Setup */}
      <div 
        className="absolute inset-0 z-[-2] opacity-30 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/gothic-bg.png)` }}
      />
      <div className="absolute inset-0 z-[-1] bg-gradient-to-b from-background/40 via-background/80 to-background" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full glass-panel p-8 rounded-3xl shadow-2xl space-y-8 relative"
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-background rounded-full border-4 border-border flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <Skull className="w-12 h-12 text-primary drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
        </div>

        <div className="text-center pt-8 space-y-2">
          <h1 className="text-5xl font-display font-black tracking-wider text-foreground">MAFIA</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">A Game of Deception</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/80 pl-1">Your Name</label>
            <Input 
              placeholder="Enter your alias..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg"
              maxLength={15}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 bg-black/20 p-1.5 rounded-xl">
            <Button 
              variant={!isJoining ? "secondary" : "ghost"} 
              className="w-full"
              onClick={() => setIsJoining(false)}
            >
              Host Game
            </Button>
            <Button 
              variant={isJoining ? "secondary" : "ghost"} 
              className="w-full"
              onClick={() => setIsJoining(true)}
            >
              Join Game
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!isJoining ? (
              <motion.form 
                key="create"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleCreate}
                className="space-y-4"
              >
                <Button type="submit" size="lg" className="w-full text-lg" disabled={!name.trim()}>
                  Create New Room
                </Button>
              </motion.form>
            ) : (
              <motion.form 
                key="join"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleJoin}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80 pl-1">Room Code</label>
                  <Input 
                    placeholder="e.g. ABCD5" 
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="text-lg font-mono tracking-widest uppercase"
                    maxLength={5}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full text-lg" disabled={!name.trim() || code.length < 5}>
                  Enter Room
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// Mock AnimatePresence to avoid missing import
import { AnimatePresence } from "framer-motion";

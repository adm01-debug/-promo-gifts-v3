import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { useOracleVoiceBridge } from "@/stores/oracleVoiceBridge";

// Lazy-load the heavy dialog — only loads when opened
const ExpertChatDialog = lazy(() =>
  import("./ExpertChatDialog").then(m => ({ default: m.ExpertChatDialog }))
);

interface ExpertChatButtonProps {
  clientId?: string;
  clientName?: string;
}

export const ExpertChatButton = React.forwardRef<HTMLButtonElement, ExpertChatButtonProps>(
  function ExpertChatButton({ clientId, clientName }, ref) {
    const [isOpen, setIsOpen] = useState(false);
    const bridgeOpen = useOracleVoiceBridge((s) => s.isOracleOpen);
    const pendingMessage = useOracleVoiceBridge((s) => s.pendingMessage);
    const closeOracle = useOracleVoiceBridge((s) => s.closeOracle);

    useEffect(() => {
      if (bridgeOpen && !isOpen) {
        setIsOpen(true);
      }
    }, [bridgeOpen, isOpen]);

    const handleClose = () => {
      setIsOpen(false);
      closeOracle();
    };

    return (
      <>
        <motion.button
          ref={ref}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-[6rem] sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl z-40 flex items-center justify-center border border-primary/20 bg-gradient-to-br from-primary/70 to-primary/50 backdrop-blur-sm text-primary-foreground"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Abrir chat com Oráculo IA"
        >
          {/* Pulsing glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <Bot className="h-5 w-5 sm:h-6 sm:w-6 relative z-10" />
          {/* Sparkle accent */}
          <motion.div
            className="absolute -top-0.5 -right-0.5"
            animate={{ rotate: [0, 15, -15, 0], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-3 w-3 text-primary-foreground/80" />
          </motion.div>
        </motion.button>
        
        <AnimatePresence>
          {isOpen && (
            <Suspense fallback={null}>
              <ExpertChatDialog 
                isOpen={isOpen} 
                onClose={handleClose}
                clientId={clientId}
                clientName={clientName}
                initialMessage={pendingMessage}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </>
    );
  }
);

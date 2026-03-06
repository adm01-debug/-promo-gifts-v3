import React, { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpertChatDialog } from "./ExpertChatDialog";

interface ExpertChatButtonProps {
  clientId?: string;
  clientName?: string;
}

export const ExpertChatButton = React.forwardRef<HTMLButtonElement, ExpertChatButtonProps>(
  function ExpertChatButton({ clientId, clientName }, ref) {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button
          ref={ref}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-[6rem] sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-xl bg-primary/60 hover:bg-primary/80 z-40"
          size="icon"
          aria-label="Abrir chat com Oráculo IA"
        >
          <Bot className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
        
        <ExpertChatDialog 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)}
          clientId={clientId}
          clientName={clientName}
        />
      </>
    );
  }
);

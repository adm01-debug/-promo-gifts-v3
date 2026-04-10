import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bot, X, Send, Loader2, User, Sparkles, ExternalLink, History, Plus, Trash2, MessageSquare, Filter, ChevronDown, DollarSign, Layers, Volume2, VolumeX, Pause, Play, Mic, Copy, Check, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useExpertConversations, ExpertMessage, ExpertConversation } from "@/hooks/useExpertConversations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  isError?: boolean;
}

interface ProductLink {
  id: string;
  name: string;
  fullMatch: string;
}

interface PriceRange {
  label: string;
  min: number | null;
  max: number | null;
}

const PRICE_RANGES: PriceRange[] = [
  { label: "Até R$ 20", min: null, max: 20 },
  { label: "R$ 20 - R$ 50", min: 20, max: 50 },
  { label: "R$ 50 - R$ 100", min: 50, max: 100 },
  { label: "R$ 100 - R$ 200", min: 100, max: 200 },
  { label: "Acima de R$ 200", min: 200, max: null },
];

interface ExpertChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  initialMessage?: string | null;
}

export function ExpertChatDialog({ isOpen, onClose, clientId, clientName, initialMessage }: ExpertChatDialogProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingTtsId, setPlayingTtsId] = useState<string | null>(null);
  const [pausedTtsId, setPausedTtsId] = useState<string | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);
  const [isFromVoice, setIsFromVoice] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const ttsStopRef = useRef<(() => void) | null>(null);
  const ttsPauseRef = useRef<(() => void) | null>(null);
  const ttsResumeRef = useRef<(() => void) | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    conversations,
    isLoading: isLoadingConversations,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    fetchMessages,
    saveMessage,
  } = useExpertConversations(clientId);

  // Fetch categories and materials from Promobrind
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchFilters = async () => {
      try {
        const { fetchPromobrindProducts } = await import('@/lib/external-db');
        if (cancelled) return;
        const productsData = await fetchPromobrindProducts({ limit: 500 });
        if (cancelled) return;

        const uniqueCategories = [...new Set(
          productsData.map(p => p.category_name).filter(Boolean)
        )] as string[];
        setCategories(uniqueCategories.sort());

        const allMaterials = productsData.flatMap(p => p.materials || []).filter(Boolean);
        const uniqueMaterials = [...new Set(allMaterials)] as string[];
        setMaterials(uniqueMaterials.sort());
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };

    fetchFilters();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Parse product links from message content
  const parseProductLinks = (content: string): (string | ProductLink)[] => {
    const regex = /\[\[PRODUTO:([^:]+):([^\]]+)\]\]/g;
    const parts: (string | ProductLink)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      parts.push({
        id: match[1],
        name: match[2],
        fullMatch: match[0]
      });
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : [content];
  };

  const handleProductClick = (productId: string) => {
    onClose();
    navigate(`/produto/${productId}`);
  };

  const renderMessageContent = (content: string) => {
    const parts = parseProductLinks(content);
    
    return parts.map((part, index) => {
      if (typeof part === "string") {
        return <span key={`text-${index}`}>{part}</span>;
      }
      
      return (
        <button
          key={`product-${part.id}-${index}`}
          onClick={() => handleProductClick(part.id)}
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors"
        >
          {part.name}
          <ExternalLink className="h-3 w-3" />
        </button>
      );
    });
  };

  // Smooth auto-scroll
  useEffect(() => {
    if (scrollRef.current && !showScrollDown) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, showScrollDown]);

  // Track scroll position to show/hide scroll-down button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 80);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      setShowScrollDown(false);
    }
  }, []);

  // Copy message to clipboard
  const handleCopy = useCallback(async (msgId: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current && !showHistory) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showHistory]);

  // Reset state when dialog closes or client changes
  useEffect(() => {
    if (!isOpen) {
      setShowHistory(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
    setSelectedCategory(null);
    setSelectedPriceRange(null);
    setSelectedMaterial(null);
  }, [clientId]);

  // Auto-send initial message from voice bridge
  const initialMessageSentRef = useRef(false);
  useEffect(() => {
    if (isOpen && initialMessage && !initialMessageSentRef.current && !isLoading) {
      initialMessageSentRef.current = true;
      setIsFromVoice(true);
      setInput(initialMessage);
      // Trigger send after state update
      setTimeout(() => {
        const sendBtn = document.querySelector('[data-oracle-send]') as HTMLButtonElement;
        sendBtn?.click();
      }, 200);
    }
    if (!isOpen) {
      initialMessageSentRef.current = false;
      setIsFromVoice(false);
    }
  }, [isOpen, initialMessage, isLoading]);

  // TTS playback for assistant messages
  const handlePlayTts = useCallback(async (messageId: string, text: string) => {
    // If paused on same message, resume
    if (pausedTtsId === messageId && ttsResumeRef.current) {
      ttsResumeRef.current();
      setPausedTtsId(null);
      setPlayingTtsId(messageId);
      return;
    }

    // Stop current playback if any
    if (ttsStopRef.current) {
      ttsStopRef.current();
      ttsStopRef.current = null;
      ttsPauseRef.current = null;
      ttsResumeRef.current = null;
      if (playingTtsId === messageId) {
        setPlayingTtsId(null);
        setPausedTtsId(null);
        return; // Toggle off
      }
    }

    setPausedTtsId(null);
    setLoadingTtsId(messageId);
    try {
      const { playTtsAudio } = await import("@/hooks/voice/playTtsAudio");
      const { promise, stop, pause, resume } = playTtsAudio(text, {
        onStart: () => {
          setLoadingTtsId(null);
          setPlayingTtsId(messageId);
        },
      });
      ttsStopRef.current = stop;
      ttsPauseRef.current = pause;
      ttsResumeRef.current = resume;
      await promise;
    } catch (err) {
      console.warn("[Oracle TTS] Playback failed:", err);
    } finally {
      setPlayingTtsId(null);
      setPausedTtsId(null);
      setLoadingTtsId(null);
      ttsStopRef.current = null;
      ttsPauseRef.current = null;
      ttsResumeRef.current = null;
    }
  }, [playingTtsId, pausedTtsId]);

  const handlePauseTts = useCallback((messageId: string) => {
    if (ttsPauseRef.current && playingTtsId === messageId) {
      ttsPauseRef.current();
      setPlayingTtsId(null);
      setPausedTtsId(messageId);
    }
  }, [playingTtsId]);

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
  };

  const loadConversation = async (conversation: ExpertConversation) => {
    const loadedMessages = await fetchMessages(conversation.id);
    setMessages(loadedMessages.map(m => ({ id: m.id, role: m.role, content: m.content })));
    setCurrentConversationId(conversation.id);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    await deleteConversation(conversationId);
    if (currentConversationId === conversationId) {
      startNewConversation();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Create new conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
      convId = await createConversation(title);
      if (convId) {
        setCurrentConversationId(convId);
      }
    }

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: "user", content: userMessage, timestamp: Date.now() }]);
    setIsLoading(true);

    // Save user message
    if (convId) {
      await saveMessage(convId, "user", userMessage);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: "user", content: userMessage }]
              .map(m => ({ role: m.role, content: m.content }))
              .filter(m => m.content && m.content.length > 0),
            clientId: clientId || undefined,
            categoryFilter: selectedCategory || undefined,
            priceMin: selectedPriceRange?.min ?? undefined,
            priceMax: selectedPriceRange?.max ?? undefined,
            materialFilter: selectedMaterial || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao conectar com o Oráculo");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: "assistant", content: "", timestamp: Date.now() }]);

      if (reader) {
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[newMessages.length - 1]?.role === "assistant") {
                    newMessages[newMessages.length - 1].content = assistantMessage;
                  }
                  return newMessages;
                });
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }

      // Save assistant message
      if (convId && assistantMessage) {
        await saveMessage(convId, "assistant", assistantMessage);
      }

    } catch (error) {
      console.error("Expert chat error:", error);
      const errorMessage = error instanceof Error 
        ? `Desculpe, ocorreu um erro: ${error.message}` 
        : "Desculpe, ocorreu um erro ao processar sua mensagem.";
      
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: "assistant", content: errorMessage, timestamp: Date.now(), isError: true }]);
      
      if (convId) {
        await saveMessage(convId, "assistant", errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeFiltersCount = [selectedCategory, selectedPriceRange, selectedMaterial].filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] h-[640px] flex flex-col p-0 gap-0 rounded-3xl overflow-hidden border-border/50 shadow-xl [&>button.absolute]:hidden">
        {/* ─── HEADER ─── */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-[1.5px] border-background" />
              </div>
              <div>
                <DialogTitle className="text-base font-display font-semibold tracking-tight flex items-center gap-1.5">
                  Oráculo
                  <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground/70 leading-none mt-0.5">
                  Consultor de Produtos IA
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Filters dropdown - collapsed into single button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 rounded-xl",
                      activeFiltersCount > 0 && "text-primary bg-primary/10"
                    )}
                    title="Filtros"
                  >
                    <Filter className="h-4 w-4" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Filtros</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Price ranges */}
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-normal">Preço</DropdownMenuLabel>
                  {selectedPriceRange && (
                    <DropdownMenuItem onClick={() => setSelectedPriceRange(null)} className="text-xs">
                      <span className="text-muted-foreground">✕ Limpar preço</span>
                    </DropdownMenuItem>
                  )}
                  {PRICE_RANGES.map((range) => (
                    <DropdownMenuItem
                      key={range.label}
                      onClick={() => setSelectedPriceRange(range)}
                      className={cn("text-xs", selectedPriceRange?.label === range.label && "bg-primary/10 text-primary")}
                    >
                      <DollarSign className="h-3 w-3 mr-1.5 opacity-50" />
                      {range.label}
                    </DropdownMenuItem>
                  ))}

                  {categories.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-normal">Categoria</DropdownMenuLabel>
                      {selectedCategory && (
                        <DropdownMenuItem onClick={() => setSelectedCategory(null)} className="text-xs">
                          <span className="text-muted-foreground">✕ Limpar categoria</span>
                        </DropdownMenuItem>
                      )}
                      {categories.slice(0, 10).map((category) => (
                        <DropdownMenuItem
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={cn("text-xs", selectedCategory === category && "bg-primary/10 text-primary")}
                        >
                          {category}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {materials.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-normal">Material</DropdownMenuLabel>
                      {selectedMaterial && (
                        <DropdownMenuItem onClick={() => setSelectedMaterial(null)} className="text-xs">
                          <span className="text-muted-foreground">✕ Limpar material</span>
                        </DropdownMenuItem>
                      )}
                      {materials.slice(0, 10).map((material) => (
                        <DropdownMenuItem
                          key={material}
                          onClick={() => setSelectedMaterial(material)}
                          className={cn("text-xs", selectedMaterial === material && "bg-primary/10 text-primary")}
                        >
                          <Layers className="h-3 w-3 mr-1.5 opacity-50" />
                          {material}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="h-8 w-8 p-0 rounded-xl"
                title={showHistory ? "Voltar ao chat" : "Histórico"}
                aria-label="Histórico"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                className="h-8 w-8 p-0 rounded-xl"
                title="Nova conversa"
                aria-label="Nova conversa"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-xl"
                title="Fechar"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active filters badges */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {selectedPriceRange && (
                <Badge
                  variant="secondary"
                  className="text-[10px] rounded-lg px-2 py-0.5 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => setSelectedPriceRange(null)}
                >
                  <DollarSign className="h-2.5 w-2.5" />
                  {selectedPriceRange.label}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {selectedCategory && (
                <Badge
                  variant="secondary"
                  className="text-[10px] rounded-lg px-2 py-0.5 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => setSelectedCategory(null)}
                >
                  {selectedCategory}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {selectedMaterial && (
                <Badge
                  variant="secondary"
                  className="text-[10px] rounded-lg px-2 py-0.5 gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => setSelectedMaterial(null)}
                >
                  <Layers className="h-2.5 w-2.5" />
                  {selectedMaterial}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>
          )}

          {clientName && (
            <div className="mt-2">
              <Badge variant="outline" className="text-[10px] rounded-lg font-normal text-muted-foreground">
                Cliente: {clientName}
              </Badge>
            </div>
          )}
        </DialogHeader>

        {showHistory ? (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider px-1 mb-3">
                Conversas anteriores
              </p>
              {isLoadingConversations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground/60">Nenhuma conversa ainda</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className={cn(
                      "group px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150",
                      currentConversationId === conv.id
                        ? "bg-primary/8 border border-primary/15"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                          {formatDistanceToNow(new Date(conv.updated_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-3 relative" ref={scrollRef} onScrollCapture={handleScroll}>
              <div className="space-y-3">
                {/* ─── EMPTY STATE ─── */}
                {messages.length === 0 && !isFromVoice && (
                  <div className="flex flex-col items-center justify-center py-10 px-2">
                    {/* Avatar */}
                    <div className="relative mb-5">
                      <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center border border-primary/10">
                        <Bot className="h-8 w-8 text-primary/70" />
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-lg bg-background border border-border/50 flex items-center justify-center shadow-sm">
                        <Sparkles className="h-3 w-3 text-primary/60" />
                      </div>
                    </div>

                    <h3 className="font-display text-lg font-semibold tracking-tight mb-1">
                      Olá! Sou o Oráculo
                    </h3>
                    <p className="text-[13px] text-muted-foreground/70 text-center max-w-[240px] leading-relaxed">
                      {clientId 
                        ? `Posso ajudar a encontrar os melhores produtos para ${clientName || "este cliente"}.`
                        : "Posso ajudar a encontrar os melhores produtos para seus clientes."
                      }
                    </p>

                    {/* Suggestion chips */}
                    <div className="mt-5 flex flex-wrap gap-2 justify-center">
                      {[
                        { emoji: "✨", label: "Recomendações", prompt: "Quais produtos você recomenda para este cliente?" },
                        { emoji: "🎁", label: "Datas comemorativas", prompt: "Sugira produtos para datas comemorativas" },
                        { emoji: "🎨", label: "Cores da marca", prompt: "Produtos que combinam com as cores da marca" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => setInput(item.prompt)}
                          className="group/chip flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-border/50 bg-background hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                        >
                          <span>{item.emoji}</span>
                          <span className="text-foreground/80 group-hover/chip:text-foreground">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {conversations.length > 0 && (
                      <button
                        onClick={() => setShowHistory(true)}
                        className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors"
                      >
                        <History className="h-3 w-3" />
                        Ver conversas anteriores ({conversations.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Voice command loading → messages crossfade */}
                <AnimatePresence mode="wait">
                  {messages.length === 0 && isFromVoice && (
                    <motion.div
                      key="voice-loading"
                      initial={{ opacity: 0, scale: 0.95, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -16, filter: "blur(4px)" }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      className="flex flex-col items-center justify-center py-16"
                    >
                      <div className="relative h-20 w-20 mb-5">
                        <div className="absolute inset-0 rounded-full bg-primary/8 animate-ping [animation-duration:2s]" />
                        <div className="absolute inset-2 rounded-full bg-primary/10 animate-ping [animation-duration:1.5s] [animation-delay:0.3s]" />
                        <div className="relative h-20 w-20 rounded-full bg-primary/8 flex items-center justify-center border border-primary/15">
                          <Mic className="h-8 w-8 text-primary/70 animate-pulse" />
                        </div>
                      </div>
                      <p className="font-display text-sm font-medium text-foreground/80 mb-1">Processando comando de voz</p>
                      <p className="text-xs text-muted-foreground/50">Preparando sua consulta…</p>
                      <div className="flex items-center gap-1 mt-3">
                        <div className="h-1 w-1 rounded-full bg-primary/50 animate-bounce [animation-duration:0.6s]" />
                        <div className="h-1 w-1 rounded-full bg-primary/40 animate-bounce [animation-duration:0.6s] [animation-delay:0.15s]" />
                        <div className="h-1 w-1 rounded-full bg-primary/30 animate-bounce [animation-duration:0.6s] [animation-delay:0.3s]" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── MESSAGES ─── */}
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id || `msg-${message.role}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index === 0 && isFromVoice ? 0.15 : 0 }}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col max-w-[80%] group/msg">
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-lg"
                            : "bg-muted/50 text-foreground rounded-bl-lg border border-border/20"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>p]:text-[13px] [&>p]:leading-relaxed [&_li]:text-[13px] [&_li]:leading-relaxed [&>pre]:text-xs [&>pre]:bg-background/50 [&>pre]:rounded-lg [&>pre]:border [&>pre]:border-border/20 [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-primary [&_a]:no-underline [&_a]:font-medium hover:[&_a]:underline [&_strong]:font-semibold [&_table]:text-xs">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      {/* Action bar: Copy + TTS */}
                      {message.role === "assistant" && message.content && !isLoading && (() => {
                        const msgId = message.id || `msg-${index}`;
                        const isPlaying = playingTtsId === msgId;
                        const isPaused = pausedTtsId === msgId;
                        const isLoadingTts = loadingTtsId === msgId;
                        const isActive = isPlaying || isPaused;
                        const isCopied = copiedId === msgId;
                        return (
                          <div className={cn(
                            "flex items-center gap-0.5 self-start mt-1 ml-0.5 transition-opacity duration-150",
                            isActive ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                          )}>
                            <button
                              onClick={() => handleCopy(msgId, message.content)}
                              className={cn(
                                "p-1 rounded-lg transition-all duration-150",
                                isCopied
                                  ? "text-emerald-500"
                                  : "text-muted-foreground/40 hover:text-foreground hover:bg-muted/50"
                              )}
                              title={isCopied ? "Copiado!" : "Copiar"}
                              aria-label="Copiar mensagem"
                            >
                              {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => {
                                if (isPlaying) {
                                  handlePauseTts(msgId);
                                } else {
                                  handlePlayTts(msgId, message.content);
                                }
                              }}
                              disabled={isLoadingTts}
                              className={cn(
                                "p-1 rounded-lg text-muted-foreground/40 transition-all duration-150",
                                isActive
                                  ? "text-primary bg-primary/8"
                                  : isLoadingTts
                                    ? "text-primary/50 cursor-wait"
                                    : "hover:text-primary hover:bg-primary/5"
                              )}
                              title={isPlaying ? "Pausar" : isPaused ? "Retomar" : isLoadingTts ? "Gerando áudio..." : "Ouvir"}
                              aria-label={isPlaying ? "Pausar" : isPaused ? "Retomar" : isLoadingTts ? "Gerando áudio..." : "Ouvir"}
                            >
                              {isLoadingTts ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isPlaying ? (
                                <Pause className="h-3 w-3" />
                              ) : isPaused ? (
                                <Play className="h-3 w-3" />
                              ) : (
                                <Volume2 className="h-3 w-3" />
                              )}
                            </button>
                            {isActive && (
                              <button
                                onClick={() => {
                                  if (ttsStopRef.current) {
                                    ttsStopRef.current();
                                    ttsStopRef.current = null;
                                    ttsPauseRef.current = null;
                                    ttsResumeRef.current = null;
                                  }
                                  setPlayingTtsId(null);
                                  setPausedTtsId(null);
                                }}
                                className="p-1 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 transition-all duration-150"
                                title="Parar"
                                aria-label="Parar áudio"
                              >
                                <VolumeX className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {message.role === "user" && (
                      <div className="h-7 w-7 rounded-xl bg-secondary/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-secondary-foreground/60" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator — smooth wave */}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 justify-start"
                  >
                    <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl rounded-bl-lg border border-border/20 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-primary/60"
                              animate={{
                                scale: [1, 1.4, 1],
                                opacity: [0.4, 1, 0.4],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut",
                              }}
                            />
                          ))}
                        </div>
                        {isFromVoice && (
                          <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                            <Mic className="h-2.5 w-2.5" />
                            via voz
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Scroll to bottom FAB */}
              <AnimatePresence>
                {showScrollDown && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-background border border-border/50 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all z-10"
                    aria-label="Rolar para baixo"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </ScrollArea>

            {/* ─── INPUT ─── */}
            <div className="px-4 py-3 border-t border-border/20 flex-shrink-0">
              <div className="flex gap-2 items-center">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ao Oráculo…"
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-xl border-border/30 bg-muted/20 text-sm focus-visible:ring-primary/20 focus-visible:border-primary/25 transition-all placeholder:text-muted-foreground/40"
                />
                <Button
                  data-oracle-send
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  aria-label="Enviar mensagem"
                  className="h-10 w-10 rounded-xl shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

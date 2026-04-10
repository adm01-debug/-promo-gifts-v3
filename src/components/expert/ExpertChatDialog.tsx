import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bot, X, Send, Loader2, User, Sparkles, History, Plus, Trash2, MessageSquare, Filter, DollarSign, Layers, Volume2, VolumeX, Pause, Play, Mic, Copy, Check, ArrowDown, RotateCcw, Search, Square, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { preprocessProductLinks, ProductAwareLink } from "./ProductLinkRenderer";
import { useExpertConversations, ExpertConversation } from "@/hooks/useExpertConversations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { playTtsAudio } from "@/hooks/voice/playTtsAudio";
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

// Thinking status messages that rotate during loading
const THINKING_MESSAGES = [
  "Analisando sua pergunta…",
  "Consultando catálogo…",
  "Buscando produtos relevantes…",
  "Preparando recomendações…",
];

const THINKING_MESSAGES_CRM = [
  "Consultando dados do cliente…",
  "Analisando histórico de compras…",
  "Verificando orçamentos pendentes…",
  "Gerando insights personalizados…",
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
  const [savingQuoteId, setSavingQuoteId] = useState<string | null>(null);
  const [sellerFirstName, setSellerFirstName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playingTtsId, setPlayingTtsId] = useState<string | null>(null);
  const [pausedTtsId, setPausedTtsId] = useState<string | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);
  const [isFromVoice, setIsFromVoice] = useState(false);
  const isFromVoiceRef = useRef(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [lastUserInput, setLastUserInput] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("");
  const ttsStopRef = useRef<(() => void) | null>(null);
  const ttsPauseRef = useRef<(() => void) | null>(null);
  const ttsResumeRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [autoPlayTts, setAutoPlayTts] = useState(() => {
    try { return localStorage.getItem("flow_autoplay_tts") !== "false"; } catch { return true; }
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    conversations,
    isLoading: isLoadingConversations,
    createConversation,
    deleteConversation,
    fetchMessages,
    saveMessage,
  } = useExpertConversations(clientId);

  // Rotate thinking messages during loading
  useEffect(() => {
    if (!isLoading) {
      setThinkingMessage("");
      return;
    }
    const msgs = clientId ? THINKING_MESSAGES_CRM : THINKING_MESSAGES;
    let idx = 0;
    setThinkingMessage(msgs[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setThinkingMessage(msgs[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading, clientId]);

  // Fetch seller first name and preferences
  useEffect(() => {
    if (!isOpen) return;
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, preferences")
          .eq("user_id", user.id)
          .single();
        if (profile?.full_name) {
          setSellerFirstName(profile.full_name.split(" ")[0]);
        }
        // Sync auto-play preference from DB (DB takes precedence over localStorage)
        const prefs = profile?.preferences as Record<string, unknown> | null;
        if (prefs && typeof prefs.flow_autoplay_tts === "boolean") {
          setAutoPlayTts(prefs.flow_autoplay_tts);
          try { localStorage.setItem("flow_autoplay_tts", String(prefs.flow_autoplay_tts)); } catch {}
        }
      } catch { /* ignore */ }
    };
    fetchProfile();
  }, [isOpen]);

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

  // Save proposal as quote draft
  const handleSaveAsQuote = useCallback(async (msgId: string, proposalContent: string) => {
    try {
      setSavingQuoteId(msgId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Faça login para salvar orçamentos");
        return;
      }

      // Insert a draft quote with proposal content as notes
      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          seller_id: user.id,
          status: "draft",
          client_id: clientId || null,
          client_name: clientName || null,
          notes: proposalContent.slice(0, 2000),
          internal_notes: "Gerado pelo Flow - Assistente Pessoal",
        })
        .select("id, quote_number")
        .single();

      if (error) throw error;

      toast.success(`Rascunho ${quote.quote_number} criado!`, {
        description: "Redirecionando para o editor…",
        duration: 2000,
      });

      // Close dialog and navigate to quote editor
      setTimeout(() => {
        onClose();
        navigate(`/orcamentos/novo?edit=${quote.id}`);
      }, 800);
    } catch (err) {
      console.error("Error saving quote draft:", err);
      toast.error("Erro ao criar rascunho de orçamento");
    } finally {
      setSavingQuoteId(null);
    }
  }, [clientId, clientName, navigate, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current && !showHistory) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showHistory]);

  // Reset state when dialog closes or client changes
  useEffect(() => {
    if (!isOpen) {
      setShowHistory(false);
      setHistorySearch("");
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
      isFromVoiceRef.current = true;
      // Auto-send directly
      handleAutoSend(initialMessage);
    }
    if (!isOpen) {
      initialMessageSentRef.current = false;
      setIsFromVoice(false);
      isFromVoiceRef.current = false;
    }
  }, [isOpen, initialMessage, isLoading]);

  // TTS playback for assistant messages
  const handlePlayTts = useCallback(async (messageId: string, text: string) => {
    if (pausedTtsId === messageId && ttsResumeRef.current) {
      ttsResumeRef.current();
      setPausedTtsId(null);
      setPlayingTtsId(messageId);
      return;
    }

    if (ttsStopRef.current) {
      ttsStopRef.current();
      ttsStopRef.current = null;
      ttsPauseRef.current = null;
      ttsResumeRef.current = null;
      if (playingTtsId === messageId) {
        setPlayingTtsId(null);
        setPausedTtsId(null);
        return;
      }
    }

    setPausedTtsId(null);
    setLoadingTtsId(messageId);
    try {
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

  // Retry: remove error message and re-send last user input
  const handleRetry = useCallback(() => {
    if (!lastUserInput) return;
    setMessages(prev => {
      const filtered = prev.filter(m => !m.isError);
      if (filtered.length > 0 && filtered[filtered.length - 1]?.role === "user") {
        return filtered.slice(0, -1);
      }
      return filtered;
    });
    handleAutoSend(lastUserInput);
  }, [lastUserInput]);

  // Stop generating - abort the current stream
  const handleStopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Auto-send: directly send a message string (used by chips, voice, retry)
  const handleAutoSend = useCallback((text: string) => {
    setInput(text);
    // Use a microtask to ensure input is set before triggering send
    setTimeout(() => {
      const sendBtn = document.querySelector('[data-oracle-send]') as HTMLButtonElement;
      sendBtn?.click();
    }, 50);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setLastUserInput(userMessage);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

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

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao conectar com o Flow");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantMsgId = `assistant-${Date.now()}`;

      setMessages(prev => [...prev, { id: assistantMsgId, role: "assistant", content: "", timestamp: Date.now() }]);

      if (reader) {
        let buffer = "";
        
        try {
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
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            // User stopped generation - keep what we have
            console.log("[Oracle] Generation stopped by user");
          } else {
            throw err;
          }
        }
      }

      // Save assistant message
      if (convId && assistantMessage) {
        await saveMessage(convId, "assistant", assistantMessage);
      }

      // Auto-play TTS when response came from a voice command
      if (isFromVoiceRef.current && autoPlayTts && assistantMessage) {
        setTimeout(() => {
          handlePlayTts(assistantMsgId, assistantMessage);
        }, 300);
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Already handled above
        return;
      }
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
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeFiltersCount = [selectedCategory, selectedPriceRange, selectedMaterial].filter(Boolean).length;

  const filteredConversations = conversations.filter(c =>
    !historySearch || c.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full sm:max-w-[480px] h-[100dvh] sm:h-[640px] flex flex-col p-0 gap-0 rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border sm:border-border/50 shadow-xl [&>button.absolute]:hidden">
        {/* ─── HEADER ─── */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/30 flex-shrink-0 bg-gradient-to-b from-primary/[0.03] to-transparent">
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
                  Flow
                  <Sparkles className="h-3.5 w-3.5 text-primary/60" />
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground/70 leading-none mt-0.5">
                  Assistente pessoal de vendas
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Filters dropdown */}
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

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-normal">Áudio</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={async () => {
                      const next = !autoPlayTts;
                      setAutoPlayTts(next);
                      try { localStorage.setItem("flow_autoplay_tts", String(next)); } catch {}
                      // Persist to DB
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          const { data: profile } = await supabase
                            .from("profiles")
                            .select("preferences")
                            .eq("user_id", user.id)
                            .single();
                          const currentPrefs = (profile?.preferences as Record<string, unknown>) || {};
                          await supabase
                            .from("profiles")
                            .update({ preferences: { ...currentPrefs, flow_autoplay_tts: next } })
                            .eq("user_id", user.id);
                        }
                      } catch { /* ignore */ }
                    }}
                    className="text-xs"
                  >
                    <Volume2 className="h-3 w-3 mr-1.5 opacity-50" />
                    Auto-play por voz
                    <span className={cn("ml-auto text-[10px] font-medium", autoPlayTts ? "text-primary" : "text-muted-foreground/50")}>
                      {autoPlayTts ? "ON" : "OFF"}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowHistory(!showHistory); setHistorySearch(""); }}
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
              {/* Search bar */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar conversas…"
                  className="w-full h-8 pl-8 pr-3 rounded-xl border border-border/30 bg-muted/20 text-xs placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/25 transition-all"
                />
              </div>

              <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider px-1 mb-3">
                Conversas anteriores
              </p>
              {isLoadingConversations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground/60">
                    {historySearch ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                  </p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                >
                  {filteredConversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
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
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-3 relative" ref={scrollRef} onScrollCapture={handleScroll}>
              <div className="space-y-3">
                {/* ─── EMPTY STATE ─── */}
                {messages.length === 0 && !isFromVoice && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.08 } },
                    }}
                    className="flex flex-col items-center justify-center py-10 px-2"
                  >
                    <motion.div
                      variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative mb-5"
                    >
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/15 shadow-lg shadow-primary/5">
                        <Bot className="h-8 w-8 text-primary" />
                      </div>
                      <motion.div
                        className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-lg bg-background border border-border/50 flex items-center justify-center shadow-sm"
                        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles className="h-3 w-3 text-primary/70" />
                      </motion.div>
                    </motion.div>

                    <motion.h3
                      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                      className="font-display text-lg font-semibold tracking-tight mb-1"
                    >
                      {sellerFirstName ? `E aí, ${sellerFirstName}! 👋` : "Olá! Sou o Flow"}
                    </motion.h3>
                    <motion.p
                      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                      className="text-[13px] text-muted-foreground/70 text-center max-w-[260px] leading-relaxed"
                    >
                      {clientId 
                        ? `Seu assistente pessoal para vender mais para ${clientName || "este cliente"}.`
                        : "Seu assistente pessoal de vendas. Produtos, propostas, follow-ups e oportunidades."
                      }
                    </motion.p>

                    {/* Suggestion chips - now auto-send on click */}
                    <motion.div
                      variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                      className="mt-5 flex flex-wrap gap-2 justify-center"
                    >
                      {(clientId ? [
                        { emoji: "📊", label: "Resumo do cliente", prompt: `Me dê um resumo executivo completo deste cliente: histórico, ticket médio, preferências e oportunidades.` },
                        { emoji: "📝", label: "Montar proposta", prompt: "Monte uma proposta personalizada com produtos ideais para este cliente, considerando seu perfil e histórico." },
                        { emoji: "📞", label: "Follow-up", prompt: "Quais orçamentos estão pendentes? Sugira mensagens de follow-up para retomar contato com este cliente." },
                        { emoji: "🎯", label: "Oportunidades", prompt: "Analise oportunidades de upsell e cross-sell para este cliente baseado no histórico de compras." },
                        { emoji: "🎨", label: "Cores da marca", prompt: "Produtos que combinam com as cores da marca deste cliente" },
                        { emoji: "🎁", label: "Datas comemorativas", prompt: "Sugira produtos para as próximas datas comemorativas para este cliente" },
                      ] : [
                        { emoji: "✨", label: "Recomendações", prompt: "Quais produtos estão em alta e você recomenda para prospecção?" },
                        { emoji: "📝", label: "Montar proposta", prompt: "Me ajude a montar uma proposta comercial. Qual é o perfil do cliente?" },
                        { emoji: "📞", label: "Dicas de follow-up", prompt: "Me dê dicas de como fazer follow-up eficiente em orçamentos pendentes." },
                        { emoji: "🎯", label: "Oportunidades sazonais", prompt: "Quais são as melhores oportunidades de venda para este período do ano?" },
                      ]).map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleAutoSend(item.prompt)}
                          className="group/chip flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-border/50 bg-background hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                        >
                          <span>{item.emoji}</span>
                          <span className="text-foreground/80 group-hover/chip:text-foreground">{item.label}</span>
                        </button>
                      ))}
                    </motion.div>

                    {conversations.length > 0 && (
                      <motion.button
                        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                        onClick={() => setShowHistory(true)}
                        className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-primary transition-colors"
                      >
                        <History className="h-3 w-3" />
                        Ver conversas anteriores ({conversations.length})
                      </motion.button>
                    )}
                  </motion.div>
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
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id || `msg-${message.role}-${index}`}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: index === 0 && isFromVoice ? 0.15 : 0 }}
                      layout
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
                              : message.isError
                                ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-lg"
                                : "bg-muted/50 text-foreground rounded-bl-lg border border-border/20"
                          )}
                        >
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>p]:text-[13px] [&>p]:leading-relaxed [&_li]:text-[13px] [&_li]:leading-relaxed [&>pre]:text-xs [&>pre]:bg-background/50 [&>pre]:rounded-lg [&>pre]:border [&>pre]:border-border/20 [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-primary [&_a]:no-underline [&_a]:font-medium hover:[&_a]:underline [&_strong]:font-semibold [&_table]:text-xs [&_table]:w-full [&_table]:border-collapse [&_th]:bg-muted/80 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-border/30 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_td]:px-2 [&_td]:py-1.5 [&_td]:border [&_td]:border-border/20 [&_td]:text-[12px] [&_tr:hover]:bg-muted/30 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{ a: ProductAwareLink }}
                              >
                                {preprocessProductLinks(message.content)}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                        {/* Timestamp on hover */}
                        {message.timestamp && (
                          <span className="text-[10px] text-muted-foreground/30 mt-0.5 ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity select-none">
                            {new Date(message.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {/* Retry button for error messages */}
                        {message.isError && !isLoading && (
                          <button
                            onClick={handleRetry}
                            className="flex items-center gap-1.5 self-start mt-1.5 ml-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Tentar novamente
                          </button>
                        )}
                        {/* Action bar: Copy + TTS */}
                        {message.role === "assistant" && message.content && !message.isError && !isLoading && (() => {
                          const msgId = message.id || `msg-${index}`;
                          const isPlaying = playingTtsId === msgId;
                          const isPaused = pausedTtsId === msgId;
                          const isLoadingTts = loadingTtsId === msgId;
                          const isActive = isPlaying || isPaused;
                          const isCopied = copiedId === msgId;
                          return (
                            <div className={cn(
                              "flex items-center gap-1 self-start mt-1.5 ml-0.5 transition-opacity duration-150",
                              isActive ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                            )}>
                              <button
                                onClick={() => handleCopy(msgId, message.content)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all duration-150",
                                  isCopied
                                    ? "text-emerald-500"
                                    : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/50"
                                )}
                                title={isCopied ? "Copiado!" : "Copiar"}
                                aria-label="Copiar mensagem"
                              >
                                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => handleSaveAsQuote(msgId, message.content)}
                                disabled={savingQuoteId === msgId}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all duration-150",
                                  savingQuoteId === msgId
                                    ? "text-primary/50 cursor-wait"
                                    : "text-muted-foreground/50 hover:text-primary hover:bg-primary/5"
                                )}
                                title="Salvar como rascunho de orçamento"
                                aria-label="Salvar como rascunho de orçamento"
                              >
                                {savingQuoteId === msgId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FileText className="h-3.5 w-3.5" />
                                )}
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
                                  "p-2 rounded-xl transition-all duration-150",
                                  isActive
                                    ? "text-primary bg-primary/15 shadow-sm"
                                    : isLoadingTts
                                      ? "text-primary/50 cursor-wait bg-primary/5"
                                      : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
                                )}
                                title={isPlaying ? "Pausar" : isPaused ? "Retomar" : isLoadingTts ? "Gerando áudio..." : "Ouvir"}
                                aria-label={isPlaying ? "Pausar" : isPaused ? "Retomar" : isLoadingTts ? "Gerando áudio..." : "Ouvir"}
                              >
                                {isLoadingTts ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : isPaused ? (
                                  <Play className="h-4 w-4" />
                                ) : (
                                  <Volume2 className="h-4 w-4" />
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
                                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
                                  title="Parar"
                                  aria-label="Parar áudio"
                                >
                                  <VolumeX className="h-3.5 w-3.5" />
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
                </AnimatePresence>

                {/* Quick follow-up actions after assistant response */}
                {messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.isError && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-1.5 ml-9 mt-1"
                  >
                    {[
                      { emoji: "🔍", label: "Aprofundar", prompt: "Pode detalhar mais essa última resposta? Quero mais informações." },
                      ...(clientId ? [
                        { emoji: "📝", label: "Montar proposta", prompt: "Com base nessa análise, monte uma proposta comercial detalhada com produtos, quantidades e valores sugeridos." },
                        { emoji: "💬", label: "Msg follow-up", prompt: "Crie uma mensagem de follow-up para enviar a este cliente por WhatsApp." },
                      ] : []),
                      { emoji: "📊", label: "Comparar", prompt: "Compare as opções mencionadas em uma tabela com prós e contras." },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleAutoSend(action.prompt)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border/40 bg-background/80 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all duration-150"
                      >
                        <span className="text-[10px]">{action.emoji}</span>
                        {action.label}
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Typing indicator with thinking status */}
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
                      <div className="flex flex-col gap-1.5">
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
                        {/* Thinking status text */}
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={thinkingMessage}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.3 }}
                            className="text-[10px] text-muted-foreground/50 leading-none"
                          >
                            {thinkingMessage}
                          </motion.p>
                        </AnimatePresence>
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
              {/* Stop generating button */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center mb-2"
                >
                  <button
                    onClick={handleStopGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border border-border/50 bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Parar de gerar
                  </button>
                </motion.div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ao Flow…"
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 min-h-[40px] max-h-[120px] rounded-xl border border-border/30 bg-muted/20 text-sm px-3 py-2.5 resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/25 transition-all placeholder:text-muted-foreground/40 disabled:opacity-50"
                />
                {/* Mic button — visible when input is empty */}
                {!input.trim() && !isLoading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // Use Web Speech API for voice input
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                      if (!SpeechRecognition) {
                        toast.error("Seu navegador não suporta reconhecimento de voz");
                        return;
                      }
                      const recognition = new SpeechRecognition();
                      recognition.lang = "pt-BR";
                      recognition.interimResults = false;
                      recognition.maxAlternatives = 1;
                      toast.info("🎙️ Ouvindo… fale agora", { duration: 3000 });
                      recognition.onresult = (event: any) => {
                        const transcript = event.results[0][0].transcript;
                        if (transcript) {
                          setInput(transcript);
                          isFromVoiceRef.current = true;
                          setIsFromVoice(true);
                          // Auto-send after capturing voice
                          setTimeout(() => {
                            const sendBtn = document.querySelector('[data-oracle-send]') as HTMLButtonElement;
                            if (sendBtn) sendBtn.click();
                          }, 100);
                        }
                      };
                      recognition.onerror = () => {
                        toast.error("Não foi possível captar o áudio");
                      };
                      recognition.start();
                    }}
                    aria-label="Entrada por voz"
                    className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
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
              <p className="text-[10px] text-muted-foreground/30 text-center mt-1.5 select-none">
                Shift+Enter para nova linha · Flow - Assistente Pessoal
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

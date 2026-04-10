import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, X, Send, Loader2, User, Sparkles, ExternalLink, History, Plus, Trash2, MessageSquare, Filter, ChevronDown, DollarSign, Layers, Volume2, VolumeX, Mic } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const [isFromVoice, setIsFromVoice] = useState(false);
  const ttsStopRef = useRef<(() => void) | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    // Stop current playback if any
    if (ttsStopRef.current) {
      ttsStopRef.current();
      ttsStopRef.current = null;
      if (playingTtsId === messageId) {
        setPlayingTtsId(null);
        return; // Toggle off
      }
    }

    setPlayingTtsId(messageId);
    try {
      const { playTtsAudio } = await import("@/hooks/voice/playTtsAudio");
      const { promise, stop } = playTtsAudio(text);
      ttsStopRef.current = stop;
      await promise;
    } catch (err) {
      console.warn("[Oracle TTS] Playback failed:", err);
    } finally {
      setPlayingTtsId(null);
      ttsStopRef.current = null;
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

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: "user", content: userMessage }]);
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

      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: "assistant", content: "" }]);

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
      
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: "assistant", content: errorMessage }]);
      
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] h-[620px] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden border-primary/10">
        <DialogHeader className="p-4 pb-3 border-b border-border/40 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center shadow-lg shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-sm shadow-emerald-500/30">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-semibold flex items-center gap-2 tracking-tight">
                  Oráculo
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground/80 tracking-wide">
                  Consultor de Produtos IA
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {categories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={selectedCategory ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 text-xs gap-1"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {selectedCategory || "Categoria"}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                    {selectedCategory && (
                      <>
                        <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                          <span className="text-muted-foreground">Todas as categorias</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {categories.map((category) => (
                      <DropdownMenuItem
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={cn(selectedCategory === category && "bg-primary/10")}
                      >
                        {category}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={selectedPriceRange ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 text-xs gap-1"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    {selectedPriceRange?.label || "Preço"}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selectedPriceRange && (
                    <>
                      <DropdownMenuItem onClick={() => setSelectedPriceRange(null)}>
                        <span className="text-muted-foreground">Qualquer preço</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {PRICE_RANGES.map((range) => (
                    <DropdownMenuItem
                      key={range.label}
                      onClick={() => setSelectedPriceRange(range)}
                      className={cn(selectedPriceRange?.label === range.label && "bg-primary/10")}
                    >
                      {range.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {materials.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={selectedMaterial ? "secondary" : "ghost"}
                      size="sm"
                      className="h-8 text-xs gap-1"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {selectedMaterial || "Material"}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                    {selectedMaterial && (
                      <>
                        <DropdownMenuItem onClick={() => setSelectedMaterial(null)}>
                          <span className="text-muted-foreground">Todos os materiais</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {materials.map((material) => (
                      <DropdownMenuItem
                        key={material}
                        onClick={() => setSelectedMaterial(material)}
                        className={cn(selectedMaterial === material && "bg-primary/10")}
                      >
                        {material}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {clientName && (
                <Badge variant="secondary" className="text-xs">
                  {clientName}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon" aria-label="History"
                onClick={() => setShowHistory(!showHistory)}
                className="h-8 w-8"
                title={showHistory ? "Voltar ao chat" : "Ver histórico"}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon" aria-label="Adicionar"
                onClick={startNewConversation}
                className="h-8 w-8"
                title="Nova conversa"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {showHistory ? (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              <h3 className="font-display font-medium text-sm text-muted-foreground mb-3">
                Conversas anteriores
              </h3>
              {isLoadingConversations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa anterior</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                      currentConversationId === conv.id && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.updated_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon" aria-label="Excluir"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.length === 0 && !isFromVoice && (
                  <div className="text-center py-8">
                    <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-5 border border-primary/15 shadow-xl shadow-primary/5">
                      <Bot className="h-10 w-10 text-primary/80" />
                      <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/10">
                        <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                      </div>
                    </div>
                    <h3 className="font-display text-xl font-bold mb-2 tracking-tight">Olá! Sou o Oráculo</h3>
                    <p className="text-sm text-muted-foreground/80 max-w-[260px] mx-auto leading-relaxed">
                      {clientId 
                        ? `Posso ajudar a encontrar os melhores produtos para ${clientName || "este cliente"}.`
                        : "Posso ajudar a encontrar os melhores produtos para seus clientes."
                      }
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      {[
                        { emoji: "✨", label: "Recomendações", prompt: "Quais produtos você recomenda para este cliente?" },
                        { emoji: "🎁", label: "Datas comemorativas", prompt: "Sugira produtos para datas comemorativas" },
                        { emoji: "🎨", label: "Cores da marca", prompt: "Produtos que combinam com as cores da marca" },
                      ].map((item) => (
                        <Button
                          key={item.label}
                          variant="outline"
                          size="sm"
                          onClick={() => setInput(item.prompt)}
                          className="text-xs rounded-2xl hover:bg-primary/5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 gap-1.5 px-4 py-2"
                        >
                          <span>{item.emoji}</span>
                          {item.label}
                        </Button>
                      ))}
                    </div>
                    {conversations.length > 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                        className="mt-4 text-xs text-muted-foreground/60 hover:text-primary"
                      >
                        <History className="h-3 w-3 mr-1" />
                        Ver conversas anteriores ({conversations.length})
                      </Button>
                    )}
                  </div>
                )}

                {/* Voice command loading state */}
                {messages.length === 0 && isFromVoice && (
                  <div className="text-center py-12 animate-fade-in">
                    <div className="relative h-24 w-24 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping [animation-duration:2s]" />
                      <div className="absolute inset-2 rounded-full bg-primary/15 animate-ping [animation-duration:1.5s] [animation-delay:0.3s]" />
                      <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/10">
                        <Mic className="h-10 w-10 text-primary animate-pulse" />
                      </div>
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-1.5 tracking-tight">Processando comando de voz</h3>
                    <p className="text-sm text-muted-foreground/70">Preparando sua consulta ao Oráculo...</p>
                    <div className="flex items-center justify-center gap-1.5 mt-4">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-duration:0.6s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-duration:0.6s] [animation-delay:0.15s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/30 animate-bounce [animation-duration:0.6s] [animation-delay:0.3s]" />
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={message.id || `msg-${message.role}-${index}`}
                    className={cn(
                      "flex gap-2.5 animate-fade-in",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/15 ring-1 ring-primary/10">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col max-w-[78%]">
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed transition-shadow duration-200",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm shadow-md shadow-primary/20"
                            : "bg-muted/60 rounded-bl-sm border border-border/30 shadow-sm hover:shadow-md hover:shadow-primary/5"
                        )}
                      >
                        <p className="whitespace-pre-wrap">
                          {message.role === "assistant" 
                            ? renderMessageContent(message.content)
                            : message.content
                          }
                        </p>
                      </div>
                      {message.role === "assistant" && message.content && !isLoading && (
                        <button
                          onClick={() => handlePlayTts(message.id || `msg-${index}`, message.content)}
                          className={cn(
                            "self-start mt-1 ml-1 p-1.5 rounded-xl text-muted-foreground/60 transition-all duration-200 hover:scale-105",
                            playingTtsId === (message.id || `msg-${index}`)
                              ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                              : "hover:text-primary hover:bg-primary/8"
                          )}
                          title={playingTtsId === (message.id || `msg-${index}`) ? "Parar áudio" : "Ouvir resposta"}
                          aria-label={playingTtsId === (message.id || `msg-${index}`) ? "Parar áudio" : "Ouvir resposta"}
                        >
                          {playingTtsId === (message.id || `msg-${index}`) ? (
                            <VolumeX className="h-3.5 w-3.5" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="h-8 w-8 rounded-2xl bg-secondary/80 flex items-center justify-center flex-shrink-0 ring-1 ring-border/30">
                        <User className="h-4 w-4 text-secondary-foreground/70" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2.5 justify-start animate-fade-in">
                    <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/15 ring-1 ring-primary/10">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted/60 rounded-2xl rounded-bl-sm border border-border/30 px-5 py-3.5 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-duration:0.6s]" />
                          <div className="h-2 w-2 rounded-full bg-primary/50 animate-bounce [animation-duration:0.6s] [animation-delay:0.15s]" />
                          <div className="h-2 w-2 rounded-full bg-primary/30 animate-bounce [animation-duration:0.6s] [animation-delay:0.3s]" />
                        </div>
                        {isFromVoice && (
                          <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                            <Mic className="h-3 w-3" />
                            via voz
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/30 bg-background/90 backdrop-blur-md">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ao Oráculo…"
                  disabled={isLoading}
                  className="flex-1 rounded-2xl border-border/40 bg-muted/30 focus-visible:ring-primary/25 focus-visible:border-primary/30 transition-all duration-200 placeholder:text-muted-foreground/50"
                />
                <Button
                  data-oracle-send
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  aria-label="Enviar mensagem"
                  className="rounded-2xl shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
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

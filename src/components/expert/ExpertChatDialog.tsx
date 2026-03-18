import { useState, useRef, useEffect, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, X, Send, Loader2, User, Sparkles, ExternalLink, History, Plus, Trash2, MessageSquare, Filter, ChevronDown, DollarSign, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

export const ExpertChatDialog = forwardRef<HTMLDivElement, ExpertChatDialogProps>(function ExpertChatDialog({ isOpen, onClose, clientId, clientName }, _ref) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    const fetchFilters = async () => {
      try {
        const { fetchPromobrindProducts } = await import('@/lib/external-db');
        const productsData = await fetchPromobrindProducts({ limit: 500 });

        // Extrair categorias únicas
        const uniqueCategories = [...new Set(
          productsData.map(p => p.category_name).filter(Boolean)
        )] as string[];
        setCategories(uniqueCategories.sort());

        // Extrair materiais únicos
        const allMaterials = productsData.flatMap(p => p.materials || []).filter(Boolean);
        const uniqueMaterials = [...new Set(allMaterials)] as string[];
        setMaterials(uniqueMaterials.sort());
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };
    
    if (isOpen) {
      fetchFilters();
    }
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

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
  };

  const loadConversation = async (conversation: ExpertConversation) => {
    const loadedMessages = await fetchMessages(conversation.id);
    setMessages(loadedMessages.map(m => ({ role: m.role, content: m.content })));
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

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
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
            messages: [...messages, { role: "user", content: userMessage }],
            clientId,
            categoryFilter: selectedCategory,
            priceMin: selectedPriceRange?.min ?? null,
            priceMax: selectedPriceRange?.max ?? null,
            materialFilter: selectedMaterial,
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

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
      
      setMessages(prev => [...prev, { role: "assistant", content: errorMessage }]);
      
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
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg flex items-center gap-2">
                  Oráculo
                  <Sparkles className="h-4 w-4 text-primary" />
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Consultor de Produtos IA
                </p>
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
                size="icon"
                onClick={() => setShowHistory(!showHistory)}
                className="h-8 w-8"
                title={showHistory ? "Voltar ao chat" : "Ver histórico"}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
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
              <h3 className="font-medium text-sm text-muted-foreground mb-3">
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
                        size="icon"
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
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-medium mb-2">Olá! Sou o Oráculo</h3>
                    <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                      {clientId 
                        ? `Posso ajudar a encontrar os melhores produtos para ${clientName || "este cliente"} com base no perfil e histórico de compras.`
                        : "Posso ajudar a encontrar os melhores produtos para seus clientes. Selecione um cliente para recomendações personalizadas."
                      }
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInput("Quais produtos você recomenda para este cliente?")}
                        className="text-xs"
                      >
                        Recomendações
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInput("Sugira produtos para datas comemorativas")}
                        className="text-xs"
                      >
                        Datas comemorativas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInput("Produtos que combinam com as cores da marca")}
                        className="text-xs"
                      >
                        Cores da marca
                      </Button>
                    </div>
                    {conversations.length > 0 && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                        className="mt-4 text-xs"
                      >
                        <History className="h-3 w-3 mr-1" />
                        Ver conversas anteriores ({conversations.length})
                      </Button>
                    )}
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={message.id || `msg-${message.role}-${index}`}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap">
                        {message.role === "assistant" 
                          ? renderMessageContent(message.content)
                          : message.content
                        }
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ao Oráculo..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
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
});

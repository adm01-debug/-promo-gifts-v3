/**
 * Renders [[PRODUTO:id:nome]] patterns as clickable product links in chat messages.
 * Used by ExpertChatDialog to make AI product recommendations interactive.
 */
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductLinkRendererProps {
  content: string;
  className?: string;
}

const PRODUCT_LINK_REGEX = /\[\[PRODUTO:([^:]+):([^\]]+)\]\]/g;

export function parseProductLinks(text: string): (string | { id: string; name: string })[] {
  const parts: (string | { id: string; name: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(PRODUCT_LINK_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push({ id: match[1], name: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function ProductLink({ id, name }: { id: string; name: string }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/produto/${id}`)}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
        "bg-primary/10 text-primary hover:bg-primary/20",
        "text-[12px] font-medium transition-colors duration-150",
        "border border-primary/15 hover:border-primary/30",
        "cursor-pointer no-underline"
      )}
      title={`Ver produto: ${name}`}
    >
      <Package className="h-3 w-3 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{name}</span>
    </button>
  );
}

/**
 * Pre-processes markdown content to convert [[PRODUTO:id:nome]] 
 * into a special placeholder that survives markdown parsing.
 * After markdown renders, we replace placeholders with React components.
 */
export function preprocessProductLinks(content: string): string {
  // Convert [[PRODUTO:id:nome]] to HTML-safe inline elements
  // that ReactMarkdown will pass through
  return content.replace(
    PRODUCT_LINK_REGEX,
    (_, id, name) => `⟦PROD∶${id}∶${name}⟧`
  );
}

export function hasProductLinks(content: string): boolean {
  return PRODUCT_LINK_REGEX.test(content) || /⟦PROD∶/.test(content);
}

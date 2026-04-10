/**
 * Utilities and components for rendering [[PRODUTO:id:nome]] 
 * as clickable product links within chat messages.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

const PRODUCT_LINK_REGEX = /\[\[PRODUTO:([^:]+):([^\]]+)\]\]/g;

export function ProductLink({ id, name }: { id: string; name: string }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/produto/${id}`);
      }}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md",
        "bg-primary/10 text-primary hover:bg-primary/20",
        "text-[12px] font-medium transition-colors duration-150",
        "border border-primary/15 hover:border-primary/30",
        "cursor-pointer align-baseline"
      )}
      title={`Ver produto: ${name}`}
    >
      <Package className="h-3 w-3 flex-shrink-0" />
      <span className="truncate max-w-[180px]">{name}</span>
    </button>
  );
}

/**
 * Replaces [[PRODUTO:id:nome]] in a string with React ProductLink elements.
 * Returns an array of strings and React elements for inline rendering.
 */
export function renderWithProductLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(PRODUCT_LINK_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <ProductLink key={`prod-${match[1]}-${match.index}`} id={match[1]} name={match[2]} />
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Strip product link syntax before passing to markdown,
 * then let a custom text renderer handle inline replacement.
 * This approach works with ReactMarkdown's component overrides.
 */
export function createMarkdownTextRenderer() {
  // Custom "text" component for ReactMarkdown that replaces product link syntax
  return function TextWithProductLinks({ children }: { children?: React.ReactNode }) {
    if (typeof children !== "string") return <>{children}</>;
    if (!PRODUCT_LINK_REGEX.test(children)) return <>{children}</>;
    return <>{renderWithProductLinks(children)}</>;
  };
}

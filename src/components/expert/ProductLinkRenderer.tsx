/**
 * Utilities for rendering [[PRODUTO:id:nome]] as clickable product links.
 * Converts product link syntax to markdown links before ReactMarkdown processes them,
 * then uses a custom <a> component to render them as styled product chips.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

const PRODUCT_LINK_REGEX = /\[\[PRODUTO:([^:]+):([^\]]+)\]\]/g;
const PRODUCT_HREF_PREFIX = "produto://";

/**
 * Pre-process markdown content: convert [[PRODUTO:id:nome]] to 
 * standard markdown links with a special protocol.
 */
export function preprocessProductLinks(content: string): string {
  return content.replace(
    PRODUCT_LINK_REGEX,
    (_, id, name) => `[🔗 ${name}](${PRODUCT_HREF_PREFIX}${id})`
  );
}

/**
 * Custom <a> component for ReactMarkdown that renders product links
 * as styled chips with navigation, while passing through regular links.
 */
export function ProductAwareLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) {
  const navigate = useNavigate();

  if (href?.startsWith(PRODUCT_HREF_PREFIX)) {
    const productId = href.slice(PRODUCT_HREF_PREFIX.length);
    // Extract name from children (strip the 🔗 emoji)
    const name = typeof children === "string" 
      ? children.replace(/^🔗\s*/, "")
      : String(children || "").replace(/^🔗\s*/, "");

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/produto/${productId}`);
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

  // Regular link — render as normal anchor
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

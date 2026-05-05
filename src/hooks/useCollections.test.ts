import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { readFileSync } from "fs";

describe("useCollections - Static Validation", () => {
  it("should have correct onConflict in code", () => {
    const content = readFileSync("src/hooks/useCollections.ts", "utf-8");
    const count = (content.match(/onConflict: "collection_id,product_id,color_name"/g) || []).length;
    // Deve aparecer na migração, no addProduct e no multiAdd
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("should use try-catch and toast for error handling", () => {
    const content = readFileSync("src/hooks/useCollections.ts", "utf-8");
    expect(content).toContain("toast({");
    expect(content).toContain("try {");
    expect(content).toContain("catch (");
  });
});

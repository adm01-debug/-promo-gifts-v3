import { PERMISSION_MATRIX, resolvePaths } from "../fixtures/permissions-matrix";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Script para gerar automaticamente um arquivo de fixtures estáticas 
 * contendo todas as URLs resolvidas a partir da matriz de permissões.
 * 
 * Isso é útil para auditoria, documentação ou para outros sistemas 
 * que não rodam TypeScript/Deno diretamente.
 */
function generateUrlFixtures() {
  const output: Record<string, string[]> = {};

  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    output[role] = routes.flatMap(route => resolvePaths(route));
  }

  const filePath = path.join(process.cwd(), "e2e", "fixtures", "generated-urls.json");
  
  fs.writeFileSync(
    filePath,
    JSON.stringify(output, null, 2),
    "utf-8"
  );

  console.log(`✅ Fixture de URLs gerada com sucesso em: ${filePath}`);
}

// Executa se chamado diretamente
if (import.meta.url.endsWith(process.argv[1])) {
  generateUrlFixtures();
}

export { generateUrlFixtures };

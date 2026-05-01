import { PERMISSION_MATRIX, resolvePaths } from "../fixtures/permissions-matrix";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Script para gerar automaticamente um arquivo de fixtures estáticas 
 * contendo todas as URLs resolvidas a partir da matriz de permissões.
 * 
 * Inclui validação contra duplicidades e garantia de resolução de parâmetros.
 */
function generateUrlFixtures() {
  const output: Record<string, string[]> = {};
  const totalStats = { total: 0, unique: 0, parameterized: 0 };

  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    const resolvedUrls = routes.flatMap(route => {
      const paths = resolvePaths(route);
      if (route.path.includes(':')) totalStats.parameterized++;
      return paths;
    });

    // Validação de duplicidades por papel
    const uniqueUrls = [...new Set(resolvedUrls)];
    if (uniqueUrls.length !== resolvedUrls.length) {
      console.warn(`⚠️ Aviso: Duplicidades detectadas para o papel [${role}]. Removendo...`);
    }

    output[role] = uniqueUrls;
    totalStats.total += resolvedUrls.length;
    totalStats.unique += uniqueUrls.length;
  }

  const filePath = path.join(process.cwd(), "e2e", "fixtures", "generated-urls.json");
  
  fs.writeFileSync(
    filePath,
    JSON.stringify(output, null, 2),
    "utf-8"
  );

  console.log(`✅ Fixture de URLs gerada com sucesso em: ${filePath}`);
  console.log(`📊 Estatísticas: ${totalStats.unique} URLs únicas geradas (${totalStats.parameterized} rotas base parametrizadas resolvidas).`);

  // Validação final de integridade
  for (const [role, urls] of Object.entries(output)) {
    const unresolved = urls.filter(url => url.includes(':'));
    if (unresolved.length > 0) {
      throw new Error(`❌ Erro crítico: Rotas não resolvidas detectadas para o papel [${role}]: ${unresolved.join(', ')}`);
    }
  }
}

// Executa se chamado diretamente
if (import.meta.url.endsWith(process.argv[1])) {
  generateUrlFixtures();
}

export { generateUrlFixtures };

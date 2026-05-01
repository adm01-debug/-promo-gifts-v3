import { PERMISSION_MATRIX, resolvePaths } from "../fixtures/permissions-matrix";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Script para gerar automaticamente um arquivo de fixtures estáticas 
 * contendo todas as URLs resolvidas a partir da matriz de permissões.
 * 
 * Inclui validação contra duplicidades e garantia de resolução de parâmetros,
 * além de gerar automaticamente variações negativas (invalid params) para testes de robustez.
 */
function generateUrlFixtures() {
  const output: Record<string, string[]> = {};
  const totalStats = { total: 0, unique: 0, parameterized: 0, generatedNegative: 0 };

  for (const [role, routes] of Object.entries(PERMISSION_MATRIX)) {
    const resolvedUrls = routes.flatMap(route => {
      const paths = resolvePaths(route);
      
      if (route.path.includes(':')) {
        totalStats.parameterized++;
        
        // Gerador Automático de Cenários Negativos (Invalid Params)
        // Se a rota é parametrizada, criamos uma versão com IDs visivelmente inválidos
        // para alimentar os testes de 403/404 se não houver um parâmetro explícito negativo na matriz.
        const hasNegativeParam = Array.isArray(route.params) 
          ? route.params.some(p => Object.values(p).some(v => v.includes('invalid') || v.includes('non-existent')))
          : Object.values(route.params || {}).some(v => v.includes('invalid') || v.includes('non-existent'));

        if (!hasNegativeParam && route.expectedBehavior === 'allow') {
          const negativeParams: Record<string, string> = {};
          // Extrai os nomes dos parâmetros do path (ex: :id, :itemId)
          const paramNames = route.path.match(/:[a-zA-Z0-9]+/g) || [];
          paramNames.forEach(p => {
            const name = p.replace(':', '');
            negativeParams[name] = `invalid-${name}-auto`;
          });
          
          let negativePath = route.path;
          for (const [key, value] of Object.entries(negativeParams)) {
            negativePath = negativePath.split(`:${key}`).join(value);
          }
          paths.push(negativePath);
          totalStats.generatedNegative++;
        }
      }
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

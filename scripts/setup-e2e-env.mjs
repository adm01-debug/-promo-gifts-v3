import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

console.log("🚀 Subindo serviços para Playwright...");

// 1. Verificar se o build existe para o preview, ou usar o dev
if (process.env.CI) {
  console.log("📦 Rodando build em CI...");
  execSync("npm run build", { stdio: "inherit" });
}

// 2. Mock de Supabase/DB se necessário (opcional, dependendo do stack)
// No Lovable, as chaves anon/service-role já estão no env.

// 3. Seed/Limpeza de dados para reprodutibilidade
import { loadCleanupConfig, purgeAll } from "../e2e/helpers/cleanup-client.js";

async function seedTestData() {
  const cfg = loadCleanupConfig();
  if (!cfg) {
    console.log("⚠️ Cleanup config não encontrada. Pulando seed.");
    return;
  }
  
  console.log("🧹 Limpando dados residuais...");
  await purgeAll(cfg, { reason: "seed-setup" });
  console.log("✅ Ambiente limpo e pronto para testes.");
}

seedTestData().catch(err => {
  console.error("❌ Erro no seed de testes:", err);
  process.exit(1);
});

console.log("✅ Serviços prontos.");

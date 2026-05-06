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

console.log("✅ Serviços prontos.");

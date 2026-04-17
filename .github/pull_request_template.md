# Pull Request

## 📝 Descrição
<!-- Descreva o que este PR faz em 1-3 frases -->

## 🎯 Tipo de mudança
- [ ] 🐛 Bug fix (mudança não-breaking que corrige um problema)
- [ ] ✨ Nova feature (mudança não-breaking que adiciona funcionalidade)
- [ ] 💥 Breaking change (correção/feature que quebra compatibilidade)
- [ ] 📚 Documentação
- [ ] 🎨 Refatoração (sem mudança funcional)
- [ ] ⚡ Performance
- [ ] 🔒 Segurança

## 🔗 Issue relacionada
<!-- Closes #123 -->

## ✅ Checklist
- [ ] Código segue o style guide do projeto (ESLint passa)
- [ ] `npx tsc --noEmit` passa sem erros
- [ ] Testes passam (`npm run test`)
- [ ] Adicionei testes para novas funcionalidades quando aplicável
- [ ] Atualizei a documentação (README/CHANGELOG/docs/) se necessário
- [ ] Não há `console.log` em código de produção (apenas `logger.*`)
- [ ] Não há secrets/credenciais hardcoded
- [ ] RLS revisado se houve mudança em tabelas
- [ ] Edge functions: input validado com Zod
- [ ] Componentes UI: tokens semânticos (sem cores hardcoded)
- [ ] Memória atualizada (`mem://`) se a mudança afetar arquitetura/regras

## 🧪 Como testar
<!-- Passos para o reviewer reproduzir/validar -->

## 📸 Screenshots (se UI)
<!-- Antes / Depois -->

## ⚠️ Notas para o reviewer
<!-- Algo que mereça atenção especial -->

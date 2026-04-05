
# 🎤 Agente de Voz Completo — ElevenLabs + Lovable AI

## Arquitetura
O sistema terá 3 camadas:
1. **Ouvir** — ElevenLabs Scribe v2 Realtime (STT) para transcrição precisa em pt-BR
2. **Entender** — Lovable AI (Gemini Flash) para interpretar comandos em linguagem natural
3. **Responder** — ElevenLabs TTS para falar a resposta de volta

## Etapas de implementação

### 1. Edge Functions (backend)
- `elevenlabs-scribe-token` — Gera token de uso único para transcrição realtime
- `voice-agent` — Recebe o texto transcrito, envia para Lovable AI com contexto do catálogo, e retorna a ação + resposta em texto
- `elevenlabs-tts` — Converte a resposta de texto em áudio via ElevenLabs TTS

### 2. Dependências
- Instalar `@elevenlabs/react` para o hook `useScribe` (STT realtime)

### 3. Frontend
- Substituir `useSpeechRecognition` (Web Speech API) pelo `useScribe` do ElevenLabs
- Criar hook `useVoiceAgent` que orquestra: escutar → transcrever → IA → TTS → executar ação
- Atualizar `VoiceSearchOverlay` com novo fluxo e feedback visual (ouvindo → processando → respondendo)

### 4. Capacidades do agente
O agente de voz poderá:
- Buscar produtos por descrição natural ("quero algo pra dar de presente corporativo")
- Filtrar com linguagem livre ("mostra canetas azuis baratas")
- Navegar entre páginas ("vai pro painel de orçamentos")
- Responder perguntas sobre o catálogo ("tem alguma garrafa térmica?")
- Ordenar resultados ("ordena pelo mais barato")
- Limpar filtros ("começa de novo")

### 5. Fluxo do usuário
1. Clica no 🎤 → overlay abre
2. Fala naturalmente → ElevenLabs transcreve em tempo real
3. Ao finalizar → texto vai pra IA que interpreta e decide a ação
4. IA responde em texto → ElevenLabs fala a resposta
5. Ação é executada (filtro, navegação, busca, etc.)

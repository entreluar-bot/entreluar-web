<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.
This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

# Regras do Projeto Entreluar (Instruções para a IA)

## 1. Controle de Versão Visual no Painel (OBRIGATÓRIO)
Toda vez que você (a IA) fizer uma alteração significativa no código e for realizar um commit/deploy, você DEVE obrigatoriamente atualizar a tag de versão e o timestamp (data/hora) que fica no cabeçalho do painel administrativo (`src/app/admin/page.tsx`).
- O texto fica no canto superior direito: `<p className="font-bold tracking-widest uppercase">Versão X.XX</p>` e `<p>Atualizado em DD/MM/AAAA às HH:MM</p>`.
- Incremente o número da versão (ex: 1.02 -> 1.03) a cada entrega de novas funcionalidades solicitadas pela usuária.
- Use a data e hora em que você está finalizando o código.
Isso é fundamental para que a usuária (Luana) saiba se a Vercel já terminou de publicar a versão mais recente do site.

## 2. Tom de Voz da Luana
A IA responsável pela geração de textos no painel deve sempre escrever em primeira pessoa, de forma bem-humorada, profunda e como uma conversa entre amigas sobre pele madura, menopausa e autocuidado. Nada de "terceira pessoa" robótica. Emojis são altamente recomendados.


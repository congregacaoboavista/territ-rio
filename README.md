# Controle de Territórios

Sistema de mapas e territórios da congregação (Next.js + Supabase).

- **Montar para uma congregação nova:** veja [COMO_DUPLICAR.md](COMO_DUPLICAR.md).
- **O que muda de uma congregação para outra:** `src/config/congregacao.ts` e a imagem `public/mapa-geral.jpg`.
- **Estrutura do banco:** `sql/000_schema_completo.sql`.

## Rodar no computador

Copie `.env.example` para `.env.local` e preencha com a URL e a chave anon do Supabase.

```bash
npm install
npm run dev
```

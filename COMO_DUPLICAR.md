# Como montar o sistema para uma congregação nova

Cada congregação tem as próprias contas: GitHub, Supabase e Vercel separados.
O sistema começa vazio; os territórios, as quadras e os endereços são
cadastrados pelo painel depois.

Tempo estimado: 15 minutos.

---

## 1. Copiar o código para o GitHub novo

1. Na conta do GitHub da congregação nova, crie um repositório **vazio**
   (sem README).
2. Mande este projeto para lá, com o histórico inteiro.

## 2. Ajustar para a congregação

Edite **só** o arquivo `src/config/congregacao.ts`:

| Campo          | O que é                                              |
|----------------|------------------------------------------------------|
| `nome`         | Aparece no topo: "Territórios **nome**"              |
| `bairroPadrao` | Usado quando o território não tem bairro cadastrado  |
| `tituloAba`    | Nome na aba do navegador                             |
| `mapaImagem`   | Deixe como está (só aumente o `?v=` se trocar a imagem) |
| `REGIOES_MAPA` | Troque por `{}`: as posições são da congregação antiga |

Depois troque a imagem `public/mapa-geral.jpg` pelo mapa da congregação nova
(mesmo nome de arquivo). Se quiser, troque também o ícone `public/logo.png`.

Faça o commit e envie para o GitHub novo.

## 3. Criar o banco no Supabase

1. Na conta do Supabase da congregação, crie um projeto novo
   (região **South America (São Paulo)**).
2. Abra o **SQL Editor**, cole o conteúdo inteiro de
   `sql/000_schema_completo.sql` e clique em **Run**.
   Não rode o `001`, o `002` nem o `003`: o `000` já inclui os três.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon**.

> Plano gratuito do Supabase: no máximo **2 projetos ativos por conta**.
> Um projeto parado por uma semana é pausado; é só reativar no painel.

## 4. Publicar na Vercel

1. Na conta da Vercel da congregação: **Add New → Project** e importe o
   repositório do GitHub **depois** de ele já ter o código (se importar vazio,
   a Vercel não reconhece o Next.js e o site dá 404).
2. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL` = a Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a chave anon
3. Clique em **Deploy**.

> Plano gratuito da Vercel: só publica commits feitos pelo **dono** da conta.
> Se o deploy aparecer como *Blocked*, o e-mail dos commits é de outra conta:
> configure `git config user.email` com o e-mail da conta dona e faça um
> commit novo.

## 5. Primeiro acesso

1. Abra o site e entre em `/login`.
2. Como o banco está vazio, aparece a tela **Primeiro acesso**: crie o
   administrador principal.
3. No painel:
   - **Cadastro**: crie os territórios (nomes terminando no número, ex.
     `TERRITÓRIO 01`), as quadras e os endereços.
   - **Gerenciamento → Responsáveis**: cadastre os grupos e dirigentes.
   - **Designações → Calibrar**: arraste cada território para o lugar certo
     no mapa e clique em **Salvar posições**.

---

## Para rodar no computador

Copie `.env.example` para `.env.local`, preencha com a URL e a chave do
Supabase e rode:

```bash
npm install
npm run dev
```

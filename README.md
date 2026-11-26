# BRV360 • Gestão financeira da casa e das empresas

Sistema web de controle das despesas da Casa, Bravus, Bravinhos e Hub (áreas independentes), publicado em **https://brv360.groupbrv.com.br**.

- **Site:** HTML/CSS/JS estático (esta pasta), publicado pelo GitHub Pages.
- **Banco de dados:** Supabase (PostgreSQL, região São Paulo), com login, regras de acesso por usuário (RLS), histórico automático de alterações e lixeira.
- **Dados financeiros não ficam neste repositório.** Aqui ficam só o código e a estrutura do banco (`db/01_schema.sql`).

## Publicar uma atualização
Edite os arquivos e faça commit na branch `main`. O GitHub Pages publica em ~1 minuto. Troque `?v=N` em `index.html` para forçar os navegadores a baixar a versão nova.

## Estrutura
| Pasta | Conteúdo |
|---|---|
| `index.html`, `styles.css`, `js/` | Aplicação |
| `js/config.js` | Endereço do projeto Supabase e chave pública (anon) |
| `db/01_schema.sql` | Tabelas, regras, gatilhos, segurança |
| `db/03_espacos.sql` | Áreas independentes (Casa, Bravus, Bravinhos, Hub) e acesso por área |
| `tools/gerar_migracao.py` | Gera o SQL de migração a partir da planilha original |

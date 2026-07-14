# 🏗️ Extrator de Vistorias

Ferramenta que transforma um lote de laudos PDF de vistoria (Report & Run) em:

- **Planilha Excel formatada** — farol de controle por unidade, resumo por
  categoria, e detalhamento com a foto de cada não conformidade extraída
  direto do PDF original e classificação automática por tipo de patologia.
- **PDF único consolidado** — com um mapa clicável na primeira página
  (pula direto para o laudo de qualquer unidade) e um botão "Voltar ao mapa"
  em todas as páginas.

Roda **100% no navegador** — nenhum arquivo é enviado para nenhum servidor.
Pode ser usada tanto localmente (duplo-clique no `.bat`) quanto hospedada
no GitHub Pages para qualquer pessoa acessar pelo link.

## Uso local

Duplo-clique em `Abrir Extrator de Vistorias.bat`. Ele builda a ferramenta
na primeira vez (precisa do [Node.js](https://nodejs.org) instalado) e abre
o navegador automaticamente.

## Publicar no GitHub Pages

Veja o passo a passo em [`DEPLOY.md`](./DEPLOY.md).

## Desenvolvimento

```
npm install
npm run dev     # ambiente de desenvolvimento
npm run build   # gera o build de produção em dist/
```

## Estrutura

- `src/lib/` — núcleo de processamento (extração de texto, classificação,
  extração de fotos, mapa do PDF, exportação Excel). Roda dentro de um Web
  Worker (`src/worker/vistoriaWorker.js`) para não travar a interface.
- `src/App.jsx` — interface de arrastar-e-soltar.
- `server/` — servidor estático mínimo, usado apenas para o uso local
  (`.bat`); no GitHub Pages o mesmo build é servido diretamente.

# Plano de evolução do Extrator de Vistorias

Este documento existe para retomar o trabalho entre sessões sem perder contexto.
Sempre que uma fase for concluída, o checkbox é marcado e um commit é feito
imediatamente (com push), antes de seguir para a próxima fase.

Referência de design usada: repositório `mateusm23/Relatorios` (gerador de
relatório semanal de obra da Trinus) — analisado em `js/pdf/pages.js`,
`js/render/mapa.js` e `css/styles.css`.

## Decisões já confirmadas com o usuário

- Ferramenta continua 100% client-side, publicável no GitHub Pages (sem backend).
- PDFs são enviados **primeiro**: a ferramenta detecta as unidades automaticamente
  pelos nomes de arquivo (mesma lógica de `parseUnitCode` já existente) e já
  desenha o mapa inicial com essas unidades marcadas como "Vistoriada" (azul).
- Navegação entre etapas é **livre**, como no repositório de referência — o
  usuário pode pular para qualquer etapa a qualquer momento, sem precisar
  concluir a anterior.
- Categorias do mapa (além de "Vistoriada") são definidas pelo usuário, com
  cor à escolha, e a atribuição de categoria por unidade é manual: o usuário
  clica na caixa da unidade no mapa e escolhe a categoria numa lista.
- Estrutura do prédio (pavimentos, aptos por andar, blocos) é inferida
  automaticamente a partir das unidades detectadas nos PDFs (menor e maior
  pavimento, blocos "A"/"B" detectados, etc.) e pode ser ajustada manualmente
  pelo usuário (adicionar pavimentos/blocos que não têm PDF nenhum).
- Editor de texto rico da página de introdução: biblioteca **Tiptap**
  (funciona 100% no navegador, sem servidor).
- Botão "voltar ao mapa": azul petróleo com fonte branca (a definir tom exato
  durante a implementação, ex. `#0F4C5C`), sem "<<", visual mais executivo.
- Revisão geral de texto: nunca usar travessão (—), evitar frases com "cara
  de IA" em toda a interface, PDF e Excel.
- Paleta de referência (da UI do repositório `Relatorios`, para inspirar o
  wizard, não necessariamente os status do mapa):
  ```
  --azul (fundo escuro/sidebar): #1A2B45
  --azul2: #1B6FBF     --azul3: #1A6EE8
  --verde: #217A3C     --verde-bg: #D4EDDA
  --vermelho: #B91C1C  --vermelho-bg: #FEE2E2
  --laranja: #C05621   --laranja-bg: #FEF3C7
  --amarelo: #F5C800
  --cinza: #64748B     --cinza-cl: #F1F5F9
  --borda: #CBD5E1
  ```

## Ordem das etapas do wizard (livre navegação, não linear)

1. **Upload dos PDFs** — arrasta os laudos; a ferramenta extrai/classifica em
   background e já monta o mapa inicial (unidades detectadas = "Vistoriada").
2. **Mapa / Estrutura do Empreendimento** — ajustar pavimentos/blocos, clicar
   unidade a unidade para trocar categoria, criar categorias novas com cor.
3. **Dados do Relatório** — nome da obra, responsável, datas, construtora,
   gerenciadora.
4. **Capa** — upload de logo da empresa e foto da fachada/obra.
5. **Introdução / Escopo** — editor de texto rico (Tiptap): negrito, cor de
   fonte, tamanho, marcação/destaque, quebras de linha livres.
6. **Gerar** — revisão final e botão para processar e baixar Excel + PDF.

## Fases de implementação

- [x] **Fase 0 — este documento** (`PLAN.md`), commitado antes de qualquer
      código novo. Commit `5033f79`.
- [x] **Fase 1 — Reestruturação do front-end como wizard multi-etapa**
      Sidebar estilo referência (navy `#1A2B45`, etapas numeradas, estado
      ativo com destaque, navegação livre entre etapas). Estado centralizado
      em `src/state/ReportContext.jsx`. Testado ponta a ponta com 29 PDFs
      reais. Commit `d8a3bbe`.
- [x] **Fase 2 — Upload de PDFs move para o passo 1 e auto-popula o mapa**
      Feito junto com a Fase 1: `src/lib/units.js` (novo, compartilhado com
      `pdfmap.js`) detecta unidades pelo nome do arquivo assim que os PDFs
      são soltos; `Step2Map.jsx` já lista as unidades detectadas (versão
      provisória em lista — a grade visual completa entra na Fase 10).
      Commit `d8a3bbe`.
- [x] **Fase 3 — Configuração de estrutura do empreendimento + categorias**
      `src/components/BuildingGrid.jsx` (grade completa clicável, unidade a
      unidade) e `src/components/CategoryManager.jsx` (categorias
      customizadas com cor). `units.js` generalizado para aceitar qualquer
      letra de bloco (A-Z), não só A/B. Testado ponta a ponta: grade de 152
      células, 29 detectadas automaticamente, categoria nova criada e
      atribuída manualmente a uma unidade vazia, processamento final ainda
      funcionando.
- [ ] **Fase 4 — Formulário de dados do relatório**
      Nome da obra, responsável, datas, construtora, gerenciadora.
- [ ] **Fase 5 — Upload de logo + foto de capa**
- [ ] **Fase 6 — Editor de texto rico (Tiptap) para introdução/escopo**
      Conversão do conteúdo rico para comandos de desenho no PDF (pdf-lib
      não renderiza HTML; cada trecho com seu estilo vira uma chamada de
      `drawText` com fonte/tamanho/cor correspondente).
- [ ] **Fase 7 — Nova capa do PDF**
      Painel lateral estilo referência, dados do relatório, logo, foto, sem
      link clicável.
- [ ] **Fase 8 — Página de introdução no PDF** (a partir do texto rico)
- [ ] **Fase 9 — Páginas de resumo com gráficos**
      Farol de Controle, por Categoria, por Unidade — barras e rosca
      desenhadas manualmente em pdf-lib (sem biblioteca de gráfico pronta).
- [ ] **Fase 10 — Mapa reformulado**
      Grid completo do empreendimento (não só unidades com PDF), cor por
      categoria definida pelo usuário, unidades sem categoria aparecem
      neutras.
- [ ] **Fase 11 — Botão "voltar ao mapa" redesenhado**
      Azul petróleo, fonte branca, sem "<<".
- [ ] **Fase 12 — Revisão geral de texto**
      Remover travessões e fraseado genérico em toda a interface, PDF e
      Excel.
- [ ] **Fase 13 — Cabeçalho/rodapé de marca em todas as páginas** (por
      último, conforme pedido)
      Inclui sobrepor o rodapé original "Report & Run" das páginas dos
      laudos individuais por um rodapé "Gerenciadora Trinus" com logo.

## Notas técnicas para retomada

- Módulos atuais relevantes: `src/lib/core.js` (orquestração),
  `src/lib/pdfmap.js` (capa + mapa + navegação), `src/lib/excelExport.js`
  (planilha), `src/lib/farol.js` (cores/limiares compartilhados),
  `src/App.jsx` (interface atual, ainda single-page).
- `farol.js` pode evoluir para um sistema de categorias genérico (lista de
  `{ nome, cor }` definida pelo usuário) em vez de fixo
  regular/atenção/crítico — a ser usado tanto no mapa do PDF quanto,
  possivelmente, no Excel.
- Testes: build com `npm run build`, servir com `npx vite preview`, e
  validar via Puppeteer (instalado temporariamente com
  `npm install -D puppeteer`, removido ao final de cada rodada de testes
  para manter o repositório limpo).
- Deploy: push na branch `main` aciona `.github/workflows/deploy.yml`
  automaticamente.

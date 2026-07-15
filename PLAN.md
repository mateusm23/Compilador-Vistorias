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
- [x] **Fase 4 — Formulário de dados do relatório**
      Já existia desde a Fase 1 (`Step3ReportData.jsx`): nome da obra,
      responsável, datas, construtora, gerenciadora, ligado ao estado
      central. Sem mudanças necessárias nesta fase.
- [x] **Fase 5 — Upload de logo + foto de capa**
      Já existia desde a Fase 1 (`Step4Cover.jsx`): upload com preview,
      ligado ao estado central. Sem mudanças necessárias nesta fase.
- [x] **Fase 6 — Editor de texto rico (Tiptap) para introdução/escopo**
      `src/components/RichTextEditor.jsx`: negrito, itálico, sublinhado,
      tamanho de fonte, cor de texto, marca-texto, alinhamento. Conteúdo
      salvo como JSON do Tiptap em `introContent` — a conversão para
      comandos de desenho no PDF fica para a Fase 8. Testado: formatação
      aplicada corretamente e capturada no HTML do editor.
- [x] **Fase 7 — Nova capa do PDF**
      Dados do relatório (obra, responsável, construtora, gerenciadora),
      logo e foto da capa embutidos (`embedJpg`/`embedPng`, com fallback
      silencioso para formatos não suportados como webp). Link de página
      inteira removido. Fluxo de dados: `Step6Generate.jsx` → worker →
      `core.js` → `addNavigation`. Testado ponta a ponta com imagens reais:
      capa renderiza corretamente com logo, foto, dados preenchidos, e 0
      anotações de link confirmadas por leitura direta do PDF gerado.
- [x] **Fase 8 — Página de introdução no PDF** (a partir do texto rico)
      `src/lib/introRender.js`: converte o JSON do Tiptap em página(s) de
      PDF, com quebra de linha por largura real do texto, negrito/itálico
      (fontes Helvetica Oblique/BoldOblique), cor, tamanho, marca-texto e
      alinhamento. Insere as páginas entre mapa e laudos, ajustando todos os
      offsets e o botão de voltar automaticamente. Se o texto estiver vazio,
      nenhuma página é criada. Testado com texto longo (várias linhas) e
      sem texto nenhum — links e numeração de página corretos nos dois
      casos.
- [x] **Fase 10 — Mapa reformulado**
      Grade completa do empreendimento (todos os pavimentos/blocos
      configurados, não só as unidades com PDF), cor por categoria definida
      pelo usuário (não mais farol de severidade), legenda dinâmica, blocos
      generalizados (não mais fixo em A/B). Unidades sem categoria aparecem
      como caixa vazia tracejada. Link no mapa só existe se a unidade tiver
      laudo de verdade. Testado: 29 unidades com PDF geram exatamente 29
      links; uma unidade sem PDF categorizada manualmente ("Não Liberado")
      aparece colorida mas sem link.
- [x] **Fase 11 — Botão "voltar ao mapa" redesenhado**
      Azul petróleo (#0F4C5C), sem "<<", largura calculada pelo texto real.
- [x] **Fase 9 — Página de resumo executivo com gráficos**
      `src/lib/summaryRender.js`: rosca do farol de controle (fatias via
      `drawSvgPath` com arco SVG, furo central desenhado por cima) e barras
      horizontais de não conformidades por categoria, lado a lado numa
      página inserida após capa+mapa+introdução. Testado com os 42 PDFs
      reais: rosca com as cores e contagens certas (30/9/3), barras
      ordenadas por volume batendo com os números já validados no Excel.
      Offsets e link de volta ao mapa continuam corretos com a página
      extra.
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

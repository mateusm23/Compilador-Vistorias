# Publicar no GitHub Pages

A ferramenta roda 100% no navegador (nenhum backend necessário) — os PDFs
nunca saem do computador de quem está usando, mesmo hospedada no GitHub Pages.

## Passo a passo

1. Crie um repositório novo no GitHub (pode ser público ou privado — Pages
   funciona nos dois, privado exige GitHub Pro/Team/Enterprise).
2. Dentro desta pasta (`ferramenta/`), rode:
   ```
   git init
   git add .
   git commit -m "Extrator de Vistorias"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings → Pages** do repositório e em "Build and
   deployment" selecione **Source: GitHub Actions**.
4. O workflow em `.github/workflows/deploy.yml` já está pronto — ele builda
   e publica automaticamente a cada `push` na branch `main`. Após o primeiro
   push, acompanhe em **Actions** até o job "Deploy para GitHub Pages" ficar
   verde.
5. O link final aparece em **Settings → Pages**, algo como:
   `https://SEU_USUARIO.github.io/SEU_REPO/`

Mande esse link pra qualquer pessoa — ela abre no navegador, arrasta os PDFs
e baixa a planilha e o PDF consolidado, sem instalar nada.

## Uso local (sem GitHub)

Continua funcionando como antes: duplo-clique em
`Abrir Extrator de Vistorias.bat` (roda `npm run build` uma vez antes, se
ainda não tiver rodado). Esse `.bat` só serve o mesmo build estático via
`http://localhost` — é necessário por causa de uma restrição do
Chrome/Edge que impede Web Workers em módulos ES de rodar quando o HTML é
aberto direto do disco (`file://`).

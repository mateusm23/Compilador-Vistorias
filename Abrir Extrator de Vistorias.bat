@echo off
title Extrator de Vistorias
if not exist "%~dp0dist\index.html" (
  echo Preparando a ferramenta pela primeira vez, aguarde...
  call npm --prefix "%~dp0." run build
)
echo Iniciando o Extrator de Vistorias...
echo Uma aba do navegador vai abrir em instantes.
echo NAO FECHE esta janela enquanto estiver usando a ferramenta.
echo.
node "%~dp0server\index.js"
pause

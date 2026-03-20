@echo off
setlocal EnableExtensions EnableDelayedExpansion
title TactiQ — Lanceur
cd /d "%~dp0"

set "OLLAMA_EXE=C:\Users\armel\AppData\Local\Programs\Ollama\ollama.exe"

:: Arrêter Ollama existant
echo [TactiQ] Arret Ollama existant...
taskkill /F /IM "ollama.exe" >nul 2>&1
timeout /t 2 /nobreak >nul

:: Démarrer Ollama avec GPU forcé
echo [TactiQ] Demarrage Ollama (GPU force)...
set "OLLAMA_ORIGINS=*"
set "OLLAMA_GPU_LAYERS=999"
set "CUDA_VISIBLE_DEVICES=0"
set "OLLAMA_NUM_GPU=999"
set "OLLAMA_FLASH_ATTENTION=1"
start "" /B "%OLLAMA_EXE%" serve
timeout /t 4 /nobreak >nul

:: Lancer TactiQ
echo [TactiQ] Lancement application...
start "" /B node_modules\.bin\electron.cmd .

echo [TactiQ] Pret.
timeout /t 2 /nobreak >nul
endlocal

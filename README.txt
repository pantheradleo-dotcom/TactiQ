TactiQ — Application desktop
============================

PRÉREQUIS
---------
1. Node.js LTS installé (https://nodejs.org)
2. Ollama installé (https://ollama.com)

BUILD (une seule fois)
----------------------
Double-cliquez sur : build.bat

Le build télécharge Electron (~180MB) et génère dist\TactiQ.exe
Durée : 2-5 minutes selon la connexion.

UTILISATION
-----------
Double-cliquez sur : dist\TactiQ.exe
L'application démarre Ollama automatiquement.

STRUCTURE
---------
main.js         — Processus principal Electron
preload.js      — Bridge sécurisé renderer <-> main  
src\index.html  — Interface TactiQ
assets\icon.ico — Icône application
build.bat       — Script de build
package.json    — Configuration npm/electron-builder

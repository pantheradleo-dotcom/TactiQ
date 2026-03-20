#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_FILE="$SCRIPT_DIR/tactiq.html"

# ── 1. Ollama ────────────────────────────────────────────────
echo "[Tactiq] Vérification d'Ollama..."
if pgrep -x "ollama" > /dev/null 2>&1; then
    echo "[Tactiq] Ollama déjà actif — réutilisation."
    OLLAMA_PID=""
else
    echo "[Tactiq] Démarrage d'Ollama..."
    OLLAMA_ORIGINS="*" ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    sleep 3
    echo "[Tactiq] Ollama démarré (PID $OLLAMA_PID)."
fi

# ── 2. Pré-charger le modèle ─────────────────────────────────
echo "[Tactiq] Chargement du modèle mistral:latest..."
ollama run mistral:latest "" > /dev/null 2>&1 &
sleep 2

# ── 3. Navigateur ────────────────────────────────────────────
echo "[Tactiq] Lancement du navigateur..."
CHROME_FLAGS="--allow-file-access-from-files --disable-web-security --user-data-dir=/tmp/chrome_tactiq"
BROWSER=""
BROWSER_TYPE=""

if command -v brave-browser-stable &>/dev/null; then
    BROWSER="brave-browser-stable"; BROWSER_TYPE="chrome"
elif command -v brave-browser &>/dev/null; then
    BROWSER="brave-browser"; BROWSER_TYPE="chrome"
elif command -v brave &>/dev/null; then
    BROWSER="brave"; BROWSER_TYPE="chrome"
elif command -v google-chrome &>/dev/null; then
    BROWSER="google-chrome"; BROWSER_TYPE="chrome"
elif command -v google-chrome-stable &>/dev/null; then
    BROWSER="google-chrome-stable"; BROWSER_TYPE="chrome"
elif command -v chromium-browser &>/dev/null; then
    BROWSER="chromium-browser"; BROWSER_TYPE="chrome"
elif command -v chromium &>/dev/null; then
    BROWSER="chromium"; BROWSER_TYPE="chrome"
elif command -v firefox &>/dev/null; then
    BROWSER="firefox"; BROWSER_TYPE="firefox"
fi

if [ -z "$BROWSER" ]; then
    echo "[ERREUR] Aucun navigateur trouvé (Brave, Chrome, Chromium ou Firefox)."
    [ -n "$OLLAMA_PID" ] && kill $OLLAMA_PID 2>/dev/null
    exit 1
fi

echo "[Tactiq] Navigateur : $BROWSER ($BROWSER_TYPE)"

if [ "$BROWSER_TYPE" = "firefox" ]; then
    echo "[Tactiq] Firefox — CORS géré par OLLAMA_ORIGINS=*"
    "$BROWSER" "file://$APP_FILE" &
    wait $!
else
    "$BROWSER" $CHROME_FLAGS "file://$APP_FILE"
fi

# ── 4. Arrêt Ollama (seulement si lancé par ce script) ───────
if [ -n "$OLLAMA_PID" ]; then
    echo "[Tactiq] Arrêt d'Ollama..."
    kill $OLLAMA_PID 2>/dev/null
    pkill -f "ollama serve" 2>/dev/null
fi
echo "[Tactiq] Terminé."

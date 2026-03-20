const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const path   = require('path')
const { spawn } = require('child_process')
const fs     = require('fs')
const http   = require('http')

const OLLAMA_PORT = 11434
const OLLAMA_EXE  = path.join(process.env.LOCALAPPDATA||'', 'Programs','Ollama','ollama.exe')

let mainWindow = null
let ollamaProc = null
let tesseractWorker = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1300, height: 860, minWidth: 960, minHeight: 640,
    title: 'TactiQ', backgroundColor: '#f4f6f9',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true, show: false
  })
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  mainWindow.on('closed', () => { mainWindow = null })
}

function checkOllamaRunning () {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${OLLAMA_PORT}/api/tags`, res => { res.resume(); resolve(true) })
    req.on('error', () => resolve(false))
    req.setTimeout(1500, () => { req.destroy(); resolve(false) })
  })
}

function startOllama () {
  // Ollama est démarré par le lanceur .bat avec les variables GPU correctes.
  // main.js vérifie juste qu'il tourne, et le démarre en fallback si besoin.
  if (!fs.existsSync(OLLAMA_EXE)) { console.log('[TactiQ] Ollama introuvable'); return }
  checkOllamaRunning().then(running => {
    if (running) { console.log('[TactiQ] Ollama déjà actif (GPU)'); return }
    // Fallback : démarrer avec variables GPU si lancé sans le .bat
    console.log('[TactiQ] Démarrage Ollama (fallback)...')
    ollamaProc = spawn(OLLAMA_EXE, ['serve'], {
      env: {
        ...process.env,
        OLLAMA_ORIGINS: '*',
        OLLAMA_GPU_LAYERS: '999',
        CUDA_VISIBLE_DEVICES: '0',
        OLLAMA_NUM_GPU: '999',
        OLLAMA_FLASH_ATTENTION: '1',
      },
      detached: false, stdio: 'ignore'
    })
    ollamaProc.on('error', e => console.error('[TactiQ] Ollama erreur:', e))
    ollamaProc.on('exit',  c => console.log('[TactiQ] Ollama arrêté, code:', c))
  })
}

function stopOllama () { if (ollamaProc) { ollamaProc.kill(); ollamaProc = null } }

// ── IPC : chemins app ─────────────────────────────────────────
ipcMain.handle('get-app-paths', () => ({
  appDir:      __dirname,
  nodeModules: path.join(__dirname, 'node_modules')
}))

// ── IPC : parse PDF natif via pdf-parse ──────────────────────
ipcMain.handle('parse-pdf', async (event, filePath) => {
  try {
    const pdfParse = require('pdf-parse')
    const buf  = fs.readFileSync(filePath)
    const data = await pdfParse(buf)
    const text = (data.text || '').trim()
    return { success: true, text, pages: data.numpages, isScanned: text.length < 100 }
  } catch (e) {
    return { success: false, error: e.message, isScanned: true }
  }
})

// ── IPC : OCR via Tesseract.js (Node) sur images base64 ──────
// Le renderer envoie les pages PDF rendues en base64 PNG (via pdfjs dans le browser)
// Le main process fait l'OCR via Tesseract.js Node
ipcMain.handle('ocr-image', async (event, imageBase64) => {
  try {
    if (!tesseractWorker) {
      const { createWorker } = require('tesseract.js')
      tesseractWorker = await createWorker(['fra', 'eng'], 1)
    }
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const result = await tesseractWorker.recognize(imageBuffer)
    return { success: true, text: result.data.text }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ── IPC : dialog fichier ──────────────────────────────────────
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Documents', extensions: ['txt', 'md', 'pdf'] }]
  })
  if (result.canceled) return []
  return result.filePaths.map(fp => ({ path: fp, name: path.basename(fp), ext: path.extname(fp).toLowerCase().slice(1) }))
})

// ── IPC : lire fichier texte ──────────────────────────────────
ipcMain.handle('read-text-file', async (event, filePath) => {
  try { return { success: true, text: fs.readFileSync(filePath, 'utf8') } }
  catch (e) { return { success: false, error: e.message } }
})

// ── IPC : lire fichier base64 ────────────────────────────────
ipcMain.handle('read-file-base64', async (event, filePath) => {
  try { return { success: true, data: fs.readFileSync(filePath).toString('base64') } }
  catch (e) { return { success: false, error: e.message } }
})

app.whenReady().then(() => {
  startOllama()
  setTimeout(createWindow, 1200)
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => {
  stopOllama()
  if (tesseractWorker) tesseractWorker.terminate()
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => {
  stopOllama()
  if (tesseractWorker) tesseractWorker.terminate()
})

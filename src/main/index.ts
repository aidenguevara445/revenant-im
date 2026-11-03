import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC } from '../shared/ipc'
import * as keystore from './keystore'
import * as team from './team'
import * as settings from './settings'
import type { KeyMeta, ProviderKind } from '../shared/types'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAICompatibleProvider } from './providers/openaiCompatible'
import { ProviderError } from './providers/types'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.revenant.im')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ── IPC handlers for keystore ──────────────────────────────────

  // List all stored keys (metadata only, no key values)
  ipcMain.handle(IPC.keysList, async (): Promise<KeyMeta[]> => {
    return keystore.listKeys()
  })

  // Save or update a key
  ipcMain.handle(
    IPC.keysSave,
    async (
      _event,
      args: {
        label: string
        provider: ProviderKind
        key: string
        baseUrl?: string
        id?: string
      }
    ): Promise<{ success: boolean; keyId?: string; error?: string }> => {
      try {
        const keyId = keystore.saveKey(args.label, args.provider, args.key, args.baseUrl, args.id)
        return { success: true, keyId }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Delete a key
  ipcMain.handle(
    IPC.keysDelete,
    async (_event, keyId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        keystore.deleteKey(keyId)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Test a key (placeholder for now, will call provider adapter later)
  ipcMain.handle(
    IPC.keysTest,
    async (_event, keyId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // Get the key and its metadata
        const apiKey = keystore.getKey(keyId)
        const meta = keystore.getKeyMeta(keyId)

        // Create appropriate provider
        let provider
        if (meta.provider === 'anthropic') {
          provider = new AnthropicProvider({ apiKey })
        } else if (meta.provider === 'openai-compatible') {
          if (!meta.baseUrl) {
            return { success: false, error: 'Base URL is missing for OpenAI-compatible provider' }
          }
          provider = new OpenAICompatibleProvider({ apiKey, baseUrl: meta.baseUrl })
        } else {
          return { success: false, error: `Unknown provider: ${meta.provider}` }
        }

        // Make a minimal test request with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        try {
          await provider.chat(
            {
              model: 'test',
              messages: [{ role: 'user', content: 'test' }],
              maxTokens: 1
            },
            controller.signal
          )
          clearTimeout(timeoutId)
          return { success: true }
        } catch (err) {
          clearTimeout(timeoutId)
          if (err instanceof ProviderError) {
            // Map ProviderError kinds to user-friendly messages
            const messages: Record<string, string> = {
              auth: 'Wrong key or unauthorized',
              rate_limit: 'Rate limited',
              network: 'Network error',
              bad_request: 'Invalid request (may need different model)',
              server: 'Server error'
            }
            return { success: false, error: messages[err.kind] || err.message }
          }
          return { success: false, error: String(err) }
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── IPC handlers for team and settings (placeholders) ──────────

  ipcMain.handle(IPC.teamGet, async () => {
    return team.getTeam()
  })

  ipcMain.handle(IPC.teamSet, async (_event, teamData) => {
    try {
      team.setTeam(teamData)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.settingsGet, async () => {
    return settings.getSettings()
  })

  ipcMain.handle(IPC.settingsSet, async (_event, partial) => {
    try {
      settings.updateSettings(partial)
      return { success: true }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ───────────────────────────────────────────────────────────────

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC } from '../shared/ipc'
import * as keystore from './keystore'
import type { KeyMeta, ProviderKind } from '../shared/types'

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
        // For now, just verify we can decrypt the key
        keystore.getKey(keyId)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // ── IPC handlers for team and settings (placeholders) ──────────

  ipcMain.handle(IPC.teamGet, async () => {
    // TODO: implement team storage
    return { main: null, buddies: [] }
  })

  ipcMain.handle(IPC.teamSet, async () => {
    // TODO: implement team storage
    return { success: true }
  })

  ipcMain.handle(IPC.settingsGet, async () => {
    // TODO: implement settings storage
    return { maxAttempts: 2, escalationTarget: 'main', muted: false }
  })

  ipcMain.handle(IPC.settingsSet, async () => {
    // TODO: implement settings storage
    return { success: true }
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

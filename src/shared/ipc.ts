// IPC channel names declared once, shared between main and renderer.
// Keeping these in one place avoids typos and keeps the preload bridge typed.

export const IPC = {
  keysList: 'keys:list',
  keysSave: 'keys:save',
  keysDelete: 'keys:delete',
  keysTest: 'keys:test',
  teamGet: 'team:get',
  teamSet: 'team:set',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

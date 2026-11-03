// Keystore: encrypted API key storage using Electron safeStorage.
// Keys are stored in userData/keys.json with values encrypted by the OS keychain.
// The renderer NEVER receives the actual key values, only metadata.

import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { KeyMeta, ProviderKind } from '../shared/types'

interface StoredKey {
  id: string
  label: string
  provider: ProviderKind
  baseUrl?: string
  encryptedValue: string // Base64-encoded encrypted data
}

interface KeyStoreData {
  keys: StoredKey[]
}

const STORE_FILE = join(app.getPath('userData'), 'keys.json')

/** Load the key store from disk. Returns empty store if file doesn't exist. */
function loadStore(): KeyStoreData {
  if (!existsSync(STORE_FILE)) {
    return { keys: [] }
  }
  try {
    const raw = readFileSync(STORE_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && Array.isArray(parsed.keys)) {
      return parsed as KeyStoreData
    }
    return { keys: [] }
  } catch {
    return { keys: [] }
  }
}

/** Save the key store to disk. */
function saveStore(data: KeyStoreData): void {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    throw new Error(`Failed to save keys: ${err}`, { cause: err })
  }
}

/** Generate a unique key ID. */
function generateId(): string {
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Save a new API key or update an existing one.
 * @param label - User-friendly label (e.g., "My Anthropic Key")
 * @param provider - Provider kind
 * @param key - The actual API key (encrypted before storage)
 * @param baseUrl - Optional base URL for openai-compatible providers
 * @param id - Optional ID to update an existing key
 * @returns The key ID
 * @throws If safeStorage is not available
 */
export function saveKey(
  label: string,
  provider: ProviderKind,
  key: string,
  baseUrl?: string,
  id?: string
): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available on this system. Cannot store API keys securely.')
  }

  const store = loadStore()
  const keyId = id || generateId()

  // Encrypt the key value
  const buffer = safeStorage.encryptString(key)
  const encryptedValue = buffer.toString('base64')

  const storedKey: StoredKey = {
    id: keyId,
    label,
    provider,
    baseUrl,
    encryptedValue
  }

  // Update existing or add new
  const existingIndex = store.keys.findIndex((k) => k.id === keyId)
  if (existingIndex >= 0) {
    store.keys[existingIndex] = storedKey
  } else {
    store.keys.push(storedKey)
  }

  saveStore(store)
  return keyId
}

/**
 * List all stored keys (metadata only, no actual key values).
 * @returns Array of KeyMeta
 */
export function listKeys(): KeyMeta[] {
  const store = loadStore()
  return store.keys.map((k) => ({
    id: k.id,
    label: k.label,
    provider: k.provider,
    baseUrl: k.baseUrl,
    hasKey: true
  }))
}

/**
 * Delete a key by ID.
 * @param id - Key ID to delete
 */
export function deleteKey(id: string): void {
  const store = loadStore()
  store.keys = store.keys.filter((k) => k.id !== id)
  saveStore(store)
}

/**
 * Get the decrypted key value for a provider (main process only).
 * @param id - Key ID
 * @returns The decrypted API key
 * @throws If key not found or decryption fails
 */
export function getKey(id: string): string {
  const store = loadStore()
  const storedKey = store.keys.find((k) => k.id === id)
  if (!storedKey) {
    throw new Error(`Key not found: ${id}`)
  }

  try {
    const buffer = Buffer.from(storedKey.encryptedValue, 'base64')
    return safeStorage.decryptString(buffer)
  } catch (err) {
    throw new Error(`Failed to decrypt key: ${err}`, { cause: err })
  }
}

/**
 * Get key metadata by ID.
 * @param id - Key ID
 * @returns KeyMeta with provider and baseUrl
 * @throws If key not found
 */
export function getKeyMeta(id: string): KeyMeta {
  const store = loadStore()
  const storedKey = store.keys.find((k) => k.id === id)
  if (!storedKey) {
    throw new Error(`Key not found: ${id}`)
  }
  return {
    id: storedKey.id,
    label: storedKey.label,
    provider: storedKey.provider,
    baseUrl: storedKey.baseUrl,
    hasKey: true
  }
}

/**
 * Get a key by provider and optional label (convenience for orchestrator).
 * Returns the first matching key.
 * @param provider - Provider kind
 * @param labelHint - Optional label to match
 * @returns The decrypted API key
 * @throws If no matching key found
 */
export function getKeyForProvider(provider: ProviderKind, labelHint?: string): string {
  const store = loadStore()
  let storedKey: StoredKey | undefined

  if (labelHint) {
    storedKey = store.keys.find((k) => k.provider === provider && k.label === labelHint)
  }
  if (!storedKey) {
    storedKey = store.keys.find((k) => k.provider === provider)
  }

  if (!storedKey) {
    throw new Error(`No key found for provider: ${provider}`)
  }

  try {
    const buffer = Buffer.from(storedKey.encryptedValue, 'base64')
    return safeStorage.decryptString(buffer)
  } catch (err) {
    throw new Error(`Failed to decrypt key: ${err}`, { cause: err })
  }
}

// Unit tests for keystore.ts with mocked Electron safeStorage.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveKey, listKeys, deleteKey, getKey, getKeyForProvider } from './keystore'

// Mock Electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData')
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from(`encrypted:${str}`, 'utf-8')),
    decryptString: vi.fn((buffer: Buffer) => {
      const str = buffer.toString('utf-8')
      if (str.startsWith('encrypted:')) {
        return str.slice('encrypted:'.length)
      }
      throw new Error('Invalid encrypted data')
    })
  }
}))

// Mock fs module
let mockFileData: string | null = null

vi.mock('fs', () => {
  const readFileSync = vi.fn(() => {
    if (mockFileData === null) {
      throw new Error('ENOENT')
    }
    return mockFileData
  })
  const writeFileSync = vi.fn((_path: string, data: string) => {
    mockFileData = data
  })
  const existsSync = vi.fn(() => mockFileData !== null)

  return {
    default: { readFileSync, writeFileSync, existsSync },
    readFileSync,
    writeFileSync,
    existsSync
  }
})

describe('keystore', () => {
  beforeEach(() => {
    // Reset mock file data before each test
    mockFileData = null
  })

  describe('saveKey', () => {
    it('should save a new key and return its ID', () => {
      const keyId = saveKey('My Key', 'anthropic', 'sk-ant-test123')

      expect(keyId).toMatch(/^key-\d+-[a-z0-9]+$/)

      const data = JSON.parse(mockFileData!)
      expect(data.keys).toHaveLength(1)
      expect(data.keys[0].label).toBe('My Key')
      expect(data.keys[0].provider).toBe('anthropic')
      expect(data.keys[0].encryptedValue).toBeDefined()
      // Encrypted value is base64 encoded
      const decoded = Buffer.from(data.keys[0].encryptedValue, 'base64').toString('utf-8')
      expect(decoded).toBe('encrypted:sk-ant-test123')
    })

    it('should save a key with baseUrl for openai-compatible provider', () => {
      const keyId = saveKey(
        'DeepSeek Key',
        'openai-compatible',
        'sk-deepseek-123',
        'https://api.deepseek.com'
      )

      expect(keyId).toBeDefined()

      const data = JSON.parse(mockFileData!)
      expect(data.keys[0].baseUrl).toBe('https://api.deepseek.com')
    })

    it('should update an existing key when ID is provided', () => {
      const keyId1 = saveKey('Original', 'anthropic', 'old-key')
      const keyId2 = saveKey('Updated', 'anthropic', 'new-key', undefined, keyId1)

      expect(keyId1).toBe(keyId2)

      const data = JSON.parse(mockFileData!)
      expect(data.keys).toHaveLength(1)
      expect(data.keys[0].label).toBe('Updated')
      // Check that new key is encrypted
      const decoded = Buffer.from(data.keys[0].encryptedValue, 'base64').toString('utf-8')
      expect(decoded).toBe('encrypted:new-key')
      expect(mockFileData).not.toContain('old-key')
    })

    it('should throw if encryption is not available', async () => {
      const electron = await import('electron')
      vi.mocked(electron.safeStorage.isEncryptionAvailable).mockReturnValueOnce(false)

      expect(() => {
        saveKey('Test', 'anthropic', 'test-key')
      }).toThrow('Encryption not available')
    })
  })

  describe('listKeys', () => {
    it('should return empty array when no keys are saved', () => {
      const keys = listKeys()
      expect(keys).toEqual([])
    })

    it('should return metadata for all saved keys', () => {
      const id1 = saveKey('Key 1', 'anthropic', 'key1')
      const id2 = saveKey('Key 2', 'openai-compatible', 'key2', 'https://api.example.com')

      const keys = listKeys()

      expect(keys).toHaveLength(2)
      expect(keys[0]).toEqual({
        id: id1,
        label: 'Key 1',
        provider: 'anthropic',
        hasKey: true
      })
      expect(keys[1]).toEqual({
        id: id2,
        label: 'Key 2',
        provider: 'openai-compatible',
        baseUrl: 'https://api.example.com',
        hasKey: true
      })
    })

    it('should not include actual key values in metadata', () => {
      saveKey('Secret Key', 'anthropic', 'sk-super-secret-123')
      const keys = listKeys()

      expect(keys[0]).not.toHaveProperty('encryptedValue')
      expect(JSON.stringify(keys)).not.toContain('sk-super-secret-123')
    })
  })

  describe('deleteKey', () => {
    it('should remove a key by ID', () => {
      const id1 = saveKey('Key 1', 'anthropic', 'key1')
      const id2 = saveKey('Key 2', 'anthropic', 'key2')

      deleteKey(id1)

      const keys = listKeys()
      expect(keys).toHaveLength(1)
      expect(keys[0].id).toBe(id2)
    })

    it('should do nothing if key ID does not exist', () => {
      saveKey('Key 1', 'anthropic', 'key1')

      expect(() => {
        deleteKey('nonexistent-id')
      }).not.toThrow()

      const keys = listKeys()
      expect(keys).toHaveLength(1)
    })
  })

  describe('getKey', () => {
    it('should return the decrypted key value', () => {
      const keyId = saveKey('Test Key', 'anthropic', 'sk-ant-secret')
      const decrypted = getKey(keyId)

      expect(decrypted).toBe('sk-ant-secret')
    })

    it('should throw if key not found', () => {
      expect(() => {
        getKey('nonexistent-id')
      }).toThrow('Key not found')
    })

    it('should throw if decryption fails', async () => {
      const keyId = saveKey('Test Key', 'anthropic', 'sk-ant-test')

      // Mock decryptString to throw an error
      const electron = await import('electron')
      vi.mocked(electron.safeStorage.decryptString).mockImplementationOnce(() => {
        throw new Error('Decryption failed')
      })

      expect(() => {
        getKey(keyId)
      }).toThrow('Failed to decrypt key')
    })
  })

  describe('getKeyForProvider', () => {
    it('should return the first key for a provider', () => {
      saveKey('Anthropic Key 1', 'anthropic', 'sk-ant-1')
      saveKey('Anthropic Key 2', 'anthropic', 'sk-ant-2')
      saveKey('OpenAI Key', 'openai-compatible', 'sk-oai-1')

      const key = getKeyForProvider('anthropic')
      expect(key).toBe('sk-ant-1')
    })

    it('should return a key matching the label hint', () => {
      saveKey('Primary', 'anthropic', 'sk-ant-primary')
      saveKey('Secondary', 'anthropic', 'sk-ant-secondary')

      const key = getKeyForProvider('anthropic', 'Secondary')
      expect(key).toBe('sk-ant-secondary')
    })

    it('should fall back to first key if label hint does not match', () => {
      saveKey('Key 1', 'anthropic', 'sk-ant-1')
      saveKey('Key 2', 'anthropic', 'sk-ant-2')

      const key = getKeyForProvider('anthropic', 'Nonexistent')
      expect(key).toBe('sk-ant-1')
    })

    it('should throw if no key exists for provider', () => {
      saveKey('OpenAI Key', 'openai-compatible', 'sk-oai-1')

      expect(() => {
        getKeyForProvider('anthropic')
      }).toThrow('No key found for provider: anthropic')
    })
  })

  describe('integration: save, list, get, delete flow', () => {
    it('should handle a full lifecycle', () => {
      // Start with no keys
      expect(listKeys()).toHaveLength(0)

      // Save a key
      const keyId = saveKey('Test Key', 'anthropic', 'sk-ant-test-key')
      expect(listKeys()).toHaveLength(1)

      // Retrieve the decrypted value
      const decrypted = getKey(keyId)
      expect(decrypted).toBe('sk-ant-test-key')

      // Update the key
      saveKey('Updated Key', 'anthropic', 'sk-ant-updated', undefined, keyId)
      expect(listKeys()).toHaveLength(1)
      expect(listKeys()[0].label).toBe('Updated Key')
      expect(getKey(keyId)).toBe('sk-ant-updated')

      // Delete the key
      deleteKey(keyId)
      expect(listKeys()).toHaveLength(0)
    })
  })
})

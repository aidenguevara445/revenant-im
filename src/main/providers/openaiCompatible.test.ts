/**
 * Tests for OpenAI-compatible provider adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenAICompatibleProvider } from './openaiCompatible'
import { ProviderError } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as typeof fetch

describe('OpenAICompatibleProvider', () => {
  let provider: OpenAICompatibleProvider

  beforeEach(() => {
    provider = new OpenAICompatibleProvider({
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1'
    })
    mockFetch.mockReset()
  })

  it('should make a successful chat request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello, world!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      })
    })

    const result = await provider.chat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }]
    })

    expect(result).toEqual({
      text: 'Hello, world!',
      usage: { inputTokens: 10, outputTokens: 5 }
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key'
        })
      })
    )
  })

  it('should work without API key for local providers', async () => {
    const localProvider = new OpenAICompatibleProvider({
      baseUrl: 'http://localhost:11434/v1'
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 }
      })
    })

    await localProvider.chat({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'Hello' }]
    })

    const call = mockFetch.mock.calls[0]
    const headers = call[1].headers
    expect(headers.Authorization).toBeUndefined()
  })

  it('should include system message in messages array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 20, completion_tokens: 10 }
      })
    })

    await provider.chat({
      model: 'gpt-4o',
      system: 'You are a helpful assistant',
      messages: [{ role: 'user', content: 'Hello' }]
    })

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' })
  })

  it('should use custom maxTokens', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 }
      })
    })

    await provider.chat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      maxTokens: 1000
    })

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.max_tokens).toBe(1000)
  })

  it('should throw ProviderError on auth failure (401)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Invalid API key'
    })

    try {
      await provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('auth')
    }
  })

  it('should throw ProviderError on rate limit (429)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded'
    })

    try {
      await provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('rate_limit')
    }
  })

  it('should throw ProviderError on bad request (400)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid request'
    })

    try {
      await provider.chat({
        model: 'invalid-model',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('bad_request')
    }
  })

  it('should throw ProviderError on server error (500)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal server error'
    })

    try {
      await provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('server')
    }
  })

  it('should throw ProviderError on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))

    try {
      await provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('network')
    }
  })

  it('should handle abort signal', async () => {
    const abortController = new AbortController()
    mockFetch.mockImplementationOnce(() => {
      abortController.abort()
      return Promise.reject(new Error('Aborted'))
    })

    try {
      await provider.chat(
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }]
        },
        abortController.signal
      )
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('network')
      expect((err as ProviderError).message).toContain('cancelled')
    }
  })

  it('should throw on invalid JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      }
    })

    try {
      await provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('server')
      expect((err as ProviderError).message).toContain('Invalid JSON')
    }
  })

  it('should throw on missing choices in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      })
    })

    try {
      await provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('server')
    }
  })

  it('should throw on missing usage data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello' } }]
      })
    })

    try {
      await provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('server')
      expect((err as ProviderError).message).toContain('usage')
    }
  })

  it('should use exact model ID provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      })
    })

    await provider.chat({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hi' }]
    })

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.model).toBe('gpt-4o-mini')
  })

  it('should work with DeepSeek base URL', async () => {
    const deepseekProvider = new OpenAICompatibleProvider({
      apiKey: 'deepseek-key',
      baseUrl: 'https://api.deepseek.com/v1'
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 }
      })
    })

    await deepseekProvider.chat({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Hello' }]
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.any(Object)
    )
  })

  it('should work with Ollama base URL', async () => {
    const ollamaProvider = new OpenAICompatibleProvider({
      baseUrl: 'http://localhost:11434/v1'
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 }
      })
    })

    await ollamaProvider.chat({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'Hello' }]
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.any(Object)
    )
  })
})

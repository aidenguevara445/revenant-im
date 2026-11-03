/**
 * Tests for Anthropic provider adapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnthropicProvider } from './anthropic'
import { ProviderError } from './types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as typeof fetch

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider

  beforeEach(() => {
    provider = new AnthropicProvider({ apiKey: 'test-key' })
    mockFetch.mockReset()
  })

  it('should make a successful chat request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Hello, world!' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      })
    })

    const result = await provider.chat({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hi' }]
    })

    expect(result).toEqual({
      text: 'Hello, world!',
      usage: { inputTokens: 10, outputTokens: 5 }
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
          'anthropic-version': '2023-06-01'
        })
      })
    )
  })

  it('should include system message when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 20, output_tokens: 10 }
      })
    })

    await provider.chat({
      model: 'claude-3-5-haiku-20241022',
      system: 'You are a helpful assistant',
      messages: [{ role: 'user', content: 'Hello' }]
    })

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.system).toBe('You are a helpful assistant')
  })

  it('should use custom maxTokens', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 5, output_tokens: 3 }
      })
    })

    await provider.chat({
      model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
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
          model: 'claude-3-5-sonnet-20241022',
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
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError)
      expect((err as ProviderError).kind).toBe('server')
      expect((err as ProviderError).message).toContain('Invalid JSON')
    }
  })

  it('should throw on missing content in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        usage: { input_tokens: 10, output_tokens: 5 }
      })
    })

    try {
      await provider.chat({
        model: 'claude-3-5-sonnet-20241022',
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
        content: [{ type: 'text', text: 'Hello' }]
      })
    })

    try {
      await provider.chat({
        model: 'claude-3-5-sonnet-20241022',
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
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      })
    })

    await provider.chat({
      model: 'claude-3-opus-20240229',
      messages: [{ role: 'user', content: 'Hi' }]
    })

    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.model).toBe('claude-3-opus-20240229')
  })
})

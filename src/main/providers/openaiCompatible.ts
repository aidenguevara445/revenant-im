/**
 * OpenAI-compatible chat completions API provider adapter.
 * Works with OpenAI, DeepSeek, OpenRouter, Groq, Ollama, LM Studio, etc.
 */

import type { ChatRequest, ChatResult, ModelProvider } from './types'
import { ProviderError } from './types'

export interface OpenAICompatibleConfig {
  apiKey?: string // Optional for local providers like Ollama
  baseUrl: string // e.g., 'https://api.openai.com/v1' or 'http://localhost:11434/v1'
}

export class OpenAICompatibleProvider implements ModelProvider {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResult> {
    const url = `${this.config.baseUrl}/chat/completions`

    const body = {
      model: req.model,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
      ...(req.system
        ? {
            messages: [
              { role: 'system', content: req.system },
              ...req.messages.map((m) => ({ role: m.role, content: m.content }))
            ]
          }
        : {})
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      })
    } catch (err) {
      if (signal?.aborted) {
        throw new ProviderError('network', 'Request was cancelled', err)
      }
      throw new ProviderError('network', `Network error: ${String(err)}`, err)
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      const kind = this.mapHttpStatusToErrorKind(response.status)
      throw new ProviderError(
        kind,
        `OpenAI-compatible API error (${response.status}): ${errorText}`
      )
    }

    let data: {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    try {
      data = await response.json()
    } catch (err) {
      throw new ProviderError('server', 'Invalid JSON response from provider', err)
    }

    // Validate response structure
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new ProviderError('server', 'Invalid response structure: missing choices')
    }

    const choice = data.choices[0]
    if (!choice.message?.content) {
      throw new ProviderError('server', 'Invalid response structure: missing message content')
    }

    const usage = data.usage
    if (
      !usage ||
      typeof usage.prompt_tokens !== 'number' ||
      typeof usage.completion_tokens !== 'number'
    ) {
      throw new ProviderError('server', 'Invalid usage data in response')
    }

    return {
      text: choice.message.content,
      usage: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens
      }
    }
  }

  private mapHttpStatusToErrorKind(status: number): ProviderError['kind'] {
    if (status === 401 || status === 403) return 'auth'
    if (status === 429) return 'rate_limit'
    if (status >= 400 && status < 500) return 'bad_request'
    return 'server'
  }
}

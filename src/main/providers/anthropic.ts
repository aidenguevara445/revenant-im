/**
 * Anthropic Messages API provider adapter.
 */

import type { ChatRequest, ChatResult, ModelProvider } from './types'
import { ProviderError } from './types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export interface AnthropicConfig {
  apiKey: string
}

export class AnthropicProvider implements ModelProvider {
  constructor(private readonly config: AnthropicConfig) {}

  async chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResult> {
    const body = {
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      ...(req.system ? { system: req.system } : {})
    }

    let response: Response
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': ANTHROPIC_VERSION
        },
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
      throw new ProviderError(kind, `Anthropic API error (${response.status}): ${errorText}`)
    }

    let data: {
      content?: Array<{ type: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    try {
      data = await response.json()
    } catch (err) {
      throw new ProviderError('server', 'Invalid JSON response from Anthropic', err)
    }

    // Validate response structure
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new ProviderError('server', 'Invalid response structure from Anthropic')
    }

    const textContent = data.content.find((c) => c.type === 'text')
    if (!textContent?.text) {
      throw new ProviderError('server', 'No text content in Anthropic response')
    }

    const usage = data.usage
    if (
      !usage ||
      typeof usage.input_tokens !== 'number' ||
      typeof usage.output_tokens !== 'number'
    ) {
      throw new ProviderError('server', 'Invalid usage data in Anthropic response')
    }

    return {
      text: textContent.text,
      usage: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens
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

/**
 * Provider types for model communication.
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  model: string
  system?: string
  messages: ChatMessage[]
  maxTokens?: number
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface ChatResult {
  text: string
  usage: TokenUsage
}

export type ProviderErrorKind = 'auth' | 'rate_limit' | 'network' | 'bad_request' | 'server'

export class ProviderError extends Error {
  constructor(
    public readonly kind: ProviderErrorKind,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export interface ModelProvider {
  chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResult>
}

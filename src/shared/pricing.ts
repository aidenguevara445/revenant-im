/**
 * Model pricing table (editable by user).
 * Prices are in USD per million tokens.
 */

export interface ModelPrice {
  inputPerMillion: number
  outputPerMillion: number
}

export type PricingTable = Record<string, ModelPrice>

/**
 * Default pricing table. Users can edit this through the preferences UI.
 * Prices as of November 2026.
 */
export const DEFAULT_PRICING: PricingTable = {
  // Anthropic
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-3-5-sonnet-20240620': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-3-5-haiku-20241022': { inputPerMillion: 0.8, outputPerMillion: 4.0 },
  'claude-3-opus-20240229': { inputPerMillion: 15.0, outputPerMillion: 75.0 },
  'claude-3-sonnet-20240229': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-3-haiku-20240307': { inputPerMillion: 0.25, outputPerMillion: 1.25 },

  // OpenAI
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-4-turbo': { inputPerMillion: 10.0, outputPerMillion: 30.0 },
  'gpt-4': { inputPerMillion: 30.0, outputPerMillion: 60.0 },
  'gpt-3.5-turbo': { inputPerMillion: 0.5, outputPerMillion: 1.5 },

  // DeepSeek
  'deepseek-chat': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-coder': { inputPerMillion: 0.14, outputPerMillion: 0.28 },

  // Ollama and other local models default to free
  'llama3.2': { inputPerMillion: 0, outputPerMillion: 0 },
  'llama3.1': { inputPerMillion: 0, outputPerMillion: 0 },
  'qwen2.5': { inputPerMillion: 0, outputPerMillion: 0 }
}

/**
 * Calculate the cost of a model call in USD.
 * Returns { cost: number, priceKnown: boolean }.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  pricingTable: PricingTable = DEFAULT_PRICING
): { cost: number; priceKnown: boolean } {
  const price = pricingTable[model]
  if (!price) {
    return { cost: 0, priceKnown: false }
  }

  const cost =
    (inputTokens / 1_000_000) * price.inputPerMillion +
    (outputTokens / 1_000_000) * price.outputPerMillion

  return { cost, priceKnown: true }
}

/**
 * Calculate baseline cost if the same tokens were used on a different model.
 */
export function calculateBaselineCost(
  baselineModel: string,
  inputTokens: number,
  outputTokens: number,
  pricingTable: PricingTable = DEFAULT_PRICING
): { cost: number; priceKnown: boolean } {
  return calculateCost(baselineModel, inputTokens, outputTokens, pricingTable)
}

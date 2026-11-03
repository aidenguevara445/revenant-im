import { describe, it, expect } from 'vitest'
import { calculateCost, calculateBaselineCost, DEFAULT_PRICING } from './pricing'

describe('pricing', () => {
  describe('calculateCost', () => {
    it('should calculate cost for a known model', () => {
      const result = calculateCost('gpt-4o-mini', 1_000_000, 500_000)
      expect(result.priceKnown).toBe(true)
      // 1M input @ $0.15 + 500K output @ $0.60 = $0.15 + $0.30 = $0.45
      expect(result.cost).toBeCloseTo(0.45, 2)
    })

    it('should return zero cost and priceKnown=false for unknown model', () => {
      const result = calculateCost('unknown-model', 1_000_000, 500_000)
      expect(result.priceKnown).toBe(false)
      expect(result.cost).toBe(0)
    })

    it('should handle zero tokens', () => {
      const result = calculateCost('gpt-4o-mini', 0, 0)
      expect(result.priceKnown).toBe(true)
      expect(result.cost).toBe(0)
    })

    it('should calculate cost for Claude Sonnet', () => {
      const result = calculateCost('claude-3-5-sonnet-20241022', 2_000_000, 1_000_000)
      expect(result.priceKnown).toBe(true)
      // 2M input @ $3.00 + 1M output @ $15.00 = $6.00 + $15.00 = $21.00
      expect(result.cost).toBeCloseTo(21.0, 2)
    })

    it('should handle free models (local Ollama)', () => {
      const result = calculateCost('llama3.2', 1_000_000, 1_000_000)
      expect(result.priceKnown).toBe(true)
      expect(result.cost).toBe(0)
    })

    it('should use custom pricing table when provided', () => {
      const customPricing = {
        'test-model': { inputPerMillion: 1.0, outputPerMillion: 2.0 }
      }
      const result = calculateCost('test-model', 1_000_000, 500_000, customPricing)
      expect(result.priceKnown).toBe(true)
      // 1M @ $1.00 + 500K @ $2.00 = $1.00 + $1.00 = $2.00
      expect(result.cost).toBeCloseTo(2.0, 2)
    })
  })

  describe('calculateBaselineCost', () => {
    it('should calculate baseline cost for comparison', () => {
      const result = calculateBaselineCost('claude-3-5-sonnet-20241022', 1_000_000, 500_000)
      expect(result.priceKnown).toBe(true)
      // 1M @ $3.00 + 500K @ $15.00 = $3.00 + $7.50 = $10.50
      expect(result.cost).toBeCloseTo(10.5, 2)
    })

    it('should handle unknown baseline model', () => {
      const result = calculateBaselineCost('unknown-model', 1_000_000, 500_000)
      expect(result.priceKnown).toBe(false)
      expect(result.cost).toBe(0)
    })
  })

  describe('DEFAULT_PRICING', () => {
    it('should contain prices for major providers', () => {
      // Anthropic
      expect(DEFAULT_PRICING['claude-3-5-sonnet-20241022']).toBeDefined()
      expect(DEFAULT_PRICING['claude-3-5-haiku-20241022']).toBeDefined()

      // OpenAI
      expect(DEFAULT_PRICING['gpt-4o']).toBeDefined()
      expect(DEFAULT_PRICING['gpt-4o-mini']).toBeDefined()

      // DeepSeek
      expect(DEFAULT_PRICING['deepseek-chat']).toBeDefined()

      // Local models
      expect(DEFAULT_PRICING['llama3.2']).toBeDefined()
    })

    it('should have valid price values', () => {
      Object.values(DEFAULT_PRICING).forEach((price) => {
        expect(price.inputPerMillion).toBeGreaterThanOrEqual(0)
        expect(price.outputPerMillion).toBeGreaterThanOrEqual(0)
        expect(typeof price.inputPerMillion).toBe('number')
        expect(typeof price.outputPerMillion).toBe('number')
      })
    })
  })
})

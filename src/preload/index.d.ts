import type { RevenantAPI } from './index'

declare global {
  interface Window {
    revenant: RevenantAPI
  }
}

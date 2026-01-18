import type { Plugin, Hooks, ProviderWithModels } from "@opencode-ai/plugin"
import type { Model, Config } from "@opencode-ai/sdk"

/**
 * Plugin options that can be set in opencode.json under "combined_models" key
 */
export interface CombinedModelsOptions {
  /** Provider priority order - providers listed first will be tried first */
  provider_priority?: string[]
  /** Minimum number of providers required to create a combined model (default: 2) */
  min_providers?: number
  /** Fallback strategy: "on_error" | "on_rate_limit" | "on_overload" (default: "on_error") */
  strategy?: "on_error" | "on_rate_limit" | "on_overload"
  /** Max retry attempts per provider before moving to next (default: 3) */
  max_attempts?: number
}

function normalizeModelName(modelID: string): string {
  let normalized = modelID.toLowerCase()
  normalized = normalized
    .replace(/^(us|eu|ap|apac|jp|au|global)./, "")
    .replace(/^anthropic./, "")
    .replace(/^openai//, "")
    .replace(/^anthropic//, "")
    .replace(/^google//, "")
    .replace(/^meta-llama//, "")
    .replace(/^mistralai//, "")
  normalized = normalized
    .replace(/-d{8}$/, "")
    .replace(/-vd+:d+$/, "")
    .replace(/:latest$/, "")
    .replace(/-latest$/, "")
    .replace(/@d{4}-d{2}-d{2}$/, "")
    .replace(/-preview$/, "")
  normalized = normalized
    .replace(/./g, "-")
    .replace(/--+/g, "-")
    .replace(/-$/, "")
  return normalized
}

export const CombinedModelsPlugin: Plugin = async (_input) => {
  const hooks: Hooks = {
    "provider.list": async (input, output) => {
      const config = input.config as Config & { combined_models?: CombinedModelsOptions }
      const options = config.combined_models ?? {}
      const providers = output.providers
      
      const providerPriority = options.provider_priority ?? []
      const minProviders = options.min_providers ?? 2
      const strategy = options.strategy ?? "on_error"
      const maxAttempts = options.max_attempts ?? 3

      const modelsByName: Record<string, { providerID: string; model: Model }[]> = {}

      for (const [providerID, provider] of Object.entries(providers)) {
        for (const [modelID, model] of Object.entries(provider.models)) {
          const normalizedName = normalizeModelName(modelID)
          if (!modelsByName[normalizedName]) {
            modelsByName[normalizedName] = []
          }
          modelsByName[normalizedName].push({ providerID, model: model as Model })
        }
      }

      const combinedModels: Record<string, Model> = {}

      for (const [normalizedName, providerModels] of Object.entries(modelsByName)) {
        if (providerModels.length < minProviders) continue

        const sorted = providerModels.sort((a, b) => {
          const indexA = providerPriority.indexOf(a.providerID)
          const indexB = providerPriority.indexOf(b.providerID)
          if (indexA !== -1 && indexB !== -1) return indexA - indexB
          if (indexA !== -1) return -1
          if (indexB !== -1) return 1
          return a.providerID.localeCompare(b.providerID)
        })

        const baseModel = sorted[0].model
        const modelList = sorted.map((p) => p.providerID + "/" + p.model.id)

        combinedModels[normalizedName] = {
          ...baseModel,
          id: normalizedName,
          providerID: "combined",
          name: baseModel.name + " (" + sorted.length + " providers)",
          options: {
            ...baseModel.options,
            combined: {
              models: modelList,
              strategy: strategy,
              max_attempts: maxAttempts,
            },
          },
        }
      }

      if (Object.keys(combinedModels).length > 0) {
        providers["combined"] = {
          id: "combined",
          name: "Combined Models",
          source: "config",
          env: [],
          options: {},
          models: combinedModels,
        }
      }
    },
  }
  return hooks
}

export default CombinedModelsPlugin

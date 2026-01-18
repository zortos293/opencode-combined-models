import type { Plugin, Hooks, ProviderWithModels } from "@opencode-ai/plugin"
import type { Model } from "@opencode-ai/sdk"

export interface CombinedModelsOptions {
  provider_priority?: string[]
  min_providers?: number
  strategy?: "on_error" | "on_rate_limit" | "on_overload"
  max_attempts?: number
}

function normalizeModelName(modelID: string): string {
  let normalized = modelID.toLowerCase()
  return normalized
    .replace(/^(us|eu|ap|apac|jp|au|global)./, "")
    .replace(/^anthropic./, "")
    .replace(/^openai//, "")
    .replace(/^anthropic//, "")
    .replace(/^google//, "")
    .replace(/^meta-llama//, "")
    .replace(/^mistralai//, "")
    .replace(/-d{8}$/, "")
    .replace(/-vd+:d+$/, "")
    .replace(/:latest$/, "")
    .replace(/-latest$/, "")
    .replace(/@d{4}-d{2}-d{2}$/, "")
    .replace(/-preview$/, "")
    .replace(/./g, "-")
    .replace(/--+/g, "-")
    .replace(/-$/, "")
}

async function loadConfig(): Promise<CombinedModelsOptions> {
  try {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    const configPath = home.replace(/\/g, "/") + "/.config/opencode/combined-models.json"
    const file = Bun.file(configPath)
    if (await file.exists()) {
      return await file.json()
    }
  } catch {
    // Config file doesn't exist or can't be parsed
  }
  return {}
}

export const CombinedModelsPlugin: Plugin = async (_input) => {
  const options = await loadConfig()
  const providerPriority = options.provider_priority ?? []
  const minProviders = options.min_providers ?? 2
  const strategy = options.strategy ?? "on_error"
  const maxAttempts = options.max_attempts ?? 3

  const hooks: Hooks = {
    "provider.list": async (_input, output) => {
      const providers = output.providers
      const modelsByName: Record<string, { providerID: string; model: Model }[]> = {}

      for (const [providerID, provider] of Object.entries(providers)) {
        for (const [modelID, model] of Object.entries(provider.models)) {
          const normalizedName = normalizeModelName(modelID)
          if (!modelsByName[normalizedName]) modelsByName[normalizedName] = []
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
            combined: { models: modelList, strategy, max_attempts: maxAttempts },
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

import type { Plugin, Hooks, ProviderWithModels } from "@opencode-ai/plugin"
import type { Model, Config } from "@opencode-ai/sdk"

export interface CombinedModelsOptions {
  provider_priority?: string[]
  min_providers?: number
  strategy?: "on_error" | "on_rate_limit" | "on_overload"
  max_attempts?: number
}

function loadOptions(): CombinedModelsOptions {
  // Try to load config from file
  try {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    const paths = [
      home + "/.config/opencode/combined-models.json",
      home + "/.opencode/combined-models.json",
    ]
    
    for (const p of paths) {
      try {
        const file = Bun.file(p)
        const text = await file.text()
        return JSON.parse(text)
      } catch {
        // File doesn't exist or can't be read
      }
    }
  } catch {
    // Bun.file not available or other error
  }
  return {}
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
    .replace(/-d{8}$/, "")
    .replace(/-vd+:d+$/, "")
    .replace(/:latest$/, "")
    .replace(/-latest$/, "")
    .replace(/@d{4}-d{2}-d{2}$/, "")
    .replace(/-preview$/, "")
    .replace(/./g, "-")
    .replace(/--+/g, "-")
    .replace(/-$/, "")
  return normalized
}

export const CombinedModelsPlugin: Plugin = async (_input) => {
  // Default options - can be overridden by config file
  let providerPriority: string[] = []
  let minProviders = 2
  let strategy = "on_error"
  let maxAttempts = 3

  // Try to load config
  try {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    const configPath = home + "/.config/opencode/combined-models.json"
    const file = Bun.file(configPath)
    if (await file.exists()) {
      const options = await file.json()
      providerPriority = options.provider_priority ?? providerPriority
      minProviders = options.min_providers ?? minProviders
      strategy = options.strategy ?? strategy
      maxAttempts = options.max_attempts ?? maxAttempts
    }
  } catch (e) {
    // Config file doesn't exist or can't be parsed - use defaults
  }

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

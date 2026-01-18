import type { Plugin, Hooks, ProviderWithModels } from "@opencode-ai/plugin"
import type { Model, Config } from "@opencode-ai/sdk"

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
      const config = input.config as Config & { provider_priority?: string[] }
      const providers = output.providers
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
      const providerPriority = config.provider_priority ?? []

      for (const [normalizedName, providerModels] of Object.entries(modelsByName)) {
        if (providerModels.length < 2) continue

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
              strategy: "on_error",
              max_attempts: 3,
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

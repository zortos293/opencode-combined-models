import type { Plugin, Hooks } from "@opencode-ai/plugin"
import type { Model } from "@opencode-ai/sdk"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

interface Options {
  provider_priority?: string[]
  min_providers?: number
  strategy?: string
  max_attempts?: number
  combine_latest?: boolean  // If true, combine model and model-latest (default: false)
}

function loadConfig(): Options {
  try {
    const configPath = join(homedir(), ".config", "opencode", "combined-models.json")
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, "utf-8")
      return JSON.parse(content) as Options
    }
  } catch (_e) {
    // Ignore errors
  }
  return {}
}

function normalizeModelName(modelID: string, combineLatest: boolean): string {
  let normalized = modelID.toLowerCase()
  
  // Remove provider-specific prefixes only (e.g., bedrock regional prefixes)
  normalized = normalized
    .replace(/^(us|eu|ap|apac|jp|au|global)./, "")  // AWS region prefixes
    .replace(/^anthropic./, "")  // Bedrock anthropic prefix
    .replace(/^openai//, "")     // OpenRouter style prefixes
    .replace(/^anthropic//, "")
    .replace(/^google//, "")
    .replace(/^meta-llama//, "")
    .replace(/^mistralai//, "")
  
  // Remove date stamps (e.g., -20250514) but keep version numbers (e.g., -4, -4-5, -4.5)
  normalized = normalized.replace(/-d{8}$/, "")
  
  // Remove version stamps like -v1:0
  normalized = normalized.replace(/-vd+:d+$/, "")
  
  // Optionally remove -latest suffix
  if (combineLatest) {
    normalized = normalized.replace(/-latest$/, "")
    normalized = normalized.replace(/:latest$/, "")
  }
  
  // Normalize dots to dashes for consistency (4.5 -> 4-5)
  normalized = normalized.replace(/./g, "-")
  
  // Clean up multiple dashes
  normalized = normalized.replace(/--+/g, "-").replace(/-$/, "")
  
  return normalized
}

export const CombinedModelsPlugin: Plugin = async (_input) => {
  const cfg = loadConfig()
  const providerPriority = cfg.provider_priority ?? []
  const minProviders = cfg.min_providers ?? 2
  const strategy = cfg.strategy ?? "on_error"
  const maxAttempts = cfg.max_attempts ?? 3
  const combineLatest = cfg.combine_latest ?? false

  const hooks: Hooks = {
    "provider.list": async (_input, output) => {
      const providers = output.providers
      const modelsByName: Record<string, { providerID: string; model: Model }[]> = {}

      for (const [providerID, provider] of Object.entries(providers)) {
        for (const [modelID, model] of Object.entries(provider.models)) {
          const normalizedName = normalizeModelName(modelID, combineLatest)
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

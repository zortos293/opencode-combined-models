# opencode-combined-models

An [OpenCode](https://github.com/anomalyco/opencode) plugin that automatically creates virtual "combined" models by aggregating the same model from multiple providers, enabling automatic failover when one provider fails.

## Features

- **Automatic Detection**: Automatically detects when the same model is available from multiple providers
- **Virtual Combined Models**: Creates a virtual "combined" provider with models that can failover between providers
- **Configurable Priority**: Set your preferred provider order
- **Automatic Failover**: When one provider hits rate limits or errors, automatically switches to the next

## Requirements

This plugin requires the `provider.list` hook proposed in [opencode#9270](https://github.com/anomalyco/opencode/issues/9270).

## Building OpenCode with Plugin Support

1. Clone and checkout the feature branch:
```bash
git clone https://github.com/zortos293/opencode.git
cd opencode
git checkout feat/plugin-provider-list-hook
```

2. Install dependencies and build:
```bash
bun install
cd packages/opencode
bun run build --single
```

3. Copy to your PATH:
```bash
# Windows
copy distopencode-windows-x64inopencode.exe %USERPROFILE%.bunin
# Linux/macOS
cp dist/opencode-*/bin/opencode ~/.local/bin/
```

## Installation

Clone this plugin:
```bash
git clone https://github.com/zortos293/opencode-combined-models.git
```

Add to your `opencode.json`:
```json
{
  "plugin": ["file:///path/to/opencode-combined-models"]
}
```

## Configuration

Create `~/.config/opencode/combined-models.json`:

```json
{
  "provider_priority": ["anthropic", "github-copilot", "amazon-bedrock", "openrouter"],
  "min_providers": 2,
  "strategy": "on_error",
  "max_attempts": 3
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider_priority` | `string[]` | `[]` | Provider order - first are tried first |
| `min_providers` | `number` | `2` | Minimum providers to create a combined model |
| `strategy` | `string` | `"on_error"` | When to failover: `on_error`, `on_rate_limit`, `on_overload` |
| `max_attempts` | `number` | `3` | Retries per provider before moving to next |

### Config Locations

1. `~/.config/opencode/combined-models.json`
2. `~/.opencode/combined-models.json`

## How It Works

1. Groups models by normalized name (strips prefixes, versions, etc.)
2. Creates virtual "combined" models for those available from 2+ providers
3. Automatically handles failover between providers

## Related Issues

- [#8983](https://github.com/anomalyco/opencode/issues/8983) - Combine models from different providers
- [#7602](https://github.com/anomalyco/opencode/issues/7602) - Native Model Fallback/Failover Support
- [#9270](https://github.com/anomalyco/opencode/issues/9270) - Provider List Plugin Hook

## License

MIT

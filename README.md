# opencode-combined-models

An [OpenCode](https://github.com/anomalyco/opencode) plugin that automatically creates virtual "combined" models by aggregating the same model from multiple providers, enabling automatic failover when one provider fails.

## Features

- **Automatic Detection**: Automatically detects when the same model (e.g., Claude Sonnet 4) is available from multiple providers
- **Virtual Combined Models**: Creates a virtual "combined" provider with models that can failover between providers
- **Configurable Priority**: Set your preferred provider order
- **Automatic Failover**: When one provider hits rate limits or errors, automatically switches to the next available provider

## Requirements

This plugin requires the `provider.list` hook which is proposed in [opencode#9270](https://github.com/anomalyco/opencode/issues/9270).

Until this is merged into main, you need to build OpenCode from the feature branch.

## Building OpenCode with Plugin Support

1. Clone and checkout the feature branch:
   ```bash
   git clone https://github.com/zortos293/opencode.git
   cd opencode
   git checkout feat/plugin-provider-list-hook
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Build for your platform:
   ```bash
   cd packages/opencode
   bun run build --single
   ```

4. The binary will be in `dist/opencode-{platform}-{arch}/bin/opencode`

5. Copy to your PATH:
   ```bash
   # Linux/macOS
   cp dist/opencode-*/bin/opencode ~/.local/bin/

   # Windows
   copy distopencode-windows-x64inopencode.exe %USERPROFILE%.bunin   ```

## Installation

Clone this plugin locally:

```bash
git clone https://github.com/zortos293/opencode-combined-models.git
```

Then reference it in your `opencode.json`:

```json
{
  "plugin": ["file:///path/to/opencode-combined-models"]
}
```

Or once published to npm:

```bash
npm install opencode-combined-models
```

## Configuration

Add a `combined_models` section to your `opencode.json`:

```json
{
  "plugin": ["file:///path/to/opencode-combined-models"],
  "combined_models": {
    "provider_priority": ["anthropic", "github-copilot", "amazon-bedrock", "openrouter"],
    "min_providers": 2,
    "strategy": "on_error",
    "max_attempts": 3
  }
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider_priority` | `string[]` | `[]` | Provider order - first providers are tried first. Unlisted providers are sorted alphabetically. |
| `min_providers` | `number` | `2` | Minimum providers needed to create a combined model |
| `strategy` | `string` | `"on_error"` | When to failover: `"on_error"`, `"on_rate_limit"`, or `"on_overload"` |
| `max_attempts` | `number` | `3` | Retry attempts per provider before moving to next |

## How It Works

1. The plugin hooks into `provider.list` after all providers are loaded
2. It groups models by their "normalized" name (stripping provider prefixes, version suffixes, etc.)
3. For models available from 2+ providers, it creates a virtual "combined" model
4. When you use a combined model, it automatically handles failover between providers

### Example

If you have Claude Sonnet 4 available from:
- `anthropic/claude-sonnet-4-20250514`
- `amazon-bedrock/anthropic.claude-sonnet-4-20250514-v1:0`
- `openrouter/anthropic/claude-sonnet-4`

The plugin creates:
- `combined/claude-sonnet-4` - A virtual model that will try each provider in order

## Related Issues

- [#8983](https://github.com/anomalyco/opencode/issues/8983) - Combine models from different providers
- [#7602](https://github.com/anomalyco/opencode/issues/7602) - Native Model Fallback/Failover Support
- [#9270](https://github.com/anomalyco/opencode/issues/9270) - Provider List Plugin Hook (required for this plugin)

## License

MIT

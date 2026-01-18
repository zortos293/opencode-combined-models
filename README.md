# opencode-combined-models

An [OpenCode](https://github.com/anomalyco/opencode) plugin that automatically creates virtual "combined" models by aggregating the same model from multiple providers, enabling automatic failover when one provider fails.

## Features

- **Automatic Detection**: Automatically detects when the same model (e.g., Claude Sonnet 4) is available from multiple providers (Anthropic, AWS Bedrock, Google Vertex, etc.)
- **Virtual Combined Models**: Creates a virtual "combined" provider with models that can failover between providers
- **Configurable Priority**: Set your preferred provider order via `provider_priority` in your config
- **Automatic Failover**: When one provider hits rate limits or errors, automatically switches to the next available provider

## Requirements

This plugin requires the `provider.list` hook which is proposed in [opencode#9270](https://github.com/anomalyco/opencode/issues/9270).

## Installation

```bash
npm install opencode-combined-models
```

Or add to your `opencode.json`:

```json
{
  "plugin": ["opencode-combined-models"]
}
```

## Configuration

### Provider Priority

Set your preferred provider order in `opencode.json`:

```json
{
  "provider_priority": ["anthropic", "amazon-bedrock", "google-vertex", "openrouter"]
}
```

Providers listed first will be tried first. Providers not in the list will be sorted alphabetically after the prioritized ones.

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

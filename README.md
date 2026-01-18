# opencode-combined-models

> **Important: This plugin approach has been deprecated**
> 
> After extensive testing, we discovered that the plugin system cannot implement true failover functionality. Plugins can only modify the provider list at startup, but cannot intercept errors during chat/streaming to switch providers. 
>
> **For working combined models with automatic failover, you need to build OpenCode from the feature branch** (see below).

## Why Plugins Cannot Handle Failover

The OpenCode plugin system provides hooks that run at specific lifecycle points:

1. **provider.list hook**: Runs once when providers are loaded at startup
2. Plugins can create virtual "combined" models with fallback configuration
3. **BUT**: There is no hook to intercept errors during streaming requests

When you use a combined model and the first provider fails:
- The error happens deep in the streaming/chat layer
- There is no plugin hook at that point to catch the error
- The plugin cannot retry with a different provider
- The request simply fails

**The failover logic must be built into OpenCode's core session processor.**

## Working Solution: Build Custom OpenCode

The combined models feature with true automatic failover has been implemented in a custom OpenCode branch.

### Building from Source

1. **Clone the fork with the feature:**
```bash
git clone https://github.com/zortos293/opencode.git
cd opencode
git checkout feat/combined-models-fallback
```

2. **Install dependencies:**
```bash
bun install
```

3. **Build the executable:**
```bash
cd packages/opencode
bun run build --single
```

4. **Install to your PATH:**
```bash
# Windows (PowerShell)
Copy-Item "dist\opencode-windows-x64\bin\opencode.exe" "$env:USERPROFILE\.bun\bin\opencode.exe"

# Linux/macOS
cp dist/opencode-linux-x64/bin/opencode ~/.local/bin/opencode
chmod +x ~/.local/bin/opencode
```

## Features (in the custom build)

- **Automatic Detection**: Automatically detects when the same model is available from multiple providers
- **Virtual Combined Models**: Creates a "combined" provider with models that failover between providers
- **Configurable Priority**: Set your preferred provider order via `provider_priority` config
- **True Automatic Failover**: When one provider hits rate limits or errors, automatically switches to the next provider during the same request
- **Provider Display**: Shows which provider is actually being used in the status line

## Configuration (for custom build)

Add to your `opencode.json`:

```json
{
  "provider_priority": ["anthropic", "github-copilot", "amazon-bedrock", "openrouter"]
}
```

The first provider in the list will be tried first. If it fails, the next provider is used, and so on.

## How It Works (in custom build)

1. **At startup**: Groups models by normalized name (strips region prefixes, versions, etc.)
2. **Creates combined models**: For models available from 2+ providers, creates a virtual "combined" provider
3. **During chat**: The session processor initializes fallback state for combined models
4. **On error**: If a provider fails (rate limit, overload, network error), automatically retries with the next provider
5. **Status display**: Shows `model-name (provider-id)` to indicate which provider is being used

## Related Issues

- [#8983](https://github.com/anomalyco/opencode/issues/8983) - Combine models from different providers
- [#7602](https://github.com/anomalyco/opencode/issues/7602) - Native Model Fallback/Failover Support

## This Plugin Repository

This repository is kept for reference to show:
1. What the plugin approach attempted to do
2. Why it does not work for true failover
3. The configuration format that was proposed

The `src/` directory contains the plugin code that successfully creates combined models but cannot handle runtime failover.

## License

MIT

# MattHub

A Google Chrome extension to add additional columns to the GitHub project table view to show and set ZenHub statuses and estimates.

# Build

```
yarn
yarn build
```

# Install

1. Open Google Chrome.
2. Navigate to [extensions](chrome://extensions/).
3. Enable developer mode.
4. Select `Load unpacked`.
5. Select the `dist` directory.

# Usage

1. Generate a ZenHub GraphQL Personal API key [here](https://app.zenhub.com/settings/tokens).
1. Navigate to a GitHub project table view.
2. On first usage, enter a ZenHub API key when prompted.

# Limitations

- ZenHub API requests are cached for 10 minutes unless the extension is reinstalled.
- The issue search is currently limited to a workspace with the name `Confirmations System` and for items with the label `team-confirmations-system`.
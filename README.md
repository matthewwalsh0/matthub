# MattHub

A Google Chrome extension to add additional columns to the GitHub project table view to show and set ZenHub statuses and estimates.

# Build

```
yarn
yarn build
```

# Install

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable developer mode.
4. Click `Load unpacked`.
5. Select the `dist` directory.

# Usage

1. Generate a ZenHub GraphQL Personal API key [here](https://app.zenhub.com/settings/tokens).
2. Click the extension icon.
3. Enter the API Key, ZenHub Workspace Name, and the Label Filter.
4. Click `Save`.
5. Navigate to a GitHub project table view.

# Notes

- ZenHub data is cached for 10 minutes unless the extension is reinstalled or the `Clear Cache` button is clicked.

import EstimateColumn from "./columns/estimate-column";
import PipelineColumn from "./columns/pipeline-column";
import { getGitHubIssues } from "./github";
import {
  getApiKey,
  getLabelFilter,
  getWorkspaceName,
  getZenHubIssues,
  initState,
  updateState,
} from "./state";
import StatusBar from "./status-bar";

class Extension {
  #statusBar: StatusBar;

  async init() {
    await this.#waitForIssues();
    this.#addStatusBar();
    await initState();

    this.#statusBar.setMessage("Waiting for settings input...");
    await this.#waitForConfig();

    this.#statusBar.setMessage("Loading ZenHub data...");
    await updateState();

    await new PipelineColumn().init();
    await new EstimateColumn().init();

    const zenHubIssues = getZenHubIssues();

    this.#statusBar.setMessage(
      `Loaded ${Object.values(zenHubIssues).length} ZenHub issues.`
    );
  }

  async #waitForIssues() {
    return new Promise<void>((resolve) => {
      const checkConfig = async () => {
        const issues = getGitHubIssues();

        if (Object.keys(issues).length > 0) {
          resolve();
        } else {
          setTimeout(() => checkConfig(), 100);
        }
      };

      checkConfig();
    });
  }

  async #waitForConfig() {
    return new Promise<void>((resolve) => {
      const checkConfig = async () => {
        await initState();

        const apiKey = getApiKey();
        const labelFilter = getLabelFilter();
        const workspaceName = getWorkspaceName();

        if (apiKey && workspaceName && labelFilter) {
          resolve();
        } else {
          setTimeout(() => checkConfig(), 1000);
        }
      };

      checkConfig();
    });
  }

  #addStatusBar() {
    this.#statusBar = new StatusBar();
  }
}

async function init() {
  try {
    await new Extension().init();
  } catch (e) {
    console.error(`MattHub Error - ${e.message}`, e);
  }
}

init();

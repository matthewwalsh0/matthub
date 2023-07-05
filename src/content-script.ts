import Column from "./column";
import { getGitHubIssues } from "./github";
import { Cache, Config, getCache, getConfig, State } from "./state";
import Storage from "./storage";
import ZenHub, { ZenHubIssue } from "./zenhub";

class Extension {
  #config: Config;
  #cache: Cache;
  #zenHub: ZenHub;
  #storage: Storage<Cache>;

  async init() {
    this.#config = await getConfig();
    this.#cache = await getCache();
    this.#zenHub = new ZenHub({ apiKey: this.#config.apiKey });
    this.#storage = new Storage<Cache>();
  }

  async waitForConfig() {
    return new Promise((resolve) => {
      const checkConfig = async () => {
        const issues = getGitHubIssues();
        const config = await getConfig();

        if (
          Object.keys(issues).length > 0 &&
          config.apiKey &&
          config.workspaceName &&
          config.labelFilter
        ) {
          resolve(issues);
        } else {
          setTimeout(() => checkConfig(), 100);
        }
      };

      checkConfig();
    });
  }

  addPipelineColumn() {
    this.#addSelectColumn(
      "Status",
      "ZenHub Status",
      () => Object.keys(this.#cache.zenHubMetadata.pipelines),
      (zenHubIssue, value) => zenHubIssue.pipelineName === value,
      this.#onZenHubPipelineChange.bind(this)
    );
  }

  addEstimateColumn() {
    this.#addSelectColumn(
      "ZenHub Status",
      "ZenHub Estimate",
      (zenHubIssue: ZenHubIssue) => [
        "None",
        ...this.#cache.zenHubMetadata.estimates[zenHubIssue.repositoryName].map(
          (estimate) => estimate + ""
        ),
      ],
      (zenHubIssue, value) => zenHubIssue.estimate === parseInt(value),
      this.#onZenHubEstimateChange.bind(this)
    );
  }

  #addSelectColumn(
    existingColumnName: string,
    newColumnName: string,
    getOptions: (zenHubIssue: ZenHubIssue) => string[],
    isSelected: (zenHubIssue: ZenHubIssue, value: string) => boolean,
    onChange: (
      newValue: string,
      select: HTMLSelectElement,
      zenHubIssue: ZenHubIssue
    ) => void
  ) {
    const newColumn = new Column(existingColumnName, newColumnName);

    const processedKey =
      "data-matthub-" + newColumnName.toLowerCase().replace(" ", "-");

    const updateCells = () => {
      const gitHubIssues = getGitHubIssues();

      for (const gitHubIssue of Object.values(gitHubIssues)) {
        if (gitHubIssue.row.getAttribute(processedKey)) continue;

        const zenHubIssue = this.#cache.zenHubIssues[gitHubIssue.key];

        const cellContent = this.#setSelectCell(
          zenHubIssue,
          getOptions,
          isSelected
        );

        const newCell = newColumn.setCell(gitHubIssue, cellContent);

        gitHubIssue.row.setAttribute(processedKey, "true");

        if (!zenHubIssue) continue;

        const select = newCell.querySelector("select");

        select.addEventListener("change", () =>
          onChange(select.value, select, zenHubIssue)
        );
      }
    };

    updateCells();
    setInterval(updateCells, 100);
  }

  #setSelectCell(
    zenHubIssue: ZenHubIssue,
    getOptions: (zenHubIssue: ZenHubIssue) => string[],
    isSelected: (zenHubIssue: ZenHubIssue, value: string) => boolean
  ): string {
    if (!zenHubIssue) return "<span></span>";

    const options = getOptions(zenHubIssue)
      .map((optionName) => {
        const selected = isSelected(zenHubIssue, optionName) ? " selected" : "";
        return `<option${selected}>${optionName}</option>`;
      })
      .join("");

    return `<select class="zenhub-status">${options}</select>`;
  }

  async #onZenHubPipelineChange(
    newPipelineName: string,
    select: HTMLSelectElement,
    zenHubIssue: ZenHubIssue
  ) {
    const newPipelineId = this.#cache.zenHubMetadata.pipelines[newPipelineName];
    let success = true;

    try {
      await this.#zenHub.setPipeline(
        this.#cache.zenHubMetadata.workspaceId,
        zenHubIssue.id,
        newPipelineId
      );
    } catch (e) {
      console.error(
        `MattHub Error - Failed to set ZenHub pipeline - ${e.message}`
      );
      success = false;
    }

    await this.#storage.set("zenHubIssues", {
      ...this.#cache.zenHubIssues,
      [zenHubIssue.key]: {
        ...zenHubIssue,
        pipelineName: newPipelineName,
      },
    });

    this.#showSelectSuccess(select, success);
  }

  async #onZenHubEstimateChange(
    newEstimateString: string,
    select: HTMLSelectElement,
    zenHubIssue: ZenHubIssue
  ) {
    let success = true;
    const newEstimate =
      newEstimateString === "None" ? null : parseInt(newEstimateString);

    try {
      await this.#zenHub.setEstimate(zenHubIssue.id, newEstimate);
    } catch (e) {
      console.error(
        `MattHub Error - Failed to set ZenHub estimate - ${e.message}`
      );
      success = false;
    }

    await this.#storage.set("zenHubIssues", {
      ...this.#cache.zenHubIssues,
      [zenHubIssue.key]: {
        ...zenHubIssue,
        estimate: newEstimate,
      },
    });

    this.#showSelectSuccess(select, success);
  }

  async #showSelectSuccess(select: HTMLSelectElement, success: boolean) {
    const originalBackgroundColor = select.style.backgroundColor;

    select.style.backgroundColor = success ? "#d0edce" : "#f8d7da";

    setTimeout(() => {
      select.style.backgroundColor = originalBackgroundColor;
    }, 2000);
  }
}

async function init() {
  try {
    const extension = new Extension();

    await extension.waitForConfig();
    await extension.init();

    extension.addPipelineColumn();
    extension.addEstimateColumn();
  } catch (e) {
    console.error(`MattHub Error - ${e.message}`, e);
  }
}

init();

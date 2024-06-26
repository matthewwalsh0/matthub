import {
  clearCache,
  getApiKey,
  getCacheDuration,
  getLabelFilter,
  getWorkspaceName,
  initState,
  setConfig,
} from "./state";
import { indicateButtonSuccess } from "./util";

class Popup {
  #apiKeyInput: HTMLInputElement;
  #cacheDurationInput: HTMLInputElement;
  #labelFilterInput: HTMLInputElement;
  #workspaceNameInput: HTMLInputElement;
  #saveButton: HTMLButtonElement;
  #clearCacheButton: HTMLButtonElement;

  constructor() {
    this.#apiKeyInput = document.querySelector("#api-key") as HTMLInputElement;
    this.#cacheDurationInput = document.querySelector('#cache-duration') as HTMLInputElement;

    this.#labelFilterInput = document.querySelector(
      "#label-filter"
    ) as HTMLInputElement;

    this.#workspaceNameInput = document.querySelector(
      "#workspace-name"
    ) as HTMLInputElement;

    this.#saveButton = document.querySelector("#save") as HTMLButtonElement;

    this.#clearCacheButton = document.querySelector(
      "#clear-cache"
    ) as HTMLButtonElement;
  }

  async init() {
    await initState();

    const apiKey = getApiKey();
    const cacheDuration = getCacheDuration();
    const labelFilter = getLabelFilter();
    const workspaceName = getWorkspaceName();

    this.#apiKeyInput.value = apiKey || "";
    this.#cacheDurationInput.value = String(cacheDuration) || "";
    this.#labelFilterInput.value = labelFilter || "";
    this.#workspaceNameInput.value = workspaceName || "";

    this.#saveButton.addEventListener("click", () => this.#onSaveClick());

    this.#clearCacheButton.addEventListener("click", () =>
      this.#onClearCacheClick()
    );
  }

  async #onClearCacheClick() {
    await clearCache();
    indicateButtonSuccess(this.#clearCacheButton, true);
  }

  async #onSaveClick() {
    await setConfig({
      apiKey: this.#apiKeyInput.value,
      cacheDuration: parseInt(this.#cacheDurationInput.value, 10),
      labelFilter: this.#labelFilterInput.value,
      workspaceName: this.#workspaceNameInput.value,
    });
    indicateButtonSuccess(this.#saveButton, true);
  }
}

async function init() {
  const popup = new Popup();
  await popup.init();
}

document.addEventListener("DOMContentLoaded", init);

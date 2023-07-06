import { clearCache, getConfig, setConfig } from "./state";
import { indicateElementSuccess } from "./util";

class Popup {
  #apiKeyInput: HTMLInputElement;
  #labelFilterInput: HTMLInputElement;
  #workspaceNameInput: HTMLInputElement;
  #saveButton: HTMLButtonElement;
  #clearCacheButton: HTMLButtonElement;

  constructor() {
    this.#apiKeyInput = document.querySelector("#api-key") as HTMLInputElement;

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
    const config = await getConfig();

    this.#apiKeyInput.value = config.apiKey || "";
    this.#labelFilterInput.value = config.labelFilter || "";
    this.#workspaceNameInput.value = config.workspaceName || "";

    this.#saveButton.addEventListener("click", () => this.#onSaveClick());

    this.#clearCacheButton.addEventListener("click", () =>
      this.#onClearCacheClick()
    );
  }

  async #onClearCacheClick() {
    await clearCache();
    indicateElementSuccess(this.#clearCacheButton, true);
  }

  async #onSaveClick() {
    await setConfig({
      apiKey: this.#apiKeyInput.value,
      labelFilter: this.#labelFilterInput.value,
      workspaceName: this.#workspaceNameInput.value,
    });
    indicateElementSuccess(this.#saveButton, true);
  }
}

async function init() {
  const popup = new Popup();
  await popup.init();
}

document.addEventListener("DOMContentLoaded", init);

export default class StatusBar {
  #element: HTMLElement;
  #statusMessageElement: HTMLElement;

  constructor() {
    const filterBar = document.querySelector(
      '[aria-label="View filters"]'
    ).parentElement;

    this.#element = filterBar.cloneNode(true) as HTMLElement;
    this.#statusMessageElement = this.#element.querySelector(
      '[role="region"] > div'
    );

    this.#element.id = "matthub-status-bar";
    this.#element.classList.add("matthub-status-bar");

    const buttons = this.#element.querySelector(
      '[role="region"] > div:nth-child(2)'
    );

    buttons.remove();

    filterBar.after(this.#element);
  }

  setMessage(message: string) {
    this.#statusMessageElement.innerHTML = `<b>MattHub Status:</b> ${message}`;
  }
}

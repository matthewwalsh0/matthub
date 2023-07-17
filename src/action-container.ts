import Action from "./actions/action";
import OpenAction from "./actions/open-action";
import RefreshAction from "./actions/refresh-action";
import { GitHubIssue } from "./github";
import { ZenHubIssue } from "./zenhub";

const ACTIONS: Action[] = [new OpenAction(), new RefreshAction()];

export default class ActionContainer {
  #gitHubIssue: GitHubIssue;
  #zenHubIssue: ZenHubIssue;

  constructor(gitHubIssue: GitHubIssue, zenHubIssue: ZenHubIssue) {
    this.#gitHubIssue = gitHubIssue;
    this.#zenHubIssue = zenHubIssue;
  }

  render(): string {
    return ACTIONS.map((action) => {
      if (!action.isVisible(this.#gitHubIssue, this.#zenHubIssue)) return "";

      const name = action.getName();

      return action.getHTML(
        this.#gitHubIssue,
        this.#zenHubIssue,
        `<img class='matthub-action matthub-action-${name}'/>`
      );
    }).join("");
  }

  onInsert() {
    ACTIONS.forEach((action) => {
      if (!action.isVisible(this.#gitHubIssue, this.#zenHubIssue)) return;

      const getElement = () =>
        this.#gitHubIssue.row.querySelector(
          `.matthub-action-${action.getName()}`
        ) as HTMLElement;

      const element = getElement();

      element.addEventListener("click", async () => {
        await action.onClick(this.#gitHubIssue, this.#zenHubIssue, getElement);
      });
    });
  }
}

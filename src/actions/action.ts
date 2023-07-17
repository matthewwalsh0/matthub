import { GitHubIssue } from "../github";
import { ZenHubIssue } from "../zenhub";

export default abstract class Action {
  #name: string;

  abstract isVisible(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ): boolean;

  abstract getHTML(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue,
    imageHTML: string
  ): string;

  abstract onClick(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue,
    getElement: () => HTMLElement
  ): Promise<void>;

  constructor(name: string) {
    this.#name = name;
  }

  getName(): string {
    return this.#name;
  }
}

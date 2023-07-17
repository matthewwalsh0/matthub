import { GitHubIssue } from "../github";
import { ZenHubIssue } from "../zenhub";
import Action from "./action";

export default class OpenAction extends Action {
  constructor() {
    super("open");
  }

  isVisible(gitHubIssue: GitHubIssue, zenHubIssue: ZenHubIssue): boolean {
    return Boolean(zenHubIssue);
  }

  getHTML(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue,
    imageHTML: string
  ): string {
    return `<a href=${zenHubIssue.url} target="_blank">${imageHTML}</a>`;
  }

  async onClick(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue,
    getElement: () => HTMLElement
  ) {}
}

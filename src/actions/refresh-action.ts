import { GitHubIssue } from "../github";
import { getZenHubMetadata, refresh } from "../state";
import { indicateElementSuccess } from "../util";
import { ZenHubIssue } from "../zenhub";
import Action from "./action";

export default class RefreshAction extends Action {
  constructor() {
    super("refresh");
  }

  isVisible(gitHubIssue: GitHubIssue, zenHubIssue: ZenHubIssue): boolean {
    return Boolean(gitHubIssue.issueNumber);
  }

  getHTML(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue,
    imageHTML: string
  ): string {
    return imageHTML;
  }

  async onClick(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue,
    getElement: () => HTMLElement
  ) {
    const zenHubMetadata = getZenHubMetadata();
    let success = true;

    try {
      await refresh(
        zenHubMetadata.repositories[gitHubIssue.repositoryName].id,
        gitHubIssue.issueNumber
      );
    } catch (e) {
      success = false;
    }

    gitHubIssue.row
      .querySelectorAll(".matthub-cell")
      .forEach((value) => value.remove());

    gitHubIssue.row.removeAttribute("data-matthub-zenhub-status");
    gitHubIssue.row.removeAttribute("data-matthub-zenhub-estimate");
  }
}

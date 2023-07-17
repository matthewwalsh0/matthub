import { GitHubIssue } from "../github";
import { Cache, getZenHubMetadata, setEstimate } from "../state";
import { ZenHubIssue } from "../zenhub";
import SelectColumn from "./select-column";

export default class EstimateColumn extends SelectColumn {
  constructor() {
    super("ZenHub Status", "ZenHub Estimate");
  }

  getOptions(gitHubIssue: GitHubIssue, zenHubIssue: ZenHubIssue): string[] {
    const zenHubMetadata = getZenHubMetadata();

    return [
      "None",
      ...zenHubMetadata.repositories[zenHubIssue.repositoryName].estimates.map(
        (estimate) => estimate + ""
      ),
    ];
  }

  isSelected(zenHubIssue: ZenHubIssue, value: string) {
    return zenHubIssue.estimate === parseInt(value);
  }

  async onChange(newValue: string, zenHubIssue: ZenHubIssue) {
    const newEstimate = newValue === "None" ? null : parseInt(newValue);
    await setEstimate(zenHubIssue, newEstimate);
  }

  getCellContentBefore(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ): string {
    return "";
  }
}

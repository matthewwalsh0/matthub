import ActionContainer from "../action-container";
import { GitHubIssue } from "../github";
import { getZenHubMetadata, setPipeline } from "../state";
import { ZenHubIssue } from "../zenhub";
import SelectColumn from "./select-column";

export default class PipelineColumn extends SelectColumn {
  constructor() {
    super("Status", "ZenHub Status");
  }

  getOptions(gitHubIssue: GitHubIssue, zenHubIssue: ZenHubIssue): string[] {
    const zenHubMetadata = getZenHubMetadata();
    return Object.keys(zenHubMetadata.pipelines);
  }

  isSelected(zenHubIssue: ZenHubIssue, value: string) {
    return zenHubIssue.pipelineName === value;
  }

  async onChange(newValue: string, zenHubIssue: ZenHubIssue) {
    const zenHubMetadata = getZenHubMetadata();
    const newPipelineId = zenHubMetadata.pipelines[newValue];
    await setPipeline(zenHubIssue, newPipelineId);
  }

  getCellContentBefore(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ): string {
    return new ActionContainer(gitHubIssue, zenHubIssue).render();
  }

  onSelectCellInsert(
    cell: Element,
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ) {
    new ActionContainer(gitHubIssue, zenHubIssue).onInsert();
  }
}

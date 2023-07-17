import Column from "./column";
import { GitHubIssue } from "../github";
import { ZenHubIssue } from "../zenhub";
import { indicateElementSuccess } from "../util";

export default abstract class SelectColumn extends Column {
  constructor(existingColumnName: string, newColumnName: string) {
    super(existingColumnName, newColumnName);
  }

  abstract getOptions(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ): string[];

  abstract isSelected(zenHubIssue: ZenHubIssue, value: string): boolean;

  abstract onChange(newValue: string, zenHubIssue: ZenHubIssue): Promise<void>;

  abstract getCellContentBefore(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ): string;

  getCellContent(gitHubIssue: GitHubIssue, zenHubIssue: ZenHubIssue): string {
    const beforeContent = this.getCellContentBefore(gitHubIssue, zenHubIssue);

    if (!zenHubIssue) return `${beforeContent}<span></span>`;

    const options = this.getOptions(gitHubIssue, zenHubIssue)
      .map((optionName) => {
        const selected = this.isSelected(zenHubIssue, optionName)
          ? " selected"
          : "";
        return `<option${selected}>${optionName}</option>`;
      })
      .join("");

    return `${beforeContent}<select class="matthub-select">${options}</select>`;
  }

  onSelectCellInsert(
    cell: Element,
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ) {}

  onCellInsert(
    cell: Element,
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ) {
    this.onSelectCellInsert(cell, gitHubIssue, zenHubIssue);

    if (!zenHubIssue) return;

    const select = cell.querySelector("select");

    select.addEventListener("change", async () => {
      let success = true;

      try {
        await this.onChange(select.value, zenHubIssue);
      } catch (e) {
        success = false;
      }

      indicateElementSuccess(select, success);
    });
  }
}

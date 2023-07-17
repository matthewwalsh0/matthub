import { GitHubIssue, getGitHubIssues } from "../github";
import { getZenHubIssues } from "../state";
import { ZenHubIssue } from "../zenhub";

export default abstract class Column {
  #existingColumnName: string;
  #newColumnName: string;

  constructor(existingColumnName: string, newColumnName: string) {
    this.#existingColumnName = existingColumnName;
    this.#newColumnName = newColumnName;
  }

  abstract getCellContent(
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ): string;

  abstract onCellInsert(
    cell: Element,
    gitHubIssue: GitHubIssue,
    zenHubIssue: ZenHubIssue
  ): void;

  async init() {
    this.#insertColumn();

    const processedKey =
      "data-matthub-" + this.#newColumnName.toLowerCase().replace(" ", "-");

    const updateCells = () => {
      const zenHubIssues = getZenHubIssues();
      const gitHubIssues = getGitHubIssues();

      for (const gitHubIssue of Object.values(gitHubIssues)) {
        if (gitHubIssue.row.getAttribute(processedKey)) continue;

        const zenHubIssue = zenHubIssues[gitHubIssue.key];

        let cellContent = this.getCellContent(gitHubIssue, zenHubIssue);

        const newCell = this.#setCell(gitHubIssue, cellContent);

        if (!newCell) continue;

        gitHubIssue.row.setAttribute(processedKey, "true");

        this.onCellInsert(newCell, gitHubIssue, zenHubIssue);
      }
    };

    updateCells();
    setInterval(updateCells, 100);
  }

  #setCell(gitHubIssue: GitHubIssue, html: string): Element {
    const cells = Array.from(
      gitHubIssue.row.querySelectorAll('div[role="gridcell"]')
    );

    const existingCell = cells.find((el) =>
      el
        .getAttribute("data-testid")
        ?.includes(`column: ${this.#existingColumnName}`)
    );

    if (!existingCell) return;

    const newCell = existingCell.cloneNode(false) as Element;
    newCell.id += "-zenhub";
    newCell.innerHTML = html;

    newCell.classList.remove(
      `matthub-cell-${this.#existingColumnName
        .replace(" ", "-")
        .toLocaleLowerCase()}`
    );

    newCell.classList.add(
      "matthub-cell",
      `matthub-cell-${this.#newColumnName
        .replace(" ", "-")
        .toLocaleLowerCase()}`
    );

    newCell.setAttribute(
      "data-testid",
      existingCell
        .getAttribute("data-testid")
        .replace(this.#existingColumnName, this.#newColumnName)
    );

    existingCell.after(newCell);

    return newCell;
  }

  #insertColumn() {
    const existingColumn = document.querySelector(
      `[data-testid="TableColumnHeader{id: ${this.#existingColumnName}}"]`
    );

    const element = existingColumn.cloneNode(true) as Element;

    element.id = `column-${this.#newColumnName}`;

    element.setAttribute(
      "data-testid",
      existingColumn
        .getAttribute("data-testid")
        .replace(this.#existingColumnName, this.#newColumnName)
    );

    element.querySelector("div span").innerHTML = this.#newColumnName;

    element
      .querySelector('[data-testid="Status-column-menu-trigger"]')
      ?.remove();

    element.classList.remove(
      `matthub-cell-${this.#existingColumnName
        .replace(" ", "-")
        .toLocaleLowerCase()}`
    );

    element.classList.add(
      "matthub-cell",
      `matthub-cell-${this.#newColumnName
        .replace(" ", "-")
        .toLocaleLowerCase()}`
    );

    existingColumn.after(element);
  }
}

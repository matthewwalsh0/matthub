import { GitHubIssue } from "./github";

export default class Column {
  #existingColumnName: string;
  #newColumnName: string;
  #element: Element;

  constructor(existingColumnName: string, newColumnName: string) {
    this.#existingColumnName = existingColumnName;
    this.#newColumnName = newColumnName;

    const existingColumn = document.querySelector(
      `[data-testid="TableColumnHeader{id: ${existingColumnName}}"]`
    );

    this.#element = existingColumn.cloneNode(true) as Element;
    this.#element.id = `column-${newColumnName}`;
    this.#element.setAttribute(
      "data-testid",
      existingColumn
        .getAttribute("data-testid")
        .replace(existingColumnName, newColumnName)
    );
    this.#element.querySelector("div span").innerHTML = newColumnName;

    existingColumn.after(this.#element);
  }

  setCell(gitHubIssue: GitHubIssue, html: string): Element {
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
    newCell.setAttribute(
      "data-testid",
      existingCell
        .getAttribute("data-testid")
        .replace(this.#existingColumnName, this.#newColumnName)
    );

    existingCell.after(newCell);

    return newCell;
  }
}

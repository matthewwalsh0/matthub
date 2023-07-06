export type GitHubIssue = {
  key: string;
  repositoryName: string;
  issueNumber: number;
  row: Element;
};

export function getGitHubIssues() {
  const issueTable = document.querySelector('[data-testid="table-root"]');
  const rows = Array.from(issueTable.querySelectorAll('[role="row"]'));

  return rows
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('[role="gridcell"]'));

      const titleCell = cells.find((row) =>
        row.getAttribute("data-testid")?.includes("column: Title")
      );

      if (!titleCell) return undefined;

      const issueLink = titleCell.querySelector("a")?.getAttribute("href");

      const issueNumber = issueLink
        ? parseInt(issueLink.split("/").pop())
        : undefined;

      const repositoryName = issueLink?.split("/").slice(-3)[0];

      const key =
        issueLink && repositoryName
          ? repositoryName + "#" + issueNumber
          : titleCell.textContent;

      return {
        key,
        repositoryName,
        issueNumber,
        row,
      };
    })
    .filter((issue) => Boolean(issue))
    .reduce((output: Record<string, GitHubIssue>, issue: GitHubIssue) => {
      output[issue.key] = issue;
      return output;
    }, {});
}

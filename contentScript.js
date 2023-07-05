const LABEL_FILTER = "team-confirmations-system";
const STORAGE_VERSION = 4;
const CACHE_DURATION = 1000 * 60 * 10;

async function zenHubGrapQLRequest(query, variables) {
  let apiKey = (await getCacheData(["apiKey"])).apiKey;

  if (!apiKey) {
    apiKey = prompt("Enter your ZenHub API key");
    await setCacheData({ apiKey });
  }

  const response = await fetch("https://api.zenhub.com/public/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (response.status !== 200) {
    throw new Error(await response.text());
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors.map((error) => error.message).join("\n"));
  }

  return data;
}

async function getZenHubMetadata() {
  const data = await zenHubGrapQLRequest(
    `
    query {
      viewer {
        id
        searchWorkspaces(query: "Confirmations System") {
          nodes {
            id
            name
            repositoriesConnection {
              nodes {
                id
                ghId
                name
                estimateSet {
                  values
                }
              }
            }
            pipelinesConnection {
              nodes {
                id
                name
              }
            }
          }
        }
      }
    }`,
    {}
  );

  return {
    workspaceId: data.data.viewer.searchWorkspaces.nodes[0].id,
    pipelines:
      data.data.viewer.searchWorkspaces.nodes[0].pipelinesConnection.nodes.reduce(
        (output, node) => {
          output[node.name] = node.id;
          return output;
        },
        {}
      ),
    estimates:
      data.data.viewer.searchWorkspaces.nodes[0].repositoriesConnection.nodes.reduce(
        (output, repository) => {
          output[repository.name] = repository.estimateSet.values;
          return output;
        },
        {}
      ),
  };
}

async function getZenHubIssues(workspaceId, pipelineId) {
  const data = await zenHubGrapQLRequest(
    `
    query getPipelineAndLabelIssues($workspaceId: ID!, $pipelineId: ID!, $label: String!) {
      searchIssuesByPipeline(pipelineId: $pipelineId, filters: {
        labels: {in: [$label]}
      }) {
        nodes {
          id
          title
          number
          repository {
            name
          }
          estimate {
            value
          }
          pipelineIssue(workspaceId:$workspaceId) {
            pipeline {
              name
            }
          }
        }
      }
    }
  `,
    {
      workspaceId,
      pipelineId,
      label: LABEL_FILTER,
    }
  );

  return (
    data.data.searchIssuesByPipeline?.nodes.reduce((output, node) => {
      output[node.repository.name + "#" + node.number] = {
        key: node.repository.name + "#" + node.number,
        id: node.id,
        title: node.title,
        estimate: node.estimate?.value,
        zenHubStatus: node.pipelineIssue?.pipeline?.name,
        repository: node.repository.name,
      };
      return output;
    }, {}) || {}
  );
}

async function setZenHubStatus(workspaceId, issueId, pipelineId) {
  await zenHubGrapQLRequest(
    `
    mutation moveIssue($moveIssueInput: MoveIssueInput!, $workspaceId: ID!) {
      moveIssue(input: $moveIssueInput) {
        issue {
          id
          pipelineIssue(workspaceId: $workspaceId) {
            priority {
              id
              name
              color
            }
            pipeline {
              id
            }
          }
        }
      }
    }
  `,
    {
      workspaceId,
      moveIssueInput: {
        pipelineId,
        issueId,
        position: 0,
      },
    }
  );
}

async function setZenHubEstimate(issueId, estimate) {
  await zenHubGrapQLRequest(
    `
  mutation setEstimate($setEstimateInput: SetEstimateInput!) {
    setEstimate(input: $setEstimateInput) {
      issue {
        id
        estimate {
          value
        }
      }
    }
  }`,
    {
      setEstimateInput: {
        issueId,
        value: estimate,
      },
    }
  );
}

async function getCacheData(properties) {
  return new Promise((resolve) => {
    chrome.storage.local.get(properties, (data) => {
      resolve(data);
    });
  });
}

async function setCacheData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function getData() {
  const cachedData = await getCacheData([
    "zenHubMetadata",
    "zenHubIssues",
    "cachedAt",
    "version",
  ]);

  if (
    cachedData.version === STORAGE_VERSION &&
    cachedData.zenHubIssues &&
    cachedData.zenHubMetadata &&
    cachedData.cachedAt &&
    cachedData.cachedAt > Date.now() - CACHE_DURATION
  ) {
    return cachedData;
  }

  const zenHubMetadata = await getZenHubMetadata();

  let zenHubIssues = {};

  for (const pipelineId of Object.values(zenHubMetadata.pipelines)) {
    const issues = await getZenHubIssues(
      zenHubMetadata.workspaceId,
      pipelineId
    );

    zenHubIssues = { ...zenHubIssues, ...issues };
  }

  await setCacheData({
    zenHubMetadata,
    zenHubIssues,
    cachedAt: Date.now(),
    version: STORAGE_VERSION,
  });

  return { zenHubMetadata, zenHubIssues };
}

function getGitHubRows() {
  const issueTable = document.querySelector('[data-testid="table-root"]');
  const rows = Array.from(issueTable.querySelectorAll('[role="row"]'));
  let finalRows = {};

  rows.forEach((row) => {
    const titleCell = Array.from(
      row.querySelectorAll('[role="gridcell"]')
    ).find((row) => row.getAttribute("data-testid")?.includes("column: Title"));

    if (!titleCell) return;

    const issueLink = titleCell.querySelector("a").getAttribute("href");
    const issueNumber = issueLink.split("/").pop();
    const repository = issueLink.split("/").slice(-3)[0];
    const zenHubKey = repository + "#" + issueNumber;

    finalRows[zenHubKey] = {
      key: zenHubKey,
      repository,
      issueNumber,
      row,
    };
  });

  return finalRows;
}

function onRow(
  existingColumnName,
  newColumnName,
  gitHubIssue,
  zenHubIssues,
  populateCell,
  afterInsert
) {
  const zenHubIssue = zenHubIssues[gitHubIssue.key];
  const cells = Array.from(
    gitHubIssue.row.querySelectorAll('div[role="gridcell"]')
  );

  const existingCell = cells.find((el) =>
    el.getAttribute("data-testid")?.includes(`column: ${existingColumnName}`)
  );

  const newCell = existingCell.cloneNode(false);
  newCell.id += "-zenhub";
  newCell.innerHTML = populateCell(gitHubIssue, zenHubIssue);
  newCell.setAttribute(
    "data-testid",
    existingCell
      .getAttribute("data-testid")
      .replace(existingColumnName, newColumnName)
  );

  const insertedCell = existingCell.parentNode.insertBefore(
    newCell,
    existingCell.nextSibling
  );

  afterInsert(insertedCell, gitHubIssue, zenHubIssue);
}

function copyColumn(
  existingColumnName,
  newName,
  gitHubIssues,
  zenHubIssues,
  populateCell,
  afterInsert
) {
  const existingColumn = document.querySelector(
    `[data-testid="TableColumnHeader{id: ${existingColumnName}}"]`
  );

  const newColumn = existingColumn.cloneNode(true);
  newColumn.id = `column-${newName}`;
  newColumn.querySelector("div span").innerText = newName;
  newColumn.setAttribute(
    "data-testid",
    existingColumn
      .getAttribute("data-testid")
      .replace(existingColumnName, newName)
  );

  existingColumn.parentNode.insertBefore(newColumn, existingColumn.nextSibling);

  const processedKey = `data-matthub-${newName.replace(" ", "-")}`;

  for (const [_, gitHubIssue] of Object.entries(gitHubIssues)) {
    onRow(
      existingColumnName,
      newName,
      gitHubIssue,
      zenHubIssues,
      populateCell,
      afterInsert
    );

    gitHubIssue.row.setAttribute(processedKey, true);
  }

  setInterval(() => {
    const rows = getGitHubRows();

    for (const [_, gitHubIssue] of Object.entries(rows)) {
      if (gitHubIssue.row.getAttribute(processedKey)) continue;

      onRow(
        existingColumnName,
        newName,
        gitHubIssue,
        zenHubIssues,
        populateCell,
        afterInsert
      );

      gitHubIssue.row.setAttribute(processedKey, true);
    }
  }, 100);
}

async function onZenHubEstimateChange(
  newValue,
  select,
  gitHubIssue,
  zenHubIssue,
  zenHubMetadata,
  zenHubIssues
) {
  const newEstimate = parseInt(newValue, 10);
  let success = true;

  try {
    await setZenHubEstimate(zenHubIssue.id, newEstimate);
  } catch (e) {
    console.error(
      `MattHub Error - Failed to set ZenHub estimate - ${e.message}`
    );
    success = false;
  }

  await setCacheData({
    zenHubIssues: {
      ...zenHubIssues,
      [zenHubIssue.key]: {
        ...zenHubIssue,
        estimate: newEstimate,
      },
    },
  });

  const originalBackgroundColor = select.style.backgroundColor;

  select.style.backgroundColor = success ? "#d0edce" : "#f8d7da";

  setTimeout(() => {
    select.style.backgroundColor = originalBackgroundColor;
  }, 2000);
}

async function onZenHubStatusChange(
  newValue,
  select,
  gitHubIssue,
  zenHubIssue,
  zenHubMetadata,
  zenHubIssues
) {
  const newPipelineId = zenHubMetadata.pipelines[newValue];
  let success = true;

  try {
    await setZenHubStatus(
      zenHubMetadata.workspaceId,
      zenHubIssue.id,
      newPipelineId
    );
  } catch (e) {
    console.error(`MattHub Error - Failed to set ZenHub status - ${e.message}`);
    success = false;
  }

  await setCacheData({
    zenHubIssues: {
      ...zenHubIssues,
      [zenHubIssue.key]: {
        ...zenHubIssue,
        zenHubStatus: newValue,
      },
    },
  });

  const originalBackgroundColor = select.style.backgroundColor;

  select.style.backgroundColor = success ? "#d0edce" : "#f8d7da";

  setTimeout(() => {
    select.style.backgroundColor = originalBackgroundColor;
  }, 2000);
}

function addStatusColumn(gitHubIssues, zenHubMetadata, zenHubIssues) {
  copyColumn(
    "Status",
    "ZenHub Status",
    gitHubIssues,
    zenHubIssues,
    (gitHubIssue, zenHubIssue) => {
      const zenHubStatuses = Object.keys(zenHubMetadata.pipelines);

      if (!zenHubIssue) return "<span></span>";

      const options = zenHubStatuses
        .map((pipeline) => {
          const isSelected = pipeline === zenHubIssue.zenHubStatus;
          const selected = isSelected ? " selected" : "";

          return `<option${selected}>${pipeline}</option>`;
        })
        .join("");

      return `<select class="zenhub-status">${options}</select>`;
    },
    (insertedCell, gitHubIssue, zenHubIssue) => {
      if (!zenHubIssue) return;

      const select = insertedCell.querySelector("select");

      select.addEventListener("change", () =>
        onZenHubStatusChange(
          select.value,
          select,
          gitHubIssue,
          zenHubIssue,
          zenHubMetadata,
          zenHubIssues
        )
      );
    }
  );
}

function addEstimateColumn(githubIssues, zenHubMetadata, zenHubIssues) {
  copyColumn(
    "ZenHub Status",
    "ZenHub Estimate",
    githubIssues,
    zenHubIssues,
    (gitHubIssue, zenHubIssue) => {
      if (!zenHubIssue) return "<span></span>";

      const options = zenHubMetadata.estimates[zenHubIssue.repository]
        .map((points) => {
          const isSelected = points === zenHubIssue.estimate;
          const selected = isSelected ? " selected" : "";

          return `<option${selected}>${points}</option>`;
        })
        .join("");

      return `<select class="zenhub-status">${options}</select>`;
    },
    (insertedCell, gitHubIssue, zenHubIssue) => {
      if (!zenHubIssue) return;

      const select = insertedCell.querySelector("select");

      select.addEventListener("change", () =>
        onZenHubEstimateChange(
          select.value,
          select,
          gitHubIssue,
          zenHubIssue,
          zenHubMetadata,
          zenHubIssues
        )
      );
    }
  );
}

async function init() {
  try {
    const { zenHubMetadata, zenHubIssues } = await getData();
    const gitHubIssues = getGitHubRows();

    addStatusColumn(gitHubIssues, zenHubMetadata, zenHubIssues);
    addEstimateColumn(gitHubIssues, zenHubMetadata, zenHubIssues);
  } catch (e) {
    console.error(`MattHub Error - ${e.message}`);
  }
}

requestIdleCallback(() => {
  setTimeout(init, 2000);
});

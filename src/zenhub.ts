const API_URL = "https://api.zenhub.com/public/graphql";

export type ZenHubMetadata = {
  workspaceId: string;
  pipelines: Record<string, string>;
  repositories: Record<string, { id: number; estimates: number[] }>;
};

export type ZenHubIssue = {
  key: string;
  id: string;
  title: string;
  estimate: number;
  pipelineName: string;
  repositoryName: string;
  url: string;
};

export type ZenHubIssuesResult = Record<string, ZenHubIssue>;

export default class ZenHub {
  #apiKey: string;

  constructor({ apiKey }: { apiKey: string }) {
    this.#apiKey = apiKey;
  }

  async getMetadata(workspaceName: string): Promise<ZenHubMetadata> {
    const data = await this.#request(
      `
      query getMetadata($workspaceName: String!) {
        viewer {
          id
          searchWorkspaces(query: $workspaceName) {
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
      { workspaceName }
    );

    if (data.data.viewer.searchWorkspaces.nodes.length === 0) {
      throw new Error(`Workspace '${workspaceName}' not found`);
    }

    return {
      workspaceId: data.data.viewer.searchWorkspaces.nodes[0].id,
      pipelines:
        data.data.viewer.searchWorkspaces.nodes[0].pipelinesConnection.nodes.reduce(
          (output: Record<string, string>, node: any) => {
            output[node.name] = node.id;
            return output;
          },
          {}
        ),
      repositories:
        data.data.viewer.searchWorkspaces.nodes[0].repositoriesConnection.nodes.reduce(
          (output: any, repository: any) => {
            output[repository.name] = {
              id: repository.ghId,
              estimates: repository.estimateSet.values,
            };
            return output;
          },
          {}
        ),
    };
  }

  async getIssues(
    workspaceId: string,
    pipelineId: string,
    label: string,
    workspaceName: string
  ): Promise<ZenHubIssuesResult> {
    const data = await this.#request(
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
              ownerName
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
        label,
      }
    );

    return (
      data.data.searchIssuesByPipeline?.nodes.reduce(
        (output: any, node: any) => {
          output[node.repository.name + "#" + node.number] = {
            key: node.repository.name + "#" + node.number,
            id: node.id,
            title: node.title,
            estimate: node.estimate?.value,
            pipelineName: node.pipelineIssue?.pipeline?.name,
            repositoryName: node.repository.name,
            url: `https://app.zenhub.com/workspaces/${workspaceName
              .replace(" ", "-")
              .toLocaleLowerCase()}-${workspaceId}/issues/gh/${
              node.repository.ownerName
            }/${node.repository.name}/${node.number}`,
          };
          return output;
        },
        {}
      ) || {}
    );
  }

  async getIssue(
    workspaceId: string,
    repositoryId: number,
    issueNumber: number,
    workspaceName: string
  ): Promise<ZenHubIssue> {
    const data = await this.#request(
      `query getIssue($repositoryGhId: Int!, $issueNumber: Int!, $workspaceId: ID!) {
      issueByInfo(repositoryGhId: $repositoryGhId, issueNumber: $issueNumber) {
        id
        title
        number
        repository {
          name
          ownerName
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
    }`,
      {
        workspaceId,
        repositoryGhId: repositoryId,
        issueNumber,
      }
    );

    return {
      key:
        data.data.issueByInfo.repository.name +
        "#" +
        data.data.issueByInfo.number,
      id: data.data.issueByInfo.id,
      title: data.data.issueByInfo.title,
      estimate: data.data.issueByInfo.estimate?.value,
      pipelineName: data.data.issueByInfo.pipelineIssue?.pipeline?.name,
      repositoryName: data.data.issueByInfo.repository.name,
      url: `https://app.zenhub.com/workspaces/${workspaceName
        .replace(" ", "-")
        .toLocaleLowerCase()}-${workspaceId}/issues/gh/${
        data.data.issueByInfo.repository.ownerName
      }/${data.data.issueByInfo.repository.name}/${
        data.data.issueByInfo.number
      }`,
    };
  }

  async setPipeline(workspaceId: string, issueId: string, pipelineId: string) {
    await this.#request(
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

  async setEstimate(issueId: string, estimate: number) {
    await this.#request(
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

  async #request(query: string, variables: Record<string, any>): Promise<any> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
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
      throw new Error(
        data.errors.map((error: Error) => error.message).join("\n")
      );
    }

    return data;
  }
}

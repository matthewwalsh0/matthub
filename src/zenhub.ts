const API_URL = "https://api.zenhub.com/public/graphql";

export type ZenHubMetadata = {
  workspaceId: string;
  pipelines: Record<string, string>;
  estimates: Record<string, number[]>;
};

export type ZenHubIssue = {
  key: string;
  id: string;
  title: string;
  estimate: number;
  pipelineName: string;
  repositoryName: string;
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
      estimates:
        data.data.viewer.searchWorkspaces.nodes[0].repositoriesConnection.nodes.reduce(
          (output: Record<string, number[]>, repository: any) => {
            output[repository.name] = repository.estimateSet.values;
            return output;
          },
          {}
        ),
    };
  }

  async getIssues(
    workspaceId: string,
    pipelineId: string,
    label: string
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
          };
          return output;
        },
        {}
      ) || {}
    );
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

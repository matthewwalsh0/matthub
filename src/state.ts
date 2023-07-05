import Storage from "./storage";
import ZenHub, { ZenHubIssuesResult, ZenHubMetadata } from "./zenhub";

const STATE_VERSION = 4;
const CACHE_DURATION = 1000 * 60 * 10; // 10 Minutes
const LABEL_FILTER = "team-confirmations-system";

export type State = {
  zenHubMetadata: ZenHubMetadata;
  zenHubIssues: ZenHubIssuesResult;
  cachedAt: number;
  version: number;
  apiKey: string;
};

export async function getState() {
  const storage = new Storage<State>();

  const state = await storage.getMany([
    "zenHubMetadata",
    "zenHubIssues",
    "cachedAt",
    "version",
    "apiKey",
  ]);

  if (!state.apiKey) {
    state.apiKey = prompt("Enter your ZenHub API key");
    storage.set("apiKey", state.apiKey);
  }

  const zenHub = new ZenHub({ apiKey: state.apiKey });

  if (
    state.version === STATE_VERSION &&
    state.zenHubIssues &&
    state.zenHubMetadata &&
    state.cachedAt &&
    state.cachedAt > Date.now() - CACHE_DURATION
  ) {
    return {state: state as State, zenHub, storage};
  }

  const zenHubMetadata = await zenHub.getMetadata();
  let zenHubIssues = {};

  for (const pipelineId of Object.values(zenHubMetadata.pipelines)) {
    const issues = await zenHub.getIssues(
      zenHubMetadata.workspaceId,
      pipelineId,
      LABEL_FILTER
    );

    zenHubIssues = { ...zenHubIssues, ...issues };
  }

  const newState = {
    zenHubMetadata,
    zenHubIssues,
    cachedAt: Date.now(),
    version: STATE_VERSION,
    apiKey: state.apiKey,
  };

  await storage.setMany(newState);

  return {state: newState as State, zenHub, storage};
}

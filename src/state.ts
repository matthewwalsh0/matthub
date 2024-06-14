import Storage from "./storage";
import ZenHub, {
  ZenHubIssue,
  ZenHubIssuesResult,
  ZenHubMetadata,
} from "./zenhub";

const STATE_VERSION = 4;
const CACHE_DURATION_DEFAULT = 60 * 10; // 10 Minutes

export type State = {
  cachedAt?: number;
  version?: number;
  zenHubIssues?: ZenHubIssuesResult;
  zenHubMetadata?: ZenHubMetadata;
} & Config;

export type Config = {
  apiKey?: string;
  cacheDuration?: number;
  labelFilter?: string;
  workspaceName?: string;
};

export type Cache = {
  cachedAt?: number;
  version?: number;
  zenHubIssues?: ZenHubIssuesResult;
  zenHubMetadata?: ZenHubMetadata;
};

const cachedState: State = {};

export async function initState() {
  const storage = new Storage<State>();

  Object.assign(
    cachedState,
    await storage.getMany([
      "apiKey",
      "cachedAt",
      "cacheDuration",
      "labelFilter",
      "version",
      "workspaceName",
      "zenHubIssues",
      "zenHubMetadata",
    ])
  );
}

export async function updateState() {
  const apiKey = getApiKey();
  const labelFilter = getLabelFilter();
  const workspaceName = getWorkspaceName();
  const cacheDuration = getCacheDuration();

  if (!apiKey || !labelFilter || !workspaceName) {
    return;
  }

  let cachedAt = getCachedAt();
  let version = getStorageVersion();
  let zenHubIssues = getZenHubIssues();
  let zenHubMetadata = getZenHubMetadata();

  if (
    version === STATE_VERSION &&
    cachedAt >= Date.now() - (cacheDuration * 1000) &&
    zenHubIssues &&
    zenHubMetadata
  ) {
    return;
  }

  const zenHub = new ZenHub({ apiKey });

  zenHubMetadata = await zenHub.getMetadata(workspaceName);
  zenHubIssues = {};

  for (const pipelineId of Object.values(zenHubMetadata.pipelines)) {
    const issues = await zenHub.getIssues(
      zenHubMetadata.workspaceId,
      pipelineId,
      labelFilter,
      workspaceName
    );

    zenHubIssues = { ...zenHubIssues, ...issues };
  }

  const updatedState = {
    cachedAt: Date.now(),
    version: STATE_VERSION,
    zenHubIssues,
    zenHubMetadata,
  };

  await new Storage<Cache>().setMany(updatedState);

  Object.assign(cachedState, updatedState);
}

export function getApiKey(): string | undefined {
  return cachedState.apiKey;
}

export function getLabelFilter(): string | undefined {
  return cachedState.labelFilter;
}

export function getWorkspaceName(): string | undefined {
  return cachedState.workspaceName;
}

export function getZenHubIssues(): ZenHubIssuesResult | undefined {
  return cachedState.zenHubIssues;
}

export function getZenHubMetadata(): ZenHubMetadata | undefined {
  return cachedState.zenHubMetadata;
}

export function getStorageVersion(): number | undefined {
  return cachedState.version;
}

export function getCachedAt(): number | undefined {
  return cachedState.cachedAt;
}

export function getCacheDuration(): number {
  return cachedState.cacheDuration || CACHE_DURATION_DEFAULT;
}

export async function setPipeline(
  zenHubIssue: ZenHubIssue,
  pipelineId: string
) {
  const apiKey = getApiKey();
  const zenHub = new ZenHub({ apiKey });
  const workspaceId = getZenHubMetadata()?.workspaceId;

  try {
    await zenHub.setPipeline(workspaceId, zenHubIssue.id, pipelineId);
  } catch (e) {
    console.error(
      `MattHub Error - Failed to set ZenHub pipeline - ${e.message}`
    );

    throw e;
  }

  const zenHubIssues = getZenHubIssues();

  const updatedZenHubIssues = {
    ...zenHubIssues,
    [zenHubIssue.key]: { ...zenHubIssue, pipelineId },
  };

  await new Storage<Cache>().set("zenHubIssues", updatedZenHubIssues);

  cachedState.zenHubIssues = updatedZenHubIssues;
}

export async function setEstimate(
  zenHubIssue: ZenHubIssue,
  estimate: number | null
) {
  const apiKey = getApiKey();
  const zenHub = new ZenHub({ apiKey });

  try {
    await zenHub.setEstimate(zenHubIssue.id, estimate);
  } catch (e) {
    console.error(
      `MattHub Error - Failed to set ZenHub estimate - ${e.message}`
    );

    throw e;
  }

  const zenHubIssues = getZenHubIssues();

  const updatedZenHubIssues = {
    ...zenHubIssues,
    [zenHubIssue.key]: { ...zenHubIssue, estimate },
  };

  await new Storage<Cache>().set("zenHubIssues", updatedZenHubIssues);

  cachedState.zenHubIssues = updatedZenHubIssues;
}

export async function refresh(repositoryId: number, issueNumber: number) {
  const apiKey = getApiKey();
  const workspaceName = getWorkspaceName();
  const zenHubMetadata = getZenHubMetadata();
  const zenHub = new ZenHub({ apiKey });

  let issue: ZenHubIssue;

  try {
    issue = await zenHub.getIssue(
      zenHubMetadata.workspaceId,
      repositoryId,
      issueNumber,
      workspaceName
    );
  } catch (e) {
    console.error(
      `MattHub Error - Failed to refresh ZenHub issue - ${e.message}`
    );

    throw e;
  }

  const zenHubIssues = getZenHubIssues();

  const updatedZenHubIssues = {
    ...zenHubIssues,
    [issue.key]: issue,
  };

  await new Storage<Cache>().set("zenHubIssues", updatedZenHubIssues);

  cachedState.zenHubIssues = updatedZenHubIssues;
}

export async function setConfig(config: Config) {
  await new Storage<Config>().setMany(config);
  Object.assign(cachedState, config);
}

export async function clearCache() {
  await new Storage<Cache>().setMany({
    cachedAt: 0,
  });
}

import Storage from "./storage";
import ZenHub, { ZenHubIssuesResult, ZenHubMetadata } from "./zenhub";

const STATE_VERSION = 4;
const CACHE_DURATION = 1000 * 60 * 10; // 10 Minutes

export type State = {
  apiKey?: string;
  cachedAt?: number;
  labelFilter?: string;
  version?: number;
  workspaceName?: string;
  zenHubIssues?: ZenHubIssuesResult;
  zenHubMetadata?: ZenHubMetadata;
};

export type Config = {
  apiKey?: string;
  labelFilter?: string;
  workspaceName?: string;
};

export type Cache = {
  cachedAt?: number;
  version?: number;
  zenHubIssues?: ZenHubIssuesResult;
  zenHubMetadata?: ZenHubMetadata;
};

export async function getConfig(): Promise<Config> {
  return new Storage<Config>().getMany([
    "apiKey",
    "labelFilter",
    "workspaceName",
  ]);
}

export async function getCache(): Promise<Cache> {
  const config = await getConfig();

  let cache = await new Storage<Cache>().getMany([
    "cachedAt",
    "version",
    "zenHubIssues",
    "zenHubMetadata",
  ]);

  if (!config.apiKey || !config.workspaceName || !config.labelFilter) {
    return {
      cachedAt: 0,
      zenHubIssues: {},
      zenHubMetadata: { workspaceId: undefined, pipelines: {}, estimates: {} },
    };
  }

  if (
    !cache ||
    cache.version !== STATE_VERSION ||
    cache.cachedAt < Date.now() - CACHE_DURATION ||
    !cache.zenHubIssues ||
    !cache.zenHubMetadata
  ) {
    const zenHub = new ZenHub({ apiKey: config.apiKey });
    const zenHubMetadata = await zenHub.getMetadata(config.workspaceName);
    let zenHubIssues = {};

    for (const pipelineId of Object.values(zenHubMetadata.pipelines)) {
      const issues = await zenHub.getIssues(
        zenHubMetadata.workspaceId,
        pipelineId,
        config.labelFilter
      );

      zenHubIssues = { ...zenHubIssues, ...issues };
    }

    cache = {
      cachedAt: Date.now(),
      version: STATE_VERSION,
      zenHubIssues,
      zenHubMetadata,
    };

    await new Storage<Cache>().setMany(cache);
  }

  return cache;
}

export async function setConfig(config: Config) {
  await new Storage<Config>().setMany(config);
}

export async function clearCache() {
  await new Storage<Cache>().setMany({
    cachedAt: 0,
  });
}

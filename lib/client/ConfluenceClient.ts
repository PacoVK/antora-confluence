import {
  ConfluenceAttachment,
  ConfluencePage,
  ConfluencePageStatus,
} from "../types";
import { getLogger } from "../Logger";

interface ConfluenceClientOptions {
  baseUrl: URL;
  spaceKey: string;
  editorVersion: string;
  ancestorId?: string;
  captainName?: string;
}

const LOGGER = getLogger();

export abstract class ConfluenceClient {
  fetch: any;

  private readonly API_DEFAULT_CONTEXT = "wiki";
  private readonly API_V1_IDENTIFIER = "/rest/api";
  private readonly API_V2_IDENTIFIER = "/api/v2";
  readonly SPACE_KEY;
  readonly API_V1_PATH;
  readonly API_V2_PATH;
  readonly EDITOR_VERSION;
  readonly BASE_URL;
  readonly AUTHORIZATION_HEADER;
  readonly ANCESTOR_ID;
  readonly CAPTAIN_NAME;

  constructor(config: ConfluenceClientOptions) {
    this.BASE_URL = new URL(config.baseUrl.origin);
    this.SPACE_KEY = config.spaceKey;
    if (config.editorVersion === "v2") {
      LOGGER.warn(
        "ConfluenceClient: editorVersion v2 is not fully supported yet",
      );
    }
    this.EDITOR_VERSION = config.editorVersion;
    const apiContext = this.constructApiContext(config.baseUrl);
    this.API_V1_PATH = apiContext + this.API_V1_IDENTIFIER;
    this.API_V2_PATH = apiContext + this.API_V2_IDENTIFIER;
    this.AUTHORIZATION_HEADER = this.buildAuthHeader();
    this.ANCESTOR_ID = config.ancestorId;
    this.CAPTAIN_NAME = config.captainName || "Captain State Page";
    LOGGER.debug(
      `ConfluenceClient: constructor CAPTAIN_NAME ${this.CAPTAIN_NAME}`,
    );
  }

  async init() {
    this.fetch = await this.importFetch();
  }

  buildUrlWithPath(path: string): URL {
    const url = this.BASE_URL;
    url.pathname = path;
    return url;
  }

  async importFetch() {
    const nodeFetch = await import("node-fetch");
    return nodeFetch.default || nodeFetch;
  }

  constructApiContext(baseUrl: URL): string {
    const apiContext = this.determineApiContext(baseUrl.pathname);
    if (apiContext.length > 0) {
      return "/" + apiContext;
    } else {
      return "";
    }
  }

  determineApiContext(apiPath: string): string {
    if (apiPath === "/" || apiPath.length === 0) {
      // no context has been set
      return this.API_DEFAULT_CONTEXT;
    }
    // remove leading slash, remove api versions identifier from path
    apiPath = apiPath
      .substring(1)
      .replace(this.API_V1_IDENTIFIER, "")
      .replace(this.API_V2_IDENTIFIER, "");
    const pathParts = apiPath.split("/");
    if (pathParts.length == 1) {
      // context has been set
      return pathParts[0];
    }
    // assume that context has been omitted intentionally https://docs.atlassian.com/ConfluenceServer/rest/8.6.1/
    return "";
  }

  buildAuthHeader() {
    if (process.env.CONFLUENCE_PAT) {
      return `Bearer ${process.env.CONFLUENCE_PAT}`;
    }
    const credentials = `${process.env.CONFLUENCE_USERNAME}:${process.env.CONFLUENCE_PASSWORD}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  public abstract createPage(
    page: ConfluencePage,
    status: ConfluencePageStatus,
  ): Promise<Response>;

  abstract updatePage(
    page: ConfluencePage,
    pageId: string,
    newVersion: number,
    status?: ConfluencePageStatus,
  ): Promise<Response>;

  abstract createAttachment(
    attachment: ConfluenceAttachment,
  ): Promise<Response>;

  abstract deletePage(pageId: string): Promise<Response>;

  abstract updateAttachment(
    attachment: ConfluenceAttachment,
  ): Promise<Response>;

  abstract getAttachment(pageId: string, fileName: string): Promise<Response>;

  abstract fetchPageIdByName(
    title: string,
    status?: ConfluencePageStatus,
  ): Promise<Response>;
}

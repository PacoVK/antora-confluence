import { ConfluenceAttachment, ConfluencePage } from "../types";
import { getLogger } from "../Logger";

interface ConfluenceClientOptions {
  baseUrl: URL;
  spaceKey: string;
  editorVersion: string;
  ancestorId?: string;
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
  readonly CREDENTIALS;
  readonly ANCESTOR_ID;

  constructor(config: ConfluenceClientOptions) {
    this.BASE_URL = config.baseUrl.origin;
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
    this.CREDENTIALS = this.encodeCredentials();
    this.ANCESTOR_ID = config.ancestorId;
  }

  async init() {
    this.fetch = await this.importFetch();
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

  encodeCredentials() {
    const credentials = `${process.env.CONFLUENCE_USERNAME}:${process.env.CONFLUENCE_PASSWORD}`;
    return Buffer.from(credentials).toString("base64");
  }

  public abstract createPage(page: ConfluencePage): Promise<Response>;

  abstract updatePage(
    page: ConfluencePage,
    pageId: string,
    newVersion: number,
  ): Promise<Response>;

  abstract createAttachment(
    attachment: ConfluenceAttachment,
  ): Promise<Response>;

  abstract updateAttachment(
    attachment: ConfluenceAttachment,
  ): Promise<Response>;

  abstract getAttachment(pageId: string, fileName: string): Promise<Response>;

  abstract fetchPageIdByName(title: string): Promise<Response>;
}

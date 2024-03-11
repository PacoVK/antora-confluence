import { ConfluenceClient } from "../../lib/client/ConfluenceClient";
import {
  ConfluencePage,
  ConfluencePageStatus,
  ConfluenceAttachment,
} from "../../lib/types";

export default class ConfluenceClientStub extends ConfluenceClient {
  public createPage(
    page: ConfluencePage,
    status: ConfluencePageStatus,
  ): Promise<Response> {
    throw new Error("Method not implemented.");
  }
  updatePage(
    page: ConfluencePage,
    pageId: string,
    newVersion: number,
    status?: ConfluencePageStatus | undefined,
  ): Promise<Response> {
    throw new Error("Method not implemented.");
  }
  createAttachment(attachment: ConfluenceAttachment): Promise<Response> {
    throw new Error("Method not implemented.");
  }
  deletePage(pageId: string): Promise<Response> {
    throw new Error("Method not implemented.");
  }
  updateAttachment(attachment: ConfluenceAttachment): Promise<Response> {
    throw new Error("Method not implemented.");
  }
  getAttachment(pageId: string, fileName: string): Promise<Response> {
    throw new Error("Method not implemented.");
  }
  fetchPageIdByName(
    title: string,
    status?: ConfluencePageStatus | undefined,
  ): Promise<Response> {
    throw new Error("Method not implemented.");
  }
}

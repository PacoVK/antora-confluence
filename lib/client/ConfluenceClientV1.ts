import { ConfluenceClient } from "./ConfluenceClient";
import {
  ConfluenceAttachment,
  ConfluencePage,
  ConfluencePageStatus,
} from "../types";
import FormData from "form-data";
import { getLogger } from "../Logger";

const LOGGER = getLogger();

export class ConfluenceClientV1 extends ConfluenceClient {
  createPage(
    page: ConfluencePage,
    status: ConfluencePageStatus,
  ): Promise<Response> {
    LOGGER.info(`Creating page ${page.title}`);
    const apiUrl = this.buildUrlWithPath(`${this.API_V1_PATH}/content`);
    return this.fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Request-Content-Type": "application/json",
        Authorization: this.AUTHORIZATION_HEADER,
      },
      body: JSON.stringify({
        type: "page",
        title: page.title,
        status,
        space: {
          key: this.SPACE_KEY,
        },
        metadata: {
          properties: {
            editor: {
              value: this.EDITOR_VERSION,
            },
            "content-appearance-draft": {
              value: "full-width",
            },
            "content-appearance-published": {
              value: "full-width",
            },
          },
        },
        ancestors:
          page.parentPageId || this.ANCESTOR_ID
            ? [
                {
                  id: page.parentPageId || this.ANCESTOR_ID,
                },
              ]
            : undefined,
        body: {
          storage: {
            value: page.content,
            representation: "storage",
          },
        },
      }),
    });
  }

  updatePage(
    page: ConfluencePage,
    pageId: string,
    newVersion: number,
    status?: ConfluencePageStatus,
  ): Promise<Response> {
    LOGGER.info(`Updating page ${page.title} with new version ${newVersion}`);
    const apiUrl = this.buildUrlWithPath(
      `${this.API_V1_PATH}/content/${pageId}`,
    );
    return this.fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Request-Content-Type": "application/json",
        Authorization: this.AUTHORIZATION_HEADER,
      },
      body: JSON.stringify({
        type: "page",
        version: {
          number: newVersion,
        },
        title: page.title,
        status,
        metadata: {
          properties: {
            editor: {
              value: this.EDITOR_VERSION,
            },
            "content-appearance-draft": {
              value: "full-width",
            },
            "content-appearance-published": {
              value: "full-width",
            },
          },
        },
        body: {
          storage: {
            value: page.content,
            representation: "storage",
          },
        },
      }),
    });
  }

  createAttachment(attachment: ConfluenceAttachment): Promise<Response> {
    const formData = new FormData();
    formData.append("file", attachment.file, {
      filename: attachment.fileName,
    });
    formData.append("comment", attachment.comment);
    formData.append("minorEdit", "true");
    const apiUrl = this.buildUrlWithPath(
      `${this.API_V1_PATH}/content/${attachment.pageId}/child/attachment`,
    );
    return this.fetch(apiUrl, {
      method: "POST",
      body: formData,
      headers: {
        ...formData.getHeaders(),
        Accept: "application/json",
        "X-Atlassian-Token": "nocheck",
        Authorization: this.AUTHORIZATION_HEADER,
      },
    });
  }

  fetchPageIdByName(
    title: string,
    status?: ConfluencePageStatus,
  ): Promise<Response> {
    const apiUrl = this.buildUrlWithPath(`${this.API_V1_PATH}/content`);
    apiUrl.searchParams.set("spaceKey", this.SPACE_KEY);
    apiUrl.searchParams.set("title", title);
    apiUrl.searchParams.set("status", status || ConfluencePageStatus.CURRENT);
    apiUrl.searchParams.set("expand", "body.storage,version");
    return this.fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Request-Content-Type": "application/json",
        Authorization: this.AUTHORIZATION_HEADER,
      },
    });
  }

  deletePage(pageId: string): Promise<Response> {
    const apiUrl = this.buildUrlWithPath(
      `${this.API_V1_PATH}/content/${pageId}`,
    );
    return this.fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Request-Content-Type": "application/json",
        Authorization: this.AUTHORIZATION_HEADER,
      },
    });
  }

  getAttachment(pageId: string, fileName: string): Promise<Response> {
    const apiUrl = this.buildUrlWithPath(
      `${this.API_V1_PATH}/content/${pageId}/child/attachment`,
    );
    apiUrl.searchParams.set("filename", fileName);
    return this.fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Request-Content-Type": "application/json",
        Authorization: this.AUTHORIZATION_HEADER,
      },
    });
  }

  updateAttachment(attachment: ConfluenceAttachment): Promise<Response> {
    const formData = new FormData();
    formData.append("file", attachment.file, {
      filename: attachment.fileName,
    });
    formData.append("comment", attachment.comment);
    formData.append("minorEdit", "true");
    const apiUrl = this.buildUrlWithPath(
      `${this.API_V1_PATH}/content/${attachment.pageId}/child/attachment/${attachment.attachmentId}/data`,
    );
    return this.fetch(apiUrl, {
      method: "POST",
      body: formData,
      headers: {
        ...formData.getHeaders(),
        Accept: "application/json",
        "X-Atlassian-Token": "nocheck",
        Authorization: this.AUTHORIZATION_HEADER,
      },
    });
  }
}

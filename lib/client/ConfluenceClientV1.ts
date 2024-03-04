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
    return this.fetch(`${this.BASE_URL}/${this.API_V1_PATH}/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Request-Content-Type": "application/json",
        Authorization: `Basic ${this.CREDENTIALS}`,
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
    return this.fetch(
      `${this.BASE_URL}/${this.API_V1_PATH}/content/${pageId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Request-Content-Type": "application/json",
          Authorization: `Basic ${this.CREDENTIALS}`,
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
      },
    );
  }

  createAttachment(attachment: ConfluenceAttachment): Promise<Response> {
    const formData = new FormData();
    formData.append("file", attachment.file, {
      filename: attachment.fileName,
    });
    formData.append("comment", attachment.comment);
    formData.append("minorEdit", "true");
    return this.fetch(
      `${this.BASE_URL}/${this.API_V1_PATH}/content/${attachment.pageId}/child/attachment`,
      {
        method: "POST",
        body: formData,
        headers: {
          ...formData.getHeaders(),
          Accept: "application/json",
          "X-Atlassian-Token": "nocheck",
          Authorization: `Basic ${this.CREDENTIALS}`,
        },
      },
    );
  }

  fetchPageIdByName(
    title: string,
    status?: ConfluencePageStatus,
  ): Promise<Response> {
    return this.fetch(
      `${this.BASE_URL}/${this.API_V1_PATH}/content?spaceKey=${this.SPACE_KEY}&title=${encodeURIComponent(title)}&status=${status || ConfluencePageStatus.CURRENT}&expand=body.storage,version`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Request-Content-Type": "application/json",
          Authorization: `Basic ${this.CREDENTIALS}`,
        },
      },
    );
  }

  deletePage(pageId: string): Promise<Response> {
    return this.fetch(
      `${this.BASE_URL}/${this.API_V1_PATH}/content/${pageId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Request-Content-Type": "application/json",
          Authorization: `Basic ${this.CREDENTIALS}`,
        },
      },
    );
  }

  getAttachment(pageId: string, fileName: string): Promise<Response> {
    return this.fetch(
      `${this.BASE_URL}/${this.API_V1_PATH}/content/${pageId}/child/attachment?filename=${fileName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Request-Content-Type": "application/json",
          Authorization: `Basic ${this.CREDENTIALS}`,
        },
      },
    );
  }

  updateAttachment(attachment: ConfluenceAttachment): Promise<Response> {
    const formData = new FormData();
    formData.append("file", attachment.file, {
      filename: attachment.fileName,
    });
    formData.append("comment", attachment.comment);
    formData.append("minorEdit", "true");
    return this.fetch(
      `${this.BASE_URL}/${this.API_V1_PATH}/content/${attachment.pageId}/child/attachment/${attachment.attachmentId}/data`,
      {
        method: "POST",
        body: formData,
        headers: {
          ...formData.getHeaders(),
          Accept: "application/json",
          "X-Atlassian-Token": "nocheck",
          Authorization: `Basic ${this.CREDENTIALS}`,
        },
      },
    );
  }
}

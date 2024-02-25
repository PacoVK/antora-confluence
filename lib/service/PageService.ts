import { ANTORA_DEFAULTS, Placeholder } from "../constants/Enum";
import { getPageTitle } from "../parser/HtmlDomParser";
import path from "node:path";
import { sendRequest } from "./RESTApiService";
import parse from "node-html-parser";
import { readFileSync } from "fs";
import { calculateHash, calculateHashOfStream } from "./HashCalculatorService";
import Path from "path";
import parseAnchors from "../parser/AnchorParser";
import rewriteImages from "../transformer/ImageTransformer";
import rewriteAdmonitionBlocks from "../transformer/AdmonitionBlockTransformer";
import rewriteCodeBlocks from "../transformer/CodeBlockTransformer";
import rewriteMarks from "../transformer/MarkTransformer";
import {
  rewriteDescriptionLists,
  rewriteInternalLinks,
} from "../transformer/LinkTransformer";
import rewriteCDATASections from "../transformer/CdataTransformer";
import { ConfluenceClient } from "../client/ConfluenceClient";
import { BufferFile } from "vinyl";
import { getLogger } from "../Logger";
import { FileFilter, PageFilter, PathFilter } from "../types";

const LOGGER = getLogger();

const matchesFilter = (file: BufferFile, filters: PageFilter[]) => {
  const matches = filters?.filter((filter) => {
    const pathFilter = (filter as PathFilter).path;
    const fileFilter = (filter as FileFilter).files;
    if (pathFilter) {
      return Path.dirname(file.path).startsWith(pathFilter);
    } else if (fileFilter) {
      return fileFilter.includes(file.path);
    } else {
      LOGGER.error(`Invalid filter defined ${JSON.stringify(filter)}`);
      throw new Error(
        "Filter must be a valid type of PathFilter or FileFilter",
      );
    }
  });
  return matches.length > 0;
};

const buildPageStructure = async (
  files: BufferFile[],
  target: any,
  filters?: PageFilter[],
) => {
  for await (const file of files) {
    const fileName = file.path;
    if (
      fileName.startsWith("_") ||
      !fileName.endsWith(".html") ||
      fileName.includes(ANTORA_DEFAULTS.NOT_FOUND_PAGE)
    ) {
      LOGGER.debug(`Skipping ${fileName}`);
      continue;
    }
    if (filters && !matchesFilter(file, filters)) {
      continue;
    }
    const parts = fileName.split("/");
    let currentObject = target;

    for (let i = 0; i < parts.length - 1; i++) {
      let part;
      if (i === 0) {
        part = parts[i];
      } else {
        part = `[${parts[0]}]-${parts[i]}`;
      }

      if (!currentObject[part]) {
        currentObject[part] = {};
      }

      currentObject = currentObject[part];
    }

    const lastPart = parts[parts.length - 1];
    let pageTitle = getPageTitle(file.contents.toString());
    pageTitle = target.get("inventory").get(pageTitle)
      ? `${parts[parts.length - 2]}-${pageTitle}`
      : pageTitle;
    const page = {
      fileName: lastPart,
      pageTitle,
      content: file.contents,
      parent: parts[parts.length - 2],
      fqfn: file.path,
    };
    if (target.get("inventory").get(pageTitle)) {
      target
        .get("inventory")
        .set(`${parts[parts.length - 2]}-${pageTitle}`, page);
    } else {
      target.get("inventory").set(pageTitle, page);
    }
    if (!currentObject["sibling_pages"]) {
      currentObject["sibling_pages"] = [page];
    } else {
      currentObject["sibling_pages"].push(page);
    }
  }
  target.delete("inventory");
};

const createParentIfNotExists = async (
  confluenceClient: ConfluenceClient,
  parent?: string,
  parentParent?: string,
) => {
  if (!parent) {
    return;
  }
  const componentPage = await sendRequest(
    confluenceClient.fetchPageIdByName(parent),
  );
  if (componentPage.results && componentPage.results.length > 0) {
    const { id, version } = componentPage.results[0];
    LOGGER.debug(
      `Component page exists, skipping...[${parent}] with id [${id}]`,
    );
    return { id, version };
  } else {
    let parentParentId;
    if (parentParent) {
      const parentPage = await sendRequest(
        confluenceClient.fetchPageIdByName(parentParent),
      );
      if (parentPage.results && parentPage.results.length > 0) {
        parentParentId = parentPage.results[0].id;
      }
    }
    LOGGER.debug(
      `Component page does not exist, creating...[${parent}] with parent [${parentParentId}]`,
    );
    const { id } = (await sendRequest(
      confluenceClient.createPage({
        title: parent,
        content: `<h1>${parent}</h1>`,
        parentPageId: parentParentId,
      }),
    )) as any;
    return { id, version: 1 };
  }
};

const publish = async (
  confluenceClient: ConfluenceClient,
  outPutDir: string,
  pageTree: any,
  parent?: string,
) => {
  for (const key in pageTree) {
    if (Array.isArray(pageTree[key])) {
      const parentPage = await createParentIfNotExists(
        confluenceClient,
        parent,
      );
      const parentId = parentPage?.id;
      const pages = pageTree[key];
      for (const page of pages) {
        const confluencePage = processPage(page, outPutDir);
        if (confluencePage) {
          const localHash = confluencePage.hash;
          let pageId;
          if (page.fileName === "index.html") {
            confluencePage.title = parent;
            const { id } = await sendRequest(
              confluenceClient.updatePage(
                confluencePage,
                parentId,
                parentPage?.version.number + 1,
              ),
            );
            pageId = id;
          } else {
            const componentPage = await sendRequest(
              confluenceClient.fetchPageIdByName(confluencePage.title),
            );
            if (componentPage.results && componentPage.results.length > 0) {
              const { id, version } = componentPage.results[0];
              const pageComp = parse(
                componentPage.results[0].body.storage.value,
              );
              const hashTag =
                pageComp.getElementsByTagName("ac:placeholder")[0].text;
              const match = hashTag.match(/#(.*)#/);
              const remoteHash = match ? match[1] : null;
              if (remoteHash !== localHash) {
                LOGGER.debug(
                  `Component page exists, update...[${parent}] with id [${id}]`,
                );
                pageId = id;
                await sendRequest(
                  confluenceClient.updatePage(
                    {
                      title: `${confluencePage.title}`,
                      content: confluencePage.content,
                      parentPageId: parentId,
                    },
                    pageId,
                    version.number + 1,
                  ),
                );
              } else {
                LOGGER.info("Page hasn't changed!");
              }
            } else {
              const { id } = await sendRequest(
                confluenceClient.createPage({
                  title: `${confluencePage.title}`,
                  content: confluencePage.content,
                  parentPageId: parentId,
                }),
              );
              pageId = id;
            }
          }
          if (pageId) {
            for (const upload of confluencePage.attachments) {
              try {
                const buffer = readFileSync(upload.filePath);
                const localHashAttachment = calculateHashOfStream(buffer);
                const attachment = await sendRequest(
                  confluenceClient.getAttachment(pageId, upload.fileName),
                );
                if (attachment.results && attachment.results.length > 0) {
                  if (
                    localHashAttachment ===
                    attachment.results[0].extensions.comment.replace(
                      /.*#([^#]+)#.*/s,
                      "$1",
                    )
                  ) {
                    LOGGER.info("Attachment hasn't changed!");
                  } else {
                    LOGGER.info(
                      `Attachment has changed, updating... ${attachment.results[0].id}`,
                    );
                    await sendRequest(
                      confluenceClient.updateAttachment({
                        pageId,
                        fileName: upload.fileName,
                        file: buffer,
                        comment:
                          upload.comment + `\r\n#${localHashAttachment}#`,
                        attachmentId: attachment.results[0].id,
                      }),
                    );
                  }
                } else {
                  LOGGER.debug(
                    `Attachment ${upload.fileName} does not exist, creating...`,
                  );
                  await sendRequest(
                    confluenceClient.createAttachment({
                      pageId,
                      fileName: upload.fileName,
                      file: buffer,
                      comment: upload.comment + `\r\n#${localHashAttachment}#`,
                    }),
                  );
                }
              } catch (e) {
                LOGGER.error(`Error uploading attachment ${upload}`);
              }
            }
          }
        }
      }
    } else if (typeof pageTree[key] === "object") {
      await createParentIfNotExists(confluenceClient, key, parent);
      await publish(confluenceClient, outPutDir, pageTree[key], key);
    }
  }
};

const processPage = (page: any, outPutDir: string) => {
  LOGGER.info(`Processing ${page.fileName}`);
  const baseUrl = path.join(process.cwd(), outPutDir, Path.dirname(page.fqfn));
  const htmlFilePath = path.join(process.cwd(), outPutDir, page.fqfn);
  const htmlFileContent = page.content.toString();
  const dom = parse(htmlFileContent, {
    blockTextElements: { code: true },
    voidTag: {
      closingSlash: true,
    },
  });
  const content = dom.querySelector("article.doc");
  if (content) {
    const anchors = parseAnchors(content);
    const uploads = rewriteImages(content, baseUrl);
    rewriteAdmonitionBlocks(content);
    rewriteCodeBlocks(content);
    rewriteMarks(content);
    rewriteInternalLinks(content, anchors, htmlFilePath);
    rewriteDescriptionLists(content);
    rewriteCDATASections(content);

    let htmlContent = content
      .toString()
      .replaceAll("<br>", "<br/>")
      .replaceAll("</br>", "<br/>")
      .replaceAll("<a([^>]*)></a>", "")
      .replaceAll("checked />", 'checked="checked" />')
      .replaceAll(Placeholder.CDATA_PLACEHOLDER_START, "<![CDATA[")
      .replaceAll(Placeholder.CDATA_PLACEHOLDER_END, "]]>");
    const localHash = calculateHash(htmlContent);
    htmlContent += `<ac:placeholder>hash: #${localHash}#</ac:placeholder>`;
    return {
      title: page.pageTitle,
      content: htmlContent,
      attachments: uploads,
      hash: localHash,
    };
  }
};

export { buildPageStructure, publish };

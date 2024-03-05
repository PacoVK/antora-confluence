import {
  ANTORA_DEFAULTS,
  PageIdentifier,
  Placeholder,
} from "../constants/Enum";
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
import {
  ConfluencePageStatus,
  FileFilter,
  PageFilter,
  PageRepresentation,
  PathFilter,
  PathMapper,
} from "../types";

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
  mappers?: PathMapper[],
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
    let parts = fileName.split("/");
    let currentObject = target;

    let mapper: PathMapper | undefined;
    if (mappers) {
      mapper = mappers.find((mapper) => {
        return fileName.startsWith(mapper.path);
      });
      if (mapper) {
        if (!currentObject[mapper.target]) {
          currentObject[mapper.target] = {};
        }

        currentObject = currentObject[mapper.target];
        parts = fileName
          .replace(`${Path.normalize(mapper.path)}/`, "")
          .split("/");
      }
    }

    if (!mapper || parts.length > 1) {
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
    }

    const lastPart = parts[parts.length - 1];
    let pageTitle = getPageTitle(file.contents.toString());
    pageTitle = target.get("inventory").get(pageTitle)
      ? `${parts[parts.length - 2]}-${pageTitle}`
      : pageTitle!;
    const page: PageRepresentation = {
      fileName: lastPart,
      pageTitle,
      parent: parts[parts.length - 2],
      fqfn: file.path,
      id: calculateHash(file.path),
    };
    if (target.get("inventory").get(pageTitle)) {
      target
        .get("inventory")
        .set(`${parts[parts.length - 2]}-${pageTitle}`, page);
      target.get("flat").push({
        ...page,
        pageTitle: `${parts[parts.length - 2]}-${pageTitle}`,
      });
    } else {
      target.get("inventory").set(pageTitle, page);
      target.get("flat").push(page);
    }
    if (!currentObject["sibling_pages"]) {
      currentObject["sibling_pages"] = [{ ...page, content: file.contents }];
    } else {
      currentObject["sibling_pages"].push({ ...page, content: file.contents });
    }
  }
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
      confluenceClient.createPage(
        {
          title: parent,
          content: `<h1>${parent}</h1>`,
          parentPageId: parentParentId,
        },
        ConfluencePageStatus.CURRENT,
      ),
    )) as any;
    return { id, version: 1 };
  }
};

const deletePages = async (
  confluenceClient: ConfluenceClient,
  removals: any[],
) => {
  for await (const page of removals) {
    const response = await sendRequest(
      confluenceClient.fetchPageIdByName(page.pageTitle),
    );
    if (response.results && response.results.length > 0) {
      LOGGER.info(
        `Deleting page ${page.pageTitle} with ID ${response.results[0].id}`,
      );
      await sendRequest(confluenceClient.deletePage(response.results[0].id));
    }
  }
};

const publish = async (
  confluenceClient: ConfluenceClient,
  outPutDir: string,
  pageTree: any,
  renames: any[],
  showBanner: boolean,
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
        const confluencePage = processPage(page, outPutDir, showBanner);
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
            const rename = renames.filter((rename) => {
              return confluencePage.title === rename.newOne.pageTitle;
            });
            const fetchTitle =
              rename.length > 0
                ? rename[0].oldOne.pageTitle
                : confluencePage.title;
            const componentPage = await sendRequest(
              confluenceClient.fetchPageIdByName(fetchTitle),
            );
            if (
              componentPage.results &&
              componentPage.results.length > 0 &&
              rename.length === 0
            ) {
              const { id, version } = componentPage.results[0];
              const pageComp = parse(
                componentPage.results[0].body.storage.value,
              );
              const remoteHash = pageComp.querySelector(
                `.${PageIdentifier.LOCAL_HASH_TAG_ID}`,
              )?.rawText;
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
              if (componentPage.results && componentPage.results.length > 0) {
                const { id } = componentPage.results[0];
                LOGGER.info(`Deleting old page with id ${id}`);
                await confluenceClient.deletePage(id);
              }
              const { id } = await sendRequest(
                confluenceClient.createPage(
                  {
                    title: `${confluencePage.title}`,
                    content: confluencePage.content,
                    parentPageId: parentId,
                  },
                  ConfluencePageStatus.CURRENT,
                ),
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
      await publish(
        confluenceClient,
        outPutDir,
        pageTree[key],
        renames,
        showBanner,
        key,
      );
    }
  }
};

const processPage = (page: any, outPutDir: string, showBanner: boolean) => {
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
    if (showBanner) {
      htmlContent = `<ac:structured-macro ac:name="note" ac:schema-version="1"><ac:rich-text-body>
                    <p>This page has been published via Antora plugin. 
                    Every change to this site will be lost, if you run Antora the next time. 
                    You can still use comments, as they will be preserved.</p>
                    </ac:rich-text-body></ac:structured-macro>${htmlContent}`;
    }
    const localHash = calculateHash(htmlContent);
    htmlContent += `<ac:placeholder><p class="${PageIdentifier.LOCAL_HASH_TAG_ID}">${localHash}</p></ac:placeholder>`;
    return {
      title: page.pageTitle,
      content: htmlContent,
      attachments: uploads,
      hash: localHash,
      meta: {
        id: page.id,
      },
    };
  }
};

export { buildPageStructure, publish, deletePages };

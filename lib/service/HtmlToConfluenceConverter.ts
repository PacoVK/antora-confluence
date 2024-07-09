import { HTMLElement } from "node-html-parser";
import rewriteAnchors from "../parser/AnchorParser";
import rewriteImages from "../transformer/ImageTransformer";
import rewriteAdmonitionBlocks from "../transformer/AdmonitionBlockTransformer";
import rewriteCodeBlocks from "../transformer/CodeBlockTransformer";
import rewriteMarks from "../transformer/MarkTransformer";
import {
  rewriteDescriptionLists,
  rewriteInternalLinks,
} from "../transformer/LinkTransformer";
import rewriteCDATASections from "../transformer/CdataTransformer";
import { AttachmentRepresentation, IConversionOutput } from "../types";

interface HtmlToConfluenceConverterOutput extends IConversionOutput {
  uploads: AttachmentRepresentation[];
}

export const convertHtmlToConfluence = (
  input: HTMLElement,
  baseUrl: string,
  page: any,
  flatPages: any,
): HtmlToConfluenceConverterOutput => {
  let transformedContent: HTMLElement;
  transformedContent = rewriteAnchors(input).content;
  const { uploads, content } = rewriteImages(transformedContent, baseUrl);
  transformedContent = content;
  transformedContent = rewriteAdmonitionBlocks(content).content;
  transformedContent = rewriteCodeBlocks(content).content;
  transformedContent = rewriteMarks(content).content;
  transformedContent = rewriteInternalLinks(
    content,
    page.fqfn,
    flatPages,
  ).content;
  transformedContent = rewriteDescriptionLists(content).content;
  transformedContent = rewriteCDATASections(content).content;
  return {
    content: transformedContent,
    uploads,
  };
};

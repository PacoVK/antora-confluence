import { HTMLElement } from "node-html-parser";
import { ITransformerOutput } from "../types";

enum AdmonitionType {
  note = "info",
  warning = "warning",
  important = "warning",
  caution = "note",
  tip = "tip",
}

const parseAdmonitionBlock = (block: HTMLElement, type: AdmonitionType) => {
  const content = block.querySelector(".content");
  const titleElement = block.querySelector(".title");
  let titleText = "";
  if (titleElement != null) {
    titleText = `<ac:parameter ac:name="title">${titleElement.text}</ac:parameter>`;
    titleElement.remove();
  }
  block.insertAdjacentHTML(
    "afterend",
    `<ac:structured-macro ac:name="${type}">${titleText}<ac:rich-text-body>${content}</ac:rich-text-body></ac:structured-macro>`,
  );
  block.remove();
};

const rewriteAdmonitionBlocks = (content: HTMLElement): ITransformerOutput => {
  Object.keys(AdmonitionType).forEach((key: string) => {
    content.querySelectorAll(`.admonitionblock.${key}`).forEach((element) => {
      //@ts-ignore
      parseAdmonitionBlock(element, AdmonitionType[key]);
    });
  });
  return {
    content,
  };
};

export default rewriteAdmonitionBlocks;

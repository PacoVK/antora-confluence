import { HTMLElement } from "node-html-parser";
import { IParserOutput } from "../types";

interface AnchorParserOutput extends IParserOutput {
  anchors: Map<string, string>;
}

const rewriteAnchors = (content: HTMLElement): AnchorParserOutput => {
  const anchors = new Map<string, string>();
  content.querySelectorAll("[id]").forEach((anchor) => {
    const name = anchor.getAttribute("id");
    const anchorTitle = anchor.text;
    if (name && anchorTitle) {
      anchors.set(name, anchorTitle);
    }
    anchor.insertAdjacentHTML(
      "beforebegin",
      `<ac:structured-macro ac:name="anchor"><ac:parameter ac:name="">${name}</ac:parameter></ac:structured-macro>`,
    );
  });
  return {
    anchors,
    content,
  };
};

export default rewriteAnchors;

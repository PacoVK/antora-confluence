import { HTMLElement } from "node-html-parser";

const rewriteAnchors = (content: HTMLElement) => {
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
  return anchors;
};

export default rewriteAnchors;

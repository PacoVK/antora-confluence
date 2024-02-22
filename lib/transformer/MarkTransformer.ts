import { HTMLElement } from "node-html-parser";

const rewriteMarks = (content: HTMLElement) => {
  content.querySelectorAll("mark").forEach((mark) => {
    mark.replaceWith(`<span style="background:#ff0;color:#000"></style>`);
  });
};

export default rewriteMarks;

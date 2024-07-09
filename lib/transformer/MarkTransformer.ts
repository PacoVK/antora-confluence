import { HTMLElement } from "node-html-parser";
import { ITransformerOutput } from "../types";

const rewriteMarks = (content: HTMLElement): ITransformerOutput => {
  content.querySelectorAll("mark").forEach((mark) => {
    mark.replaceWith(`<span style="background:#ff0;color:#000"></style>`);
  });
  return {
    content,
  };
};

export default rewriteMarks;

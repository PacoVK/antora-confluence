import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import parse from "node-html-parser";
import rewriteCodeBlocks from "../../lib/transformer/CodeBlockTransformer";

describe("CodeBlockTransformer", () => {
  it("should transform code blocks", () => {
    const input = readFileSync("test/section.html").toString("utf-8");
    const html = parse(input, { blockTextElements: { code: true } });
    rewriteCodeBlocks(html);
    const contentElement = html.querySelector(".content");
    const macroElements = html.getElementsByTagName("ac:structured-macro");
    const textElements = html.getElementsByTagName("ac:plain-text-body");
    const parameterElements = html.getElementsByTagName("ac:parameter");
    expect(contentElement).not.toBeNull();
    expect(contentElement?.tagName.toLowerCase()).toStrictEqual("div");
    expect(macroElements.length).toStrictEqual(1);
    expect(textElements.length).toStrictEqual(1);
    expect(textElements[0].parentNode.tagName.toLowerCase()).toStrictEqual(
      "ac:structured-macro",
    );
    expect(parameterElements.length).toStrictEqual(1);
    expect(parameterElements[0].textContent).toStrictEqual("bash");
  });
});

import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import parse from "node-html-parser";
import rewriteCodeBlocks from "../../lib/transformer/CodeBlockTransformer";
import rewriteCDATASections from "../../lib/transformer/CdataTransformer";

describe("CodeBlockTransformer", () => {
  it("should transform code blocks", () => {
    const input = readFileSync("test/section.html").toString("utf-8");
    const html = parse(input, { blockTextElements: { code: true } });
    const { content } = rewriteCodeBlocks(html);
    const contentElement = content.querySelector(".content");
    const macroElements = content.getElementsByTagName("ac:structured-macro");
    const textElements = content.getElementsByTagName("ac:plain-text-body");
    const parameterElements = content.getElementsByTagName("ac:parameter");
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

  it("should transform code blocks but keep source code format", () => {
    const expected = `<div class="sect2"><h2 id="_business_context"><a class="anchor" href="#_business_context"></a>Business Context</h2><div class="sectionbody"><div class="listingblock"><div class="content"><ac:structured-macro ac:name="code"><ac:parameter ac:name="language">xml</ac:parameter><ac:plain-text-body><cdata-placeholder> < ?xml version="1.0" encoding="UTF-8"?>
< Personne>
< champ1>
< champ2>something cool< /champ2>
< /champ1>
< /Personne></cdata-placeholder></ac:plain-text-body></ac:structured-macro></div></div></div></div>`;
    const input = readFileSync("test/section_xml.html").toString("utf-8");
    const html = parse(input, { blockTextElements: { code: true } });
    const transformedContent = rewriteCodeBlocks(html).content;
    const { content: convertedContent } =
      rewriteCDATASections(transformedContent);
    expect(convertedContent.toString()).toStrictEqual(expected);
  });
});

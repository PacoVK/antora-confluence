import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "fs";
import parse from "node-html-parser";
import { convertHtmlToConfluence } from "../../lib/service/HtmlToConfluenceConverter";

describe("HtmlToConfluenceConverter", () => {
  it("should convert html to confluence format", () => {
    const expected = readFileSync("test/full_page_converted.html").toString(
      "utf-8",
    );
    const fixture = readFileSync("test/full_page.html").toString("utf-8");
    const dom = parse(fixture, {
      blockTextElements: { code: true },
      voidTag: {
        closingSlash: true,
      },
    });
    const input = dom.querySelector("article.doc")!;
    const { content } = convertHtmlToConfluence(
      input,
      "https://www.example.com",
      {},
      {},
    );
    expect(content.toString()).toStrictEqual(expected);
  });
});

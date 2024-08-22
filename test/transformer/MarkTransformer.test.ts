import { describe, it, expect } from "@jest/globals";
import parse from "node-html-parser";
import rewriteMarks from "../../lib/transformer/MarkTransformer";

describe("MarkTransformer", () => {
  it("should transform marks", () => {
    const input = `<mark>test</mark>`;
    const html = parse(input);
    rewriteMarks(html);
    const expected = `<span style="background:#ff0;color:#000">test</span>`;
    expect(html.toString()).toStrictEqual(expected);
  });
});

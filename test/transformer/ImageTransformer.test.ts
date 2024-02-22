import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import parse from "node-html-parser";
import rewriteImages from "../../lib/transformer/ImageTransformer";

describe("CodeBlockTransformer", () => {
  it("should transform code blocks", () => {
    const input = readFileSync("test/section_with_image.html").toString(
      "utf-8",
    );

    const html = parse(input);
    rewriteImages(html, "foo/bar");
    const expected = readFileSync(
      "test/section_with_image_transformed.html",
    ).toString("utf-8");
    expect(html.toString()).toStrictEqual(expected);
  });
});

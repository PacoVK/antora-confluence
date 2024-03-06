import { describe, expect, it } from "@jest/globals";
import { fileIsExcluded } from "../../lib/service/FileExclusionService";

describe("FileExclusionService", () => {
  it("should exclude files", () => {
    const excludedFiles = ["*.xml", "bar/*/foo/*", "**/foo.html"];
    const inputFiles = [
      "ab/c/d/hello.html",
      "bar/late/foo/bar.html",
      "bar/late/hell/uha.html",
    ];
    expect(fileIsExcluded(inputFiles[0], excludedFiles)).toBe(false);
    expect(fileIsExcluded(inputFiles[1], excludedFiles)).toBe(true);
    expect(fileIsExcluded(inputFiles[2], excludedFiles)).toBe(false);
  });
});

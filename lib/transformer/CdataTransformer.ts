import parse, { HTMLElement } from "node-html-parser";
import { Placeholder } from "../constants/Enum";
import { ITransformerOutput } from "../types";

const rewriteCDATASections = (content: HTMLElement): ITransformerOutput => {
  let contentString = content.removeWhitespace().toString();
  let cdataStart = contentString.indexOf(Placeholder.CDATA_PLACEHOLDER_START);
  while (cdataStart > -1) {
    const cdataEnd = contentString.indexOf(
      Placeholder.CDATA_PLACEHOLDER_END,
      cdataStart,
    );
    if (cdataEnd > -1) {
      const prefix =
        contentString.substring(0, cdataStart) +
        Placeholder.CDATA_PLACEHOLDER_START;
      const suffix = contentString.substring(cdataEnd);
      const unescaped = contentString
        .substring(
          cdataStart + Placeholder.CDATA_PLACEHOLDER_START.length,
          cdataEnd,
        )
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&");
      contentString = prefix + unescaped + suffix;
    }
    cdataStart = contentString.indexOf(
      Placeholder.CDATA_PLACEHOLDER_START,
      cdataStart + 1,
    );
  }
  return {
    content: parse(contentString, { blockTextElements: { code: true } }),
  };
};

export default rewriteCDATASections;

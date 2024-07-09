import { HTMLElement } from "node-html-parser";
import Path from "path";
import { AttachmentRepresentation, ITransformerOutput } from "../types";
import { getLogger } from "../Logger";

interface ImageTransformerOutput extends ITransformerOutput {
  uploads: AttachmentRepresentation[];
}

const LOGGER = getLogger();

const rewriteImages = (
  content: HTMLElement,
  baseUrl: string,
): ImageTransformerOutput => {
  const uploads: AttachmentRepresentation[] = [];
  content.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    const imgWidth = img.getAttribute("width") || 500;
    const imgAlign = img.getAttribute("align") || "center";
    if (!src?.startsWith("http")) {
      const sanitizedBaseUrl = baseUrl
        .toString()
        .replaceAll("\\\\", "/")
        .replaceAll("/[^/]*$", "/");
      let newUrl;
      let fileName;
      if (src?.startsWith("data:image")) {
        LOGGER.warn("Embedded images, not yet implemented. Skipping...");
      } else {
        newUrl = Path.join(sanitizedBaseUrl, src!);
        fileName = decodeURI((src?.split("/").pop() || "").split("?")[0]);
        newUrl = decodeURI(newUrl);
        uploads.push({
          fileName,
          filePath: newUrl,
          comment: "automatically uploaded",
        });
        img.insertAdjacentHTML(
          "afterend",
          `<ac:image ac:align="${imgAlign}" ac:width="${imgWidth}"><ri:attachment ri:filename="${fileName}"/></ac:image>`,
        );
      }
    } else {
      // it is an online image, so we have to use the ri:url tag
      img.insertAdjacentHTML(
        "afterend",
        `<ac:image ac:align="${imgAlign}" ac:width="${imgWidth}"><ri:url ri:value="${src}"/></ac:image>`,
      );
    }
    img.remove();
  });
  return {
    uploads,
    content,
  };
};

export default rewriteImages;

import parse, { HTMLElement } from "node-html-parser";
import { Placeholder } from "../constants/Enum";
import path from "node:path";
import { readFileSync } from "fs";
import { getLogger } from "../Logger";

const LOGGER = getLogger();

enum LinkTags {
  dt = "th",
  dd = "td",
}
const rewriteDescriptionLists = (content: HTMLElement) => {
  content.querySelectorAll("dl").forEach((dl) => {
    dl.querySelectorAll("div").forEach((div) => {
      const child = div.firstChild;
      div.replaceWith(child!);
    });
    const rows = [];
    let current = { dt: [], dd: [] };
    rows.push(current);
    dl.querySelectorAll("dt, dd").forEach((child) => {
      const tagName = child.tagName.toLowerCase();
      if (tagName == "dt" && current.dd.length > 0) {
        current = { dt: [], dd: [] };
        rows.push(current);
      }
      //@ts-ignore
      current[tagName].push(child);
      child.remove();
    });
    rows.forEach((row) => {
      const sizes = { dt: row.dt.length, dd: row.dd.length };
      const rowspanIdx = { dt: -1, dd: sizes.dd - 1 };
      const rowspan = Math.abs(sizes.dt - sizes.dd) + 1;
      let max = sizes.dt;
      if (sizes.dt < sizes.dd) {
        max = sizes.dd;
        rowspanIdx.dt = sizes.dt - 1;
        rowspanIdx.dd = -1;
      }
      for (let idx = 0; idx < max; idx++) {
        const tr = dl.insertAdjacentHTML("afterend", "<tr></tr>");
        const types = ["dt", "dd"];
        types.forEach((type) => {
          //@ts-ignore
          if (sizes[type] > idx) {
            //@ts-ignore
            tr.appendChild(row[type][idx]);
            //@ts-ignore
            if (idx == rowspanIdx[type] && rowspan > 1) {
              //@ts-ignore
              row[type][idx].setAttribute("rowspan", rowspan);
            }
          } else if (idx == 0) {
            tr.insertAdjacentHTML(
              "afterend",
              //@ts-ignore
              `<${LinkTags[type]} rowspan="${rowspan}"></${LinkTags[type]}>`,
            );
          }
        });
      }
    });
    const node = dl.firstChild;
    dl.replaceWith("<table></table>").appendChild(node!);
  });
};

const rewriteInternalLinks = (
  content: HTMLElement,
  anchors: Map<string, string>,
  baseUrl: string,
) => {
  content.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    let pageTitle;
    let anchor;
    if (href) {
      if (href.startsWith("#")) {
        anchor = href.substring(1);
        pageTitle = `${anchors.get(anchor)}`;
      } else if (
        !href.startsWith("http") &&
        !href.startsWith("//") &&
        !href.startsWith("mailto")
      ) {
        try {
          const pageContent = parse(
            readFileSync(path.join(path.dirname(baseUrl), href)).toString(
              "utf-8",
            ),
          );
          let pageTitleElement = pageContent.querySelector("h1.page");
          if (pageTitleElement) {
            pageTitle = pageTitleElement.text;
          } else {
            pageTitleElement = pageContent.querySelector("h2");
            if (pageTitleElement) {
              pageTitle = pageTitleElement.text;
            }
          }
          pageTitle = `${pageTitle?.trim()}`;
        } catch (e) {
          LOGGER.error(
            `Error reading file ${path.join(path.dirname(baseUrl), href)}`,
          );
        }
      }
      if (pageTitle && a.text) {
        const linkMacro =
          parse(`<ac:link ${anchor ? 'ac:anchor="' + anchor + '"' : ""}>
                                <ri:page ri:content-title="${pageTitle}"/>
                                <ac:plain-text-link-body>${Placeholder.CDATA_PLACEHOLDER_START}
                                    ${a.text}
                                ${Placeholder.CDATA_PLACEHOLDER_END}</ac:plain-text-link-body>
                            </ac:link>`);
        a.replaceWith(linkMacro);
      }
    }
  });
};

export { rewriteDescriptionLists, rewriteInternalLinks };

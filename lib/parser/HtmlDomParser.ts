import parse from "node-html-parser";
import { getLogger } from "../Logger";

const LOGGER = getLogger();
export const getPageTitle = (input: string) => {
  let pageTitle;
  try {
    const dom = parse(input);
    let pageTitleElement = dom.querySelector("h1.page");
    if (pageTitleElement) {
      pageTitle = pageTitleElement.text;
    } else {
      pageTitleElement = dom.querySelector("h1");
      LOGGER.debug(
        `Could not extract a title, looking for any <h1> - ${pageTitleElement?.text}`,
      );
      if (pageTitleElement) {
        pageTitle = pageTitleElement.text;
      } else {
        pageTitleElement = dom.querySelector("h2");
        LOGGER.debug(
          `Could not extract a title, looking for any <h2> ${pageTitleElement?.text}`,
        );
        if (pageTitleElement) {
          pageTitle = pageTitleElement.text;
        }
      }
    }
    pageTitle = pageTitle?.trim();
  } catch (e) {
    LOGGER.error(`Error reading input ${input}`);
  }
  return pageTitle;
};

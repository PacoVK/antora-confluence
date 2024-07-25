import parse, { HTMLElement } from "node-html-parser";
import { Placeholder } from "../constants/Enum";
import { ITransformerOutput } from "../types";

const rewriteCodeBlocks = (content: HTMLElement): ITransformerOutput => {
  content.querySelectorAll("pre > code").forEach((code) => {
    const parent = code.parentNode;
    const language = code.getAttribute("data-lang");
    const codeMacro = parse(`<ac:structured-macro ac:name="code">
              <ac:parameter ac:name="language">${language}</ac:parameter>
              <ac:plain-text-body>
                  ${Placeholder.CDATA_PLACEHOLDER_START}
                    ${code.rawText}
                  ${Placeholder.CDATA_PLACEHOLDER_END}
              </ac:plain-text-body>
            </ac:structured-macro>`);
    parent.replaceWith(codeMacro);
  });
  return {
    content,
  };
};

export default rewriteCodeBlocks;

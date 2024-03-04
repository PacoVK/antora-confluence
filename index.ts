import { ANTORA_DEFAULTS } from "./lib/constants/Enum";
import { ConfluenceClientV1 } from "./lib/client/ConfluenceClientV1";
import { ConfluenceClient } from "./lib/client/ConfluenceClient";
import {
  buildPageStructure,
  publish,
  deletePages,
} from "./lib/service/PageService";
import { BufferFile } from "vinyl";
import { getLogger } from "./lib/Logger";
import {
  createState,
  initializeState,
  updateState,
} from "./lib/service/StateService";

let confluenceClient: ConfluenceClient;
let outPutDir: string;

const LOGGER = getLogger();

const publishToConfluence = async (
  destConfig: any,
  files: BufferFile[],
  playbook: any,
) => {
  LOGGER.info(`Publishing ${playbook.site.title} to Confluence`);
  outPutDir = playbook.output.dir || ANTORA_DEFAULTS.OUTPUT_DIR;
  confluenceClient = new ConfluenceClientV1({
    editorVersion: destConfig.editorVersion || "v1",
    baseUrl: new URL(destConfig.confluenceApi),
    spaceKey: destConfig.confluenceSpace,
    ancestorId: destConfig.ancestorId,
  });
  await confluenceClient.init();
  const pageStructure = new Map();
  pageStructure.set("inventory", new Map());
  pageStructure.set("flat", []);
  let renames: any[] = [];
  let state = await initializeState(confluenceClient);
  if (state) {
    const stateIds = Object.values(JSON.parse(state.value)).map(
      //@ts-ignore
      (entry) => entry.id,
    );
    await buildPageStructure(files, pageStructure, destConfig.filter);
    const removalIds = stateIds.filter((id) => {
      //@ts-ignore
      return !pageStructure.get("flat").find((item2) => item2.id === id);
    });
    const removals = Object.values(JSON.parse(state.value)).filter(
      (stateObject) => {
        //@ts-ignore
        return removalIds.includes(stateObject.id);
      },
    );
    if (removals.length > 0) {
      LOGGER.info("Removing untracked pages");
      await deletePages(confluenceClient, removals);
    }

    Object.values(JSON.parse(state.value)).forEach((statePage) => {
      const rename = pageStructure.get("flat").find(
        //@ts-ignore
        (item2) =>
          //@ts-ignore
          item2.id === statePage.id &&
          //@ts-ignore
          item2.pageTitle !== statePage.pageTitle,
      );
      if (rename) {
        renames.push({
          newOne: rename,
          oldOne: statePage,
        });
      }
    });

    LOGGER.debug(
      `Found pages that need to be renamed ${JSON.stringify(renames)}`,
    );

    await updateState(confluenceClient, {
      ...state,
      value: JSON.stringify(Object.fromEntries(pageStructure.get("inventory"))),
    });
  } else {
    await createState(
      confluenceClient,
      JSON.stringify(Object.fromEntries(pageStructure.get("inventory"))),
    );
  }

  LOGGER.info("Publishing pages");
  await publish(
    confluenceClient,
    outPutDir,
    pageStructure,
    renames,
    destConfig.showBanner || false,
  );
  return {};
};

module.exports = publishToConfluence;

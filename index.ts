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
import { CaptainConfig, PageRepresentation } from "./lib/types";

let confluenceClient: ConfluenceClient;
let outPutDir: string;

const LOGGER = getLogger();

const publishToConfluence = async (
  destConfig: CaptainConfig,
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
  const renames: any[] = [];
  const state = await initializeState(confluenceClient);
  if (state) {
    const stateValues: PageRepresentation[] = Object.values(
      JSON.parse(state.value),
    );
    const stateIds = stateValues.map((entry) => entry.id);
    await buildPageStructure(
      files,
      pageStructure,
      destConfig.mapper,
      destConfig.filter,
    );
    const removalIds = stateIds.filter((id) => {
      return !pageStructure
        .get("flat")
        .find((page: PageRepresentation) => page.id === id);
    });
    const removals = stateValues.filter((stateObject) => {
      return removalIds.includes(stateObject.id);
    });
    if (removals.length > 0) {
      LOGGER.info("Removing untracked pages");
      await deletePages(confluenceClient, removals);
    }

    stateValues.forEach((statePage) => {
      const rename = pageStructure
        .get("flat")
        .find(
          (page: PageRepresentation) =>
            page.id === statePage.id && page.pageTitle !== statePage.pageTitle,
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

    LOGGER.info("Publishing pages");
    await publish(
      confluenceClient,
      outPutDir,
      pageStructure,
      renames,
      destConfig.showBanner || false,
    );

    LOGGER.info("Writing state to Confluence");

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

  return {};
};

module.exports = publishToConfluence;

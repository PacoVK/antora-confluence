import { ANTORA_DEFAULTS } from "./lib/constants/Enum";
import { ConfluenceClientV1 } from "./lib/client/ConfluenceClientV1";
import { ConfluenceClient } from "./lib/client/ConfluenceClient";
import {
  buildPageStructure,
  deletePages,
  getPagesToBeRemoved,
  getRenamedPages,
  publish,
} from "./lib/service/PageService";
import { BufferFile } from "vinyl";
import { getLogger } from "./lib/Logger";
import {
  createState,
  initializeState,
  updateState,
} from "./lib/service/StateService";
import { AntoraPlaybook, CaptainConfig, PageRepresentation } from "./lib/types";

let confluenceClient: ConfluenceClient;
let outPutDir: string;

const LOGGER = getLogger();

const publishToConfluence = async (
  destConfig: CaptainConfig,
  files: BufferFile[],
  playbook: AntoraPlaybook,
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

  const state = await initializeState(confluenceClient);
  if (state) {
    const stateValues: PageRepresentation[] = Object.values(
      JSON.parse(state.value),
    );
    await buildPageStructure(
      files,
      pageStructure,
      destConfig.mapper,
      destConfig.filter,
    );

    const removals = getPagesToBeRemoved(stateValues, pageStructure);
    if (removals.length > 0) {
      LOGGER.info("Removing untracked pages");
      await deletePages(confluenceClient, removals);
    }

    const renames = getRenamedPages(stateValues, pageStructure);

    LOGGER.info("Publishing pages");
    await publish(
      confluenceClient,
      outPutDir,
      pageStructure,
      destConfig.showBanner || false,
      renames,
    );

    LOGGER.info("Writing state to Confluence");

    await updateState(confluenceClient, {
      ...state,
      value: JSON.stringify(Object.fromEntries(pageStructure.get("inventory"))),
    });
  } else {
    await buildPageStructure(
      files,
      pageStructure,
      destConfig.mapper,
      destConfig.filter,
    );

    LOGGER.info("Publishing pages");

    await publish(
      confluenceClient,
      outPutDir,
      pageStructure,
      destConfig.showBanner || false,
    );

    await createState(
      confluenceClient,
      JSON.stringify(Object.fromEntries(pageStructure.get("inventory"))),
    );
  }

  return {};
};

module.exports = publishToConfluence;

import { ANTORA_DEFAULTS } from "./lib/constants/Enum";
import { ConfluenceClientV1 } from "./lib/client/ConfluenceClientV1";
import { ConfluenceClient } from "./lib/client/ConfluenceClient";
import { buildPageStructure, publish } from "./lib/service/PageService";
import { BufferFile } from "vinyl";
import { getLogger } from "./lib/Logger";

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
  });
  await confluenceClient.init();
  const pageStructure = new Map();
  pageStructure.set("inventory", new Map());
  await buildPageStructure(files, pageStructure, destConfig.filter);
  await publish(confluenceClient, outPutDir, pageStructure);
  return {};
};

module.exports = publishToConfluence;

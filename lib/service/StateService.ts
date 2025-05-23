import { ConfluenceClient } from "../client/ConfluenceClient";
import { ConfluencePageStatus } from "../types";
import { sendRequest } from "./RESTApiService";
import parse from "node-html-parser";
import { deflateSync, inflateSync } from "node:zlib";
import { getLogger } from "../Logger";

const LOGGER = getLogger();

const decodeState = (state: string) => {
  LOGGER.debug(`Decoding ${state}`);
  return inflateSync(Buffer.from(state, "base64")).toString("utf-8");
};

const encodeState = (state: string) => {
  LOGGER.debug(`Encoding ${state}`);
  const compressed = deflateSync(Buffer.from(state));
  return compressed.toString("base64");
};

const initializeState = async (confluenceClient: ConfluenceClient) => {
  LOGGER.info(`Initializing state (${confluenceClient.CAPTAIN_NAME})`);
  const response = await sendRequest(
    confluenceClient.fetchPageIdByName(
      confluenceClient.CAPTAIN_NAME,
      ConfluencePageStatus.DRAFT,
    ),
  );
  if (response.results && response.results.length > 0) {
    LOGGER.info(`Decoding Confluence state (${confluenceClient.CAPTAIN_NAME})`);
    const state = parse(response.results[0].body.storage.value).querySelector(
      "p",
    )?.textContent;
    if (state) {
      return {
        id: response.results[0].id,
        value: decodeState(state),
        version: response.results[0].version.number,
      };
    } else {
      throw Error("Corrupt State page");
    }
  }
  return;
};

const createState = async (
  confluenceClient: ConfluenceClient,
  inventory: any,
) => {
  LOGGER.info(`Creating Confluence state (${confluenceClient.CAPTAIN_NAME})`);
  const state = encodeState(inventory);
  const updateResponse = await sendRequest(
    confluenceClient.createPage(
      {
        title: confluenceClient.CAPTAIN_NAME,
        content: `<p>${state}</p>`,
      },
      ConfluencePageStatus.DRAFT,
    ),
  );
  return {
    id: updateResponse.id,
    value: decodeState(state),
    version: updateResponse.version?.number ?? 1,
  };
};

const updateState = async (confluenceClient: ConfluenceClient, state: any) => {
  LOGGER.info(`Updating state (${confluenceClient.CAPTAIN_NAME})`);
  LOGGER.debug(`${state.value}`);
  await sendRequest(
    confluenceClient.updatePage(
      {
        title: confluenceClient.CAPTAIN_NAME,
        content: `<p>${encodeState(state.value)}</p>`,
      },
      state.id,
      state.version,
      ConfluencePageStatus.DRAFT,
    ),
  );
};

export { initializeState, createState, updateState };

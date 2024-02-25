import { getLogger } from "../Logger";

const LOGGER = getLogger();

const sendRequest = async (call: Promise<Response>) => {
  try {
    const response = await call;
    if (response.status === 404) {
      return { results: [] };
    }
    if (response.status > 299) {
      LOGGER.warn(`Publish failed with response ${response.status}`);
      LOGGER.warn(await response.text());
    }
    return await response.json();
  } catch (error) {
    LOGGER.error(error);
  }
};

export { sendRequest };

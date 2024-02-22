import { createLogger, format, Logger, transports } from "winston";

let LOGGER: Logger;

const init = () => {
  LOGGER = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.cli({
      level: true,
    }),
    transports: [new transports.Console({ format: format.simple() })],
  });
  return LOGGER;
};

const getLogger = () => {
  return LOGGER || init();
};

export { getLogger };

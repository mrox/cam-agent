import { config, rootPath } from "../config.js";
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import fs from "fs";
import { dumper } from "dumper";

const logDir = `${rootPath}/log`;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const log = new transports.Console({
  level: "info",
  silent: !config.logs_screen,
  format: format.combine(
    format.colorize(),
    format.printf(
      info =>
        `[${info.timestamp}] [${info.level}]: ${
        typeof info.message === "string" ||
          typeof info.message === "number"
          ? info.message
          : JSON.stringify(info.message, null, 4)
        }`
    )
  )
})


const logger = createLogger({
  level: "debug",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    format.printf(
      info =>
        `[${info.timestamp}] [${info.level}]: ${
        process.env.NODE_ENV === "development" && info.level === "debug"
          ? dumper(info.message)
          : info.message
        }`
    )
  ),
  transports: config.logsfile
    ? [
      log,
      new transports.DailyRotateFile({
        filename: `${logDir}/%DATE%.log`,
        // formatter: m => JSON.stringify(m),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d"
      })
    ]
    : [log]
});
// logger.debug('Debugging info');
// logger.verbose('Verbose info');
// logger.info('Hello world');
// logger.warn('Warning message');
// logger.error('Error info');
export default logger;

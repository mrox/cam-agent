import logger from "./utils/logger";
import app from './controllers';

logger.info(`App running in ${process.env.NODE_ENV} mode`);

app();

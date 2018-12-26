import { rootPath } from '../config';
import logger from '../utils/logger';
import configApp from '../config';
import { isArray } from 'lodash';
import { asyncForEach } from '../utils/method-helpers';

const tls = require('tls')
const fs = require('fs')
const pkg = require('../../package.json')

const sslOption = {
    key: fs.readFileSync(rootPath + '/ssl/client.key'),
    cert: fs.readFileSync(rootPath + '/ssl/client.crt'),
    ca: fs.readFileSync(rootPath + '/ssl/ca.crt')
}

class LogTCP {
    constructor(mac, config) {
        this.isConnected = false;
        this.tcp = tls.connect(config.port, config.host, sslOption, () => {
            logger.info('TCP has connected!')
            this.isConnected = true;
        })

        this.tcp.on('error', (error) => {
            logger.error('TCP has error!', error)
            this.isConnected = false
        })

        this.logObject = {
            '@version': `${pkg.name}@^${pkg.version}`,
            type: 'MONITOR_RESOURCE_NVR',
            '@appId': `${pkg.name}@^${pkg.version}`,
            // '@appId': 'Monitor@^1.0.3',
            '@node': mac,
            '@enginee': 'Nodejs'
        }
        const fileName = 'logs.tmp.json';
        this.filePath = `${configApp.logs_kibana_dir}/${fileName}`;
        this.isExistDir = !!configApp.logs_kibana_dir && fs.existsSync(configApp.logs_kibana_dir);
    }


    getLogsLocal() {
        var logs = []
        if (this.isExistDir && fs.existsSync(this.filePath)) {
            try {
                const logsFile = JSON.parse(fs.readFileSync(this.filePath, "utf8"))
                if (isArray(logsFile)) logs = logsFile
            } catch (error) {
                logger.error(`Read file ${this.filePath} Error ${error.message}`);
                logs = [];
            }
        }
        return logs
    }

    async log(obj, level) {
        obj.level = level
        obj['@timestamp'] = (new Date()).toISOString();
        obj = JSON.stringify(Object.assign(obj, this.logObject));
        const logsLocal = this.getLogsLocal()
        const logs = [...logsLocal, obj]
        var unSent = []
        if (this.isConnected) {
            if (logs.length > 1) logger.info(`There are ${logs.length} logs haven't been sent yet! start send to logs server`)
            await asyncForEach(logs, async (log, i) => {
                try {
                    const mess = await new Promise((resolve, reject) => {
                        this.tcp.write(log + '\n', (err) => {
                            if (err) reject(`CANNOT SEND LOG TCP: ${err}`)
                            else resolve('SEND TO LOGS SERVER DONE')
                        })
                    })
                    if (mess) {
                        logger.info(mess)
                    }
                } catch (error) {
                    unSent.push(log)
                    logger.error(error)
                }
            })
        } else {
            unSent = logs
        }

        if (this.isExistDir)
            try {
                fs.writeFileSync(this.filePath, JSON.stringify(unSent), 'utf-8');
                if(unSent.length > 0) logger.info(`Write log to file ${this.filePath} Success`);
            } catch (error) {
                logger.error(`Cannot write file ${this.filePath} Error ${error.message}`);
            }
    }
}

export default LogTCP
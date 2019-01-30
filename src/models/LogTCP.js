import { rootPath } from '../config';
import logger from '../utils/logger';

const tls = require('tls')
const fs = require('fs')
const pkg = require('../../package.json')

const sslOption = {
    key: fs.readFileSync(rootPath + '/ssl/client.key'),
    cert: fs.readFileSync(rootPath + '/ssl/client.crt'),
    ca: fs.readFileSync(rootPath + '/ssl/ca.crt')
}

class LogTCP {
    constructor(config) {
        this.isConnected = false;
        this.config = config;
        this.connect();

        this.logObject = {
            '@version': `${pkg.name}@^${pkg.version}`,
            '@appId': `${pkg.name}@^${pkg.version}`,
            '@engine': 'Nodejs'
        }
    }

    connect() {
        this.tcp = tls.connect(this.config.port, this.config.host, sslOption, () => {
            this.isConnected = true;
            logger.info('TCP has connected!')
        })

        this.tcp.on('error', (error) => {
            this.isConnected = false
            logger.error('TCP has error!', error)
        })
    }

    async sendlog(obj) {
        if (!this.isConnected) this.connect();

        obj['@timestamp'] = (new Date()).toISOString();
        obj = JSON.stringify(Object.assign(obj, this.logObject));

        try {
            const isDone = await new Promise((resolve) => {
                this.tcp.write(obj + '\n', () => {
                    resolve(true)
                })
            })
            return isDone
            
        } catch (error) {
            logger.error(error)
            return false
        }
    }
}

export default LogTCP
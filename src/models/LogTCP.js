import {rootPath} from '../config';
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
    constructor(mac, config) {
        this.isConnected = false;
        this.tcp = tls.connect(config.port, config.host, sslOption,  () =>  {
            logger.info('TCP has connected!')
            this.isConnected = true;
        })

        this.tcp.on('error',  (error) =>  {
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
    }

    log(obj, level) {
        if(!this.isConnected) return;
        obj.level = level
        obj['@timestamp'] = (new Date()).toISOString(),
        obj = Object.assign(obj, this.logObject);
        this.tcp.write(JSON.stringify(obj) + '\n', (err) => {
            if (err) logger.error(`CANNOT SEND LOG TCP: ${err}`)
            else logger.info('SEND TO LOGS SERVER DONE')
        })
    }

}

export default LogTCP
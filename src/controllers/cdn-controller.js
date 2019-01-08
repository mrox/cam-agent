import config from '../config';
import fs from 'fs';
import { getCdnController } from '../api/cms-api';
import { exec } from 'child_process';
import logger from '../utils/logger';

class CdnControler {
    constructor(nvr) {
        this.nvr = nvr;
        this.check();
        setInterval(this.check.bind(this), config.interval_check.cdn)    
    }

    async check() {
        var cdnPath;
        try {
            cdnPath = this.nvr.getNamCdnPath();
        } catch (error) {
            logger.error(error.message);
            return;    
        }

        logger.info("CHECK NAMCDN local.json")
        var local;
        const path = `${cdnPath}/config/local.json`;
        try {
            local = fs.readFileSync(path, 'utf-8');
            local = local ? JSON.stringify(JSON.parse(local)) : "";
        } catch (error) {
            logger.error(`ERROR: ${error.message}`);
            // process.exit(1)
            return;
        }

        var server = await getCdnController(this.nvr.macAddress);
        if (server) server = JSON.stringify(server);
        else return;

        if (server !== local) {
            try {
                fs.writeFileSync(path, server, 'utf-8')
                logger.info(`Updated ${path}`)
                const rs = await this.killNamCdn(cdnPath)
                if (rs.success) logger.info("KILLED NAMCDN")
                else logger.error("CANNOT KILL NAMCDN")
            } catch (error) {
                logger.error(error.message);
            }
        }
    }

    async killNamCdn(cdnPath) {
        const pid = await new Promise((resolve, reject) => {
            exec(`ps aux | grep -v grep  | grep -i "${cdnPath}/obfuscate/app.js" | head -1 | awk '{ print $2 }'`, (err, result) => {
                if (err) reject(err)
                resolve(Number(result.replace('\n', '')))
            })
        })

        if (pid && pid !== 0) {
            return await new Promise((resolve, reject) => {
                exec(`sudo kill -9 ${pid}`, (err) => {
                    if (err) reject({ success: false, err })
                    resolve({ success: true })
                })
            })
        }
        return ({ success: false, err: "Can't find pid" })
    }
}

export default CdnControler;
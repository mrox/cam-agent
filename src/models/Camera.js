import logger from '../utils/logger';
import { Cam } from 'onvif'

class Camera extends Cam {
    constructor(data) {
        super({ hostname: data.hostname, port: 2000 });
        Object.assign(this, data)
    }

    isOnline() {
        return !!this.hostname && !!this.chanel;
    }

    updateInfo(data) {
        Object.assign(this, data)
    }

    setHostname(hostname) {
        this.hostname = hostname;
    }

    async checkSyncTime() {
        var camTime;
        try {
            camTime = await new Promise((resolve, reject) => this.getSystemDateAndTime((err, dateTime) => {
                if (err) reject(err)
                resolve(dateTime)
            }))
        } catch (error) {
            logger.error(`GET TIME OF CAMERA ${this.hostname} FAILED, ERROR: ${error}`)
            return;
        }

        const nvrTime = new Date();
        const localOffset = nvrTime.getTimezoneOffset() * 60000

        if (Math.abs(camTime.getTime() - nvrTime.getTime() + localOffset) > 15000) {
            try {
                const dateTime = new Date(nvrTime.getTime() - localOffset)
                await new Promise((resolve, reject) => this.setSystemDateAndTime({
                    dateTime,
                    timezone: `GMT+00:00`,
                    dateTimeType: "Manual"
                }, (err, dateTime) => {
                    if (err) reject(err)
                    resolve(dateTime)
                }))
                logger.info(`UPDATE TIME OF CAMERA ${this.hostname} SUCCESS, NEW TIME ${dateTime.toISOString()}`)
            } catch (error) {
                logger.error(`SET TIME OF CAMERA ${this.hostname} FAILED, ERROR: ${error.message}`)
            }
        }
    }
}

export default Camera;
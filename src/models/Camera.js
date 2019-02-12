import logger from '../utils/logger';
import { Cam } from 'onvif'
import pick from 'lodash/pick'
import { callbackToPromise } from '../utils/method-helpers';
import ping from 'ping'

class Camera extends Cam {
    constructor(data) {
        super(data);
        this.updateInfo(data)
    }

    updateInfo(data) {
        Object.assign(this, data)
    }

    async isOnline() {
        const isAlive = await ping.promise.probe(this.hostname).then(rs => rs.alive)
        if(!isAlive) return false
        return await new Promise((resolve) => this.connect((err) => {
            if(err) {
                resolve(false)
            }
            else resolve(true)
        })) 
    }

    async getInfo() {
        const isOnline = await this.isOnline();
        if(!isOnline) return null

        const info = {
            hostname: this.hostname,
            port: this.port,
            path: this.path,
            mac: this.mac
        }
        try {
            const videoEncoderConfigurations = await callbackToPromise(this.getVideoEncoderConfigurations.bind(this))
            info.videoEncoderConfigurations = videoEncoderConfigurations.map(config => pick(config,['encoding', 'resolution', 'quality', 'rateControl','H264']))
        } catch (error) {
            logger.error(error.message)
        }

        try {
            var deviceInformation = await callbackToPromise(this.getDeviceInformation.bind(this))
            info.deviceInformation = deviceInformation
        } catch (error) {
            logger.error('getDeviceInformation: ' + error.message)
        }

        return info
    }

    async checkSyncTime() {
        var camTime;
        try {
            camTime = await callbackToPromise(this.getSystemDateAndTime.bind(this))
        } catch (error) {
            logger.error(`GET TIME OF CAMERA ${this.hostname} FAILED, ERROR: ${error}`)
            return;
        }

        const nvrTime = new Date();
        const localOffset = nvrTime.getTimezoneOffset() * 60000

        if (Math.abs(camTime.getTime() - nvrTime.getTime() + localOffset) > 15000) {
            try {
                const dateTime = new Date(nvrTime.getTime() - localOffset)
                await callbackToPromise(this.setSystemDateAndTime.bind(this), {
                    dateTime,
                    timezone: `GMT+00:00`,
                    dateTimeType: "Manual"
                })
                logger.info(`UPDATE TIME OF CAMERA ${this.hostname} SUCCESS, NEW TIME ${dateTime.toISOString()}`)
            } catch (error) {
                logger.error(`SET TIME OF CAMERA ${this.hostname} FAILED, ERROR: ${error.message}`)
            }
        }
    }
}

export default Camera;
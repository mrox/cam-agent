
import CamAgent from 'cam-agent';
import logger from '../utils/logger';
import { Cam } from 'onvif'
class Camera extends CamAgent {
    constructor(data) {
        super(data.ip);
        Object.assign(this, data)
    }

    isOnline() {
        return !!this.ip && !!this.chanel;
    }

    updateInfo(data) {
        Object.assign(this, data)
    }

    setIp(ip) {
        this.ip = ip;
        this.apiUrl = `http://${ip}`;
    }

    async checkSyncTime() {
        const nvrTime = new Date();

        if (this.isPtz) {
            const cam = new Cam({
                hostname: this.ip, 
                username: this.username, 
                password: this.password,
                port: 2000
            })
            
            cam.getSystemDateAndTime((err, dateTime) => {
                if(err) logger.error(`CANNOT GET TIME CAMERA PTZ ${this.ip}, ${err}`)
                else {
                    var time = new Date(dateTime);
                    if (Math.abs(nvrTime.getTime() - time.getTime()) > 15000) {
                        cam.setSystemDateAndTime({
                            dateTime: new Date(),
                            dateTimeType: "Manual"
                        }, (err, date) => {
                            if(err)logger.error(`CANNOT SET TIME CAMERA PTZ ${this.ip}, ${err}`)
                            else logger.info(`SET TIME CAMERA PTZ ${this.ip} : ${date} SUCCESS`)
                        })
                    }
                }
            })
        } else {
            try {
                const { systemdate, systemtime } = await this.getSysTime();
                const time = new Date(`${systemdate} ${systemtime}`);
                if (Math.abs(nvrTime.getTime() - time.getTime()) > 15000) {
                    const { systemdate, systemtime } = await this.setSysTime();
                    logger.info(`Updated TIME in camera: ${this.ip} - New date time: ${systemdate} ${systemtime}`)
                }
            } catch (error) {
                logger.error(`CHECK TIME CAMERA IP:${this.ip} MAC:${this.mac} - ${error}`)
            }

        }
    }
}

export default Camera;
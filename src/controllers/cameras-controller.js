import { updateCameraIp, updateOnlineStatusCamera } from '../api/cms-api';
import { asyncForEach } from '../utils/method-helpers';
import { config } from '../config';
import { getIpsMac } from '../utils/shell-methods';
import mapValues from 'lodash/mapValues'
import logger from '../utils/logger';
import os from 'os';

class CamerasController {
    constructor(nvr) {
        this.nvr = nvr;
        this.isScanning = false;
        this.init()
    }

    async init() {
        await this.scanCameras();
        setInterval(this.checkCameras.bind(this), config.interval_check.cameras);
    }

    async checkCameras() {
        await this.nvr.loadCameras();
        await this.scanCameras();
    }

    async scanCameras() {
        logger.info("START SCAN CAMERAS")
        if (this.isScanning) {
            logger.warn("The previous task of scanning camera doesn't finished yet! Skip this scanning...")
            return;
        }
        this.isScanning = true;

        const ipsMac = getIpsMac();

        await asyncForEach(this.nvr.getCameras(), async cam => {
            var foundCam = ipsMac.find(c => c.mac === cam.mac);
            // IF found ip of the camera by mac AND new IP different from old IP THEN update new IP to CMS
            if (!!foundCam && cam.hostname != foundCam.ip) {
                cam.setHostname(foundCam.ip);
                await updateCameraIp(this.nvr.macAddress, cam.hostname, cam.mac);
            }

            if (!!foundCam) {
                logger.info(`CHECK CAMERA IP:${cam.hostname} MAC: ${cam.mac} ONLINE`)
                await updateOnlineStatusCamera(cam.mac);
                cam.checkSyncTime();
            } else {
                logger.warn(`CHECK CAMERA IP:${cam.hostname} MAC: ${cam.mac}  OFFLINE`)
            }
        })

        logger.info("SCAN CAMERAS DONE")
        this.isScanning = false
    }
}

export default CamerasController;
import { updateCameraIp, updateOnlineStatusCamera } from '../api/cms-api';
import { asyncForEach, callbackToPromise } from '../utils/method-helpers';
import { config } from '../config';
import logger from '../utils/logger';
import flatten from 'lodash/flatten';
import os from 'os';
import Discovery from '../utils/onvif-discovery';
import { getMAC } from 'node-arp';

class CamerasController {
    constructor(nvr, logTcp) {
        this.nvr = nvr;
        this.isScanning = false;
        this.logTcp = logTcp;
        this.init()
    }

    async init() {
        await this.scanCameras();
        this.sendCamerasInfoLog();
        setInterval(this.sendCamerasInfoLog.bind(this), config.interval_check.sendlog_cameras)
        setInterval(this.checkCameras.bind(this), config.interval_check.cameras);
    }

    async checkCameras() {
        await this.nvr.loadCameras();
        await this.scanCameras();
    }

    sendCamerasInfoLog() {
        this.nvr.getCameras().forEach(async cam => {
            try {
                var info = await cam.getInfo()
                info.type = 'vp9camera'
                info.nvrMac = this.nvr.macAddress
                var sendDone = await this.logTcp.sendlog(info)
                if(sendDone) logger.info(`SENT LOG OF CAMERA ${cam.mac}`)
            
            } catch (error) {
                logger.warn(`CAMERA ${cam.mac} IS OFFLINE, CANNOT SEND LOG TO SERVER`)
            }
        })
    }

    async scanCameras() {
        logger.info("START SCAN CAMERAS")
        if (this.isScanning) {
            logger.warn("The previous task of scanning camera doesn't finished yet! Skip this scanning...")
            return;
        }
        this.isScanning = true;

        const camsByMac = await this.discoveryCameras()
        await asyncForEach(this.nvr.getCameras(), async cam => {
            var foundCam = camsByMac[cam.mac];
            // IF found ip of the camera by mac AND new IP different from old IP THEN update new IP to CMS
            if (!!foundCam && cam.hostname !== foundCam.hostname) {
                await updateCameraIp(this.nvr.macAddress, foundCam.hostname, cam.mac);
            }

            if (foundCam) {
                cam.updateInfo(foundCam)
                //CHECK CAMERA ONLINE
                logger.info(`CHECK CAMERA IP:${cam.hostname} MAC: ${cam.mac} ONLINE`)
                await updateOnlineStatusCamera(cam.mac);
                //CHECK CAMERA TIME VS NVR TIME
                cam.checkSyncTime();
            } else {
                logger.warn(`CHECK CAMERA IP:${cam.hostname} MAC: ${cam.mac}  OFFLINE`)
            }
        })
        logger.info("SCAN CAMERAS DONE")
        this.isScanning = false
    }

    async discoveryCameras() {
        const addresses = flatten(Object.values(os.networkInterfaces()))
            .filter(adr => !adr.internal && adr.family === 'IPv4')


        var cameras = await Promise.all(addresses.map((adr) => {
            return callbackToPromise(Discovery.probe, { address: adr.address })
        })).catch(error => {
            logger.error(error.message)
            cameras = []
        })

        cameras = flatten(cameras)

        var camsByMac = {};
        await asyncForEach(cameras, async (cam) => {
            try {
                const mac = await callbackToPromise(getMAC, cam.hostname)
                camsByMac[mac] = cam;
            } catch (error) {
                logger.error(`CAN'T GET MAC OF IP ${cam.hostname}, ERROR: ${error.message}`)
            }
        })
        return camsByMac;
    }
}

export default CamerasController;
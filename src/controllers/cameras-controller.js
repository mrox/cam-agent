import { updateCameraIp, updateOnlineStatusCamera } from '../api/cms-api';
import { asyncForEach } from '../utils/method-helpers';
import { config } from '../config';
import logger from '../utils/logger';
import os from 'os';
import Discovery from '../utils/onvif-discovery';
import {getMAC} from 'node-arp';

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
        if(this.isScanning) {
            logger.warn("The previous task of scanning camera doesn't finished yet! Skip this scanning...")
            return ;
        }
        this.isScanning = true;

        const camsByMac = await this.discoveryCameras()
        console.log(camsByMac)
        await asyncForEach(this.nvr.getCameras(), async cam => {
            var foundCam = camsByMac[cam.mac];
            // IF found ip of the camera by mac AND new IP different from old IP THEN update new IP to CMS
            if (!!foundCam && cam.hostname != foundCam.hostname) {
                await updateCameraIp(this.nvr.macAddress, cam.hostname, cam.mac);
            }

            if (foundCam) {
                cam.updateInfo(foundCam)
                console.log(cam.port)
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

    async discoveryCameras(){
        var cameras = [];
        await asyncForEach(Object.values(os.networkInterfaces()), async (addresses) => {
            await asyncForEach(addresses, async (adr) => {
                if(!adr.internal && adr.family === 'IPv4'){
                    try {
                        const cams = await new Promise ((resolve, reject) => {
                            Discovery.probe({ address: adr.address }, function (err, cams) {
                                if (err) reject(err) 
                                resolve(cams)
                            });
                        })
                        console.log(cams)
                        cameras = cameras.concat(cams)
                    } catch (error) {
                        logger.error(`CAN'T DISCOVERY BY ONVIF ON ${adr.address}, ERROR: ${error}`)
                    }   
                }
            })
        })
        console.log(cameras)
        var camsByMac = {};
        await asyncForEach(cameras, async (cam)=> {
            try {
                const mac = await new Promise((resolve, reject) => {
                    getMAC(cam.hostname, (err, mac) => {
                        if(err) reject(err)
                        resolve(mac)
                    }) 
                })
                console.log(mac)
                camsByMac[mac] = cam;
            } catch (error) {
                logger.error(`CAN'T GET MAC OF IP ${cam.hostname}, ERROR: ${error.message}`)
            }
        })
        return camsByMac;
    }
}

export default CamerasController;
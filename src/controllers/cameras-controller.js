import { updateCameraIp, updateOnlineStatusCamera } from '../api/cms-api';
import { parseCmdLocal, asyncForEach } from '../utils/method-helpers';
import { getLiveStatCamera } from '../api/namcdn-api';
import { config } from '../config';
import { getIpsMac } from '../utils/shell-methods';
import logger from '../utils/logger';

class CamerasController {
    constructor(nvr) {
        this.nvr = nvr;
        this.isScanning = false;
        var cdnModule = nvr.modules.find(m => m.name.includes("cdnLaunc"))
        if (cdnModule) this.cmdLocalPath = `${cdnModule.path()}/config/cmd.local.json`;
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

        var chanelsByIp, ipsMac,lives;

        try {
            ipsMac = getIpsMac(this.nvr.ifaces);
            chanelsByIp = parseCmdLocal(this.cmdLocalPath);  
        } catch (error) {
            logger.error(`ERROR: ${error}`);
            this.isScanning = false;
            return 
        }

        try {
            lives = await getLiveStatCamera();
        } catch (error) {
            logger.error(error.message)
            lives = null;
        }
        // GET locahost/live/stat
        // const lives = null;
        await asyncForEach(this.nvr.getCameras(), async cam => {
            var foundCam = ipsMac.find(c => c.mac === cam.mac) || {};
            // IF found ip of the camera by mac AND new IP different from old IP THEN update new IP to CMS
            if (!!foundCam.ip && cam.ip != foundCam.ip) {
                cam.setIp(foundCam.ip);
                await updateCameraIp(this.nvr.macAddress, cam.ip, cam.mac);
            }
            cam.updateInfo(chanelsByIp[cam.ip])
            
            //Check chanel of camera
            const camStatus = !!lives && lives[cam.chanel]

            if (cam.isOnline() && camStatus) {
                //CHECK CAMERA ONLINE
                logger.info(`CHECK CAMERA IP:${cam.ip} MAC: ${cam.mac} ONLINE`)
                await updateOnlineStatusCamera(cam.mac);
                //CHECK CAMERA TIME VS NVR TIME
                cam.checkSyncTime();
            } else {
                logger.warn(`CHECK CAMERA IP:${cam.ip} MAC: ${cam.mac}  OFFLINE`)
            }
        })
        logger.info("SCAN CAMERAS DONE")
        this.isScanning = false
    }
}

export default CamerasController;
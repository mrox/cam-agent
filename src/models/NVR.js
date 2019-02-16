import siCpu from 'systeminformation/lib/cpu';
import siFs from 'systeminformation/lib/filesystem'
import siMem from 'systeminformation/lib/memory'
import os from 'os';
import Camera from './Camera';
import { getModules, getTokenByNvrMac, getCamerasFromCMS } from '../api/cms-api';
import { getDefaultIface, getMac, getFirmwareVersion, getFfmpegCounter } from '../utils/shell-methods';
import config from '../config';
import Module from '../models/Module';
import logger from '../utils/logger';

class NVR {
    constructor() {
        // const macAddress = 'a8:17:02:bc:ca:04';
        var defaultIface
        try {
            defaultIface = getDefaultIface();
            this.macAddress = getMac(defaultIface);
        } catch (error) {
            logger.error("Error: " + error.message)
            process.exit(0)
        }

        return (async () => {
            const ifaces = os.networkInterfaces();

            const { address } = ifaces[defaultIface].find(({family}) => family === 'IPv4') || {};
            this.ipLan = address;
            // await this.loadInfo();
            await this.loadCameras();
            await this.loadModules();
            const { token, siteName} = await getTokenByNvrMac(this.macAddress)
            this.token = token;
            this.siteName = siteName
            return this;
        })();
    }

    isLoadedCameras() {
        return this.cameras.size > 0;
    }

    getCamByMac(mac) {
        return this.cameras.get(mac)
    }

    getCamByHostname(hostname) {
        return this.getCameras().find(c => c.hostname === hostname);
    }

    getCameras() {
        return Array.from(this.cameras.values());
    }

    getInitÌnfo() {
        const arch = os.arch();
        const systemType = config.type;
        const firmwareVersion = getFirmwareVersion()
        return { arch, systemType, firmwareVersion }
    }

    async getInfo() {
        var cpuTemperature, ffmpegCounter, currentLoad, mem, fsSize, cpu;
        try {
            currentLoad = await siCpu.currentLoad()
            mem = await siMem.mem();
            fsSize = await siFs.fsSize()
            cpu = await siCpu.cpu();
            cpuTemperature = await siCpu.cpuTemperature().then(rs => rs.main)
            ffmpegCounter = getFfmpegCounter()
        } catch (error) {
            logger.error(error.message)
        }

        return { currentLoad, mem, cpuTemperature, fsSize, ffmpegCounter, cpu, uptime: os.uptime() }
    }

    async loadCameras() {
        const cameras = await getCamerasFromCMS(this.macAddress)
        if (cameras) {
            this.cameras.forEach((cam, key) => {
                const foundIndex = cameras.findIndex(({mac}) => key === mac)
                if(foundIndex > -1) {
                    cam.updateInfo(cameras[foundIndex])
                    cameras.splice(foundIndex, 1)
                }
                else this.cameras.delete(key)
            })

            cameras.forEach(cam => {
                cam.port = 2000;
                this.cameras.set(cam.mac, new Camera(cam))
            });
        }
    }

    async loadModules() {
        var modules = await getModules(this.macAddress);
        if (modules) this.modules = modules.map(m => new Module(m))
    }

    getNamCdnPath() {
        var cdnModule = this.modules.find(m => m.name.includes("cdnLaunc"))
        if (cdnModule) {
            return cdnModule.path();
        }else {
            throw new Error("MODULE NAMCDN DOESN'T EXIST, PLEASE CHECK AGAIN !")
        }
    }
}

NVR.prototype.cameras = new Map();
NVR.prototype.modules = [];


export default NVR
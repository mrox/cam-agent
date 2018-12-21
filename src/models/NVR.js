import si from 'systeminformation';
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
        try {
            this.defaultIface = getDefaultIface();
            this.macAddress = getMac(this.defaultIface);
        } catch (error) {
            logger.error("Error: " + error.message)
            process.exit(0)
        }

        return (async () => {
            this.ifaces = await si.networkInterfaces().then(ifaces => ifaces.filter(({ internal, ip4 }) => !internal && !!ip4))

            const { ip4 } = this.ifaces.find(({ iface }) => iface === this.defaultIface);
            this.ipLan = ip4;
            // await this.loadInfo();
            await this.loadCameras();
            await this.loadModules();
            this.token = await getTokenByNvrMac(this.macAddress)
            return this;
        })();
    }

    isLoadedCameras() {
        return this.cameras.size > 0;
    }

    getCamByMac(mac) {
        return this.cameras.get(mac)
    }

    getCamByIp(ip) {
        return this.getCameras().find(c => c.ip === ip);
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
            currentLoad = await si.currentLoad()
            mem = await si.mem();
            fsSize = await si.fsSize()
            cpu = await si.cpu();
            cpuTemperature = await si.cpuTemperature().then(rs => rs.main)
            ffmpegCounter = getFfmpegCounter()
        } catch (error) {
            logger.error(error.message)
        }

        return { currentLoad, mem, cpuTemperature, fsSize, ffmpegCounter, cpu }
    }

    async loadCameras() {
        const cameras = await getCamerasFromCMS(this.macAddress)
        if (cameras) this.cameras = new Map(cameras.map(c => [c.mac, new Camera(c)]));
    }

    async loadModules() {
        var modules = await getModules(this.macAddress);
        if (modules) this.modules = modules.map(m => new Module(m))
    }
}

NVR.prototype.cameras = new Map();


export default NVR
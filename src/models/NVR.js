import axios from 'axios';
import si from 'systeminformation';
import os from 'os';
import Camera from './Camera';
import { getModules, getTokenByNvrMac, getCamerasFromCMS } from '../api/cms-api';
import { getDefaultIface, getMac, getFirmwareVersion, getCpuTemperature, getFfmpegCounter } from '../utils/shell-methods';
import config from '../config';
import Module from '../models/Module';

class NVR {
    constructor() {
        this.defaultIface = getDefaultIface();
        // const macAddress = 'a8:17:02:bc:ca:04';
        this.macAddress = getMac(this.defaultIface);

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
        // console.log("LOAD INFO NVR")
        const currentLoad = await si.currentLoad()
        const mem = await si.mem();
        const fsSize = await si.fsSize()
        const cpu = await si.cpu();
        const cpuTemperature = getCpuTemperature()
        const ffmpegCounter = getFfmpegCounter()
        const ipWan = await axios.get('https://api.ipify.org/?format=text').then(rs => rs.data)

        return { currentLoad, mem, cpuTemperature, fsSize, ffmpegCounter, cpu, ipWan }
    }

    async loadCameras() {
        const cameras = await getCamerasFromCMS(this.macAddress)
        this.cameras = new Map(cameras.map(c => [c.mac, new Camera(c)]));
    }

    async loadModules() {
        var modules = await getModules(this.macAddress);
        this.modules = modules.map(m => new Module(m))
    }
}

NVR.prototype.cameras = new Map();


export default NVR
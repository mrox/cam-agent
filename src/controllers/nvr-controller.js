import { updateStatusOfNvr } from '../api/cms-api';
import find from 'lodash/find';
import forEach from 'lodash/forEach'
import LogTCP from '../models/LogTCP';
import config from '../config';
import pidusage from 'pidusage';
var diskspace = require('diskspace');

import { asyncForEach } from '../utils/method-helpers';
import logger from '../utils/logger';

class NvrController {
    constructor(nvr, logTcp) {
        this.nvr = nvr;
        this.logTCP = logTcp;
        this.init();
    }

    async init() {
        //CHECK CHANGED INFO 
        await this.checkNVR();
        setInterval(this.checkNVR.bind(this), config.interval_check.nvr);
    }


    async checkNVR() {
        const { mem, cpuTemperature, fsSize, currentLoad, ffmpegCounter, cpu } = await this.nvr.getInfo();
        const hddInfoRaw = find(fsSize, { mount: '/mnt/hdd' })
        const nandInfoRaw = find(fsSize, { fs: '/dev/data' });

        var zfs;
        if (!hddInfoRaw) zfs = await this.getZfs()
        // SEND TO CMS 
        this.sendToCms(mem, cpuTemperature, currentLoad, hddInfoRaw, zfs, nandInfoRaw)
        //SEND TO KIBANA
        this.sendLogInfo(mem, cpuTemperature, fsSize, currentLoad, ffmpegCounter, cpu, zfs, nandInfoRaw)
    }

    async getZfs() {
        var zfs;
        try {
            const { used, total } = await new Promise((resolve, reject) => {
                diskspace.check('/mnt/hdd', (err, rs) => {
                    if (err) reject(err)
                    else resolve(rs)
                });
            })
            zfs = { used, total }

        } catch (error) {
            logger.error(error.message)

        }
        return zfs
    }

    sendToCms(mem, cpuTemperature, currentLoad, hddInfoRaw, zfs, nandInfoRaw) {
        const { macAddress } = this.nvr;

        const data_info = [
            {
                "property_type": "RAM",
                "module_id": "1",
                "property_group": "MEMORY",
                "unit_type": "GB",
                "volume_total": mem.total / Math.pow(1024, 3),
                "volume_used": mem.used / Math.pow(1024, 3)
            },
            {
                "property_type": "TEMPERATURE",
                "module_id": "1",
                "property_group": "PROCESSOR",
                "unit_type": "oC",
                "volume_total": 110,
                "volume_used": cpuTemperature || 0
            },
            ...currentLoad.cpus.map((cpu, i) => ({
                "property_type": "CPU",
                "module_id": "core " + i,
                "property_group": "PROCESSOR",
                "unit_type": "%",
                "volume_total": 100,
                "volume_used": cpu.load
            }))
        ]

        if (nandInfoRaw) data_info.push({
            property_type: "NAND",
            module_id: '1',
            property_group: 'STORAGE',
            unit_type: "GB",
            volume_total: nandInfoRaw.size / Math.pow(1024, 3),
            volume_used: nandInfoRaw.used / Math.pow(1024, 3)
        })

        if (!!hddInfoRaw) data_info.push({
            property_type: 'HDD',
            module_id: '1',
            property_group: 'STORAGE',
            unit_type: 'GB',
            volume_total: hddInfoRaw.size / Math.pow(1024, 3),
            volume_used: hddInfoRaw.used / Math.pow(1024, 3)
        })
        else if (!!zfs) {
            const { used, total } = zfs
            data_info.push({
                property_type: 'HDD',
                module_id: '1',
                property_group: 'STORAGE',
                unit_type: 'GB',
                volume_total: total / Math.pow(1024, 3),
                volume_used: used / Math.pow(1024, 3)
            })
        }

        const systemInfo = {
            device_id: macAddress,
            data_info
        }

        updateStatusOfNvr(systemInfo);
    }

    async sendLogInfo(mem, cpuTemperature, fsSize, currentLoad, ffmpegCounter, cpu, zfs, nandInfoRaw) {
        await this.nvr.loadModules();
        const { arch, systemType, firmwareVersion } = this.nvr.getInitÌnfo();
        const { ipLan, modules } = this.nvr;

        var onlineModules = [], modulesVesion = {}, stats = {}
        const disk = { total: 0, used: 0, count: 0 }
        const { manufacturer, brand, speed } = cpu

        await asyncForEach(modules, async mo => {
            const bashProcess = await mo.getBashProcess()
            if (bashProcess) {
                const { id, name, version } = mo
                onlineModules.push({ id, name, version, ...bashProcess })
                modulesVesion[name] = version
            }
        })

        try {
            stats = await pidusage(onlineModules.map(m => m.pid))
        } catch (error) {
            logger.error(error.message)
        }

        onlineModules.forEach(mo => {
            if (stats[mo.pid]) mo.elapsed = stats[mo.pid].elapsed;
        })

        forEach(fsSize, fs => {
            if (!['/dev/data', '/dev/system'].includes(fs.fs)) {
                disk.count += 1;
                disk.total += fs.size;
                disk.used += fs.used;
            }
        })

        let logObject = {
            '@cpu': currentLoad.currentload,
            '@cpu_name': `${manufacturer || ''} ${brand || ''} @ ${speed}GHz`.trim(),
            '@memory': mem.used * 100 / mem.total,
            '@temperature': cpuTemperature || 0,
            '@ffmpeg_counter': ffmpegCounter || 0,
            '@cam_counter': this.nvr.getCameras().length,
            '@ip_lan': ipLan,
            '@disk': disk,
            '@arch': arch,
            '@system_type': systemType,
            '@firmware_version': firmwareVersion,
            '@modules': onlineModules,
            '@node': this.nvr.macAddress,
            type: 'vp9tcp',
            ...modulesVesion
        }

        if (nandInfoRaw) logObject['@nand'] = {
            size: nandInfoRaw.size,
            used: nandInfoRaw.used
        }
        if (zfs) logObject['@zfs'] = zfs
        // console.log(logObject)
        const sent = this.logTCP.sendlog(logObject)
        if(sent) logger.info('SENT LOG OF NVR DONE')
    }
}

export default NvrController;
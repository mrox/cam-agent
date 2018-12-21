import { updateStatusOfNvr } from '../api/cms-api';
import _ from 'lodash';
import LogTCP from '../models/LogTCP';
import config from '../config';
import pidusage from 'pidusage';

import { asyncForEach } from '../utils/method-helpers';
import logger from '../utils/logger';

class NvrController {
    constructor(nvr) {
        this.nvr = nvr;
        this.logTCP = new LogTCP(nvr.macAddress, config.log_server);
        this.init();
    }

    async init() {
        //CHECK CHANGED INFO 
        await this.checkNVR();
        setInterval(this.checkNVR.bind(this), config.interval_check.nvr);
        //INIT LOG      
        const { arch, systemType, firmwareVersion } = this.nvr.getInitÌnfo();
        this.logTCP.log({
            '@arch': arch,
            '@system_type': systemType,
            '@firmware_version': firmwareVersion,
        }, 'info')
    }

    async checkNVR() {
        const { mem, cpuTemperature, fsSize, currentLoad, ffmpegCounter , cpu} = await this.nvr.getInfo();
        const { arch, systemType, firmwareVersion } = this.nvr.getInitÌnfo();
        const { macAddress, ipLan } = this.nvr;

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

        const nandInfoRaw = _.find(fsSize, { fs: '/dev/data' });
        if (nandInfoRaw) data_info.push({
            property_type: "NAND",
            module_id: '1',
            property_group: 'STORAGE',
            unit_type: "GB",
            volume_total: nandInfoRaw.size / Math.pow(1024, 3),
            volume_used: nandInfoRaw.used / Math.pow(1024, 3)
        })

        const hddInfoRaw = _.find(fsSize, { mount: '/mnt/hdd' })

        if (hddInfoRaw) data_info.push({
            property_type: 'HDD',
            module_id: '1',
            property_group: 'STORAGE',
            unit_type: 'GB',
            volume_total: hddInfoRaw.size / Math.pow(1024, 3),
            volume_used: hddInfoRaw.used / Math.pow(1024, 3)
        })

        var systemInfo = {
            device_id: macAddress,
            data_info
        }
        await updateStatusOfNvr(systemInfo);

        if (!this.logTCP.isConnected) return;

        await this.nvr.loadModules();
        var onlineModules = []
        await asyncForEach(this.nvr.modules, async mo => {
            const bashProcess = await mo.getBashProcess()
            if(bashProcess) {
                const { id, name, version} = mo
                onlineModules.push({id, name, version, ...bashProcess})
            }
        })
        var stats = {}
        try {
            stats = await pidusage(onlineModules.map(m => m.pid))
        } catch (error) {
            logger.error(error.message)
        }
        onlineModules.forEach(mo => {
            if(stats[mo.pid]) mo.elapsed = stats[mo.pid].elapsed;
        })
    
        const disk = {
            total: 0,
            used: 0,
            count: 0
        }
        _.forEach(fsSize, fs => {
            if (!['/dev/data', '/dev/system'].includes(fs.fs)) {
                disk.count += 1;
                disk.total += fs.size;
                disk.used += fs.used;
            }
        })
        const { manufacturer, brand, speed } = cpu
    
        let logObject = {
            '@cpu': currentLoad.currentload,
            '@cpu_name': `${manufacturer || ''} ${brand || ''} @ ${speed}GHz`.trim(),
            '@memory': mem.used * 100 / mem.total,
            '@temperature': cpuTemperature || 0,
            '@fs_size': _.meanBy(fsSize, o => o.use) || 0,
            '@ffmpeg_counter': ffmpegCounter || 0,
            '@cam_counter': this.nvr.getCameras().length,
            '@ip_lan': ipLan,
            '@disk': disk,
            '@arch': arch,
            '@system_type': systemType,
            '@firmware_version': firmwareVersion,
            '@modules': onlineModules
        }

        if (nandInfoRaw) logObject['@nand'] = {
            size: nandInfoRaw.size,
            used: nandInfoRaw.used
        }
        this.logTCP.log(logObject, 'info')
    }
}

export default NvrController;
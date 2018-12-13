
import { execSync, spawn } from 'child_process';
import {rootPath} from '../config';
import os from 'os';

function exec(src) {
    try {
        var rs = execSync(src, { encoding: 'utf-8' });
        return rs.trim()

    } catch (error) {
        console.error("EXIT APP, BYE!!!")
        // console.error(error.message);
        process.exit(0);
    }
}

export const getDefaultIface = () => exec('ip r | grep default | awk  \'{ print $5 }\' | head -1')

export const getMac = (netInterface) => exec(`/bin/cat /sys/class/net/${netInterface}/address`)

export const getIpsMac = (ifaces) => {
    var rows = []
    const isPC = ['x64', 'x86'].includes(os.arch())
    ifaces.forEach(({ iface }) => {
        const str = exec(`sudo ${rootPath}/lib/${isPC ? 'arp-scan-pc' : 'arp-scan-b6'} --interface="${iface}" --localnet --retry=3 | grep ":" | egrep -v "Interface" | grep -v "Starting" | grep -v "Ending"`)
        const row = str.split('\n').map((line) => {
            const [ip, mac] = line.split(/\s/g)
            return { ip, mac }
        })
        rows = rows.concat(row)
    });

    return rows
}

export const getFirmwareVersion = () => exec('cat /etc/issue');

export const getCpuTemperature = () => exec('cat /sys/class/thermal/thermal_zone0/temp | cut -c 1-2');

export const getFfmpegCounter = () => Number(exec('ps ax -no-heading | grep ffmpeg | grep -v grep | wc -l'))


import { execSync } from 'child_process';
import { rootPath } from '../config';
import forEach from 'lodash/forEach';
import os from 'os';
import logger from './logger';

function exec(src) {
    try {
        var rs = execSync(src, { encoding: 'utf-8' });
        return rs.trim()

    } catch (error) {
        throw new Error(error.message)
    }
}

export const getDefaultIface = () => exec('ip r | grep default | awk  \'{ print $5 }\' | head -1')

export const getMac = (netInterface) => exec(`/bin/cat /sys/class/net/${netInterface}/address`)

export const getIpsMac = () => {
    var rows = []
    const isPC = ['x64', 'x86'].includes(os.arch())
    const ifaces = os.networkInterfaces()
    forEach(ifaces, function (addresses, key) {
        const value = addresses.filter(({internal, family}) => !internal && family === 'IPv4')
        if(value.length > 0) {
            try {
                const subnets = value.map(({address, netmask}) => `${address}:${netmask}`)
                const str = exec(`sudo ${rootPath}/lib/${isPC ? 'arp-scan-pc' : 'arp-scan-b6'} -I "${key}" ${subnets.join(' ')} --retry=1 --timeout=200 --interval=200u | grep ":" | egrep -v "Interface" | grep -v "Starting" | grep -v "Ending"`)
                const row = str.split('\n').map((line) => {
                    const [ip, mac] = line.split(/\s/g)
                    return { ip, mac }
                })
                rows = rows.concat(row)
            } catch (error) {
                logger.warn(error.message)
            }
        }
    })
    return rows
}

export const getFirmwareVersion = () => exec('cat /etc/issue');

// export const getCpuTemperature = () => exec('cat /sys/class/thermal/thermal_zone0/temp | cut -c 1-2');

export const getFfmpegCounter = () => Number(exec('ps ax -no-heading | grep ffmpeg | grep -v grep | wc -l'))

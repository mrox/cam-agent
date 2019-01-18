import { get, post} from '../utils/request';
import logger from '../utils/logger';

export const getNvrInfo = async (mac) => {
    var nvr;
    try {
        nvr = await get(`/server/getDetail?device_id=${mac}`);
    } catch (error) {
        logger.error(`GET NVR INFO FROM FAILED - ${error.message}`)
    }

    return nvr;
}

export const updateStatusOfNvr = async  (data) => {
    try {
        const rs = await post('/healthchecker/update', data)
        logger.info("UPDATED NVR INFO")
    } catch (error) {
        logger.error(`UPDATE NVR INFO TO CMS FAILED - ${error.message}`)
    }
}

export const updateOnlineStatusCamera = async (mac) => {
    try {
        const rs = await get(`/lastupdatetimecamera?device_id=${mac}`);
        if(rs.success) return rs;
        
        else logger.error("Cannot camera status to server.")
    } catch (error) {
        logger.error(`UPDATE CAMERA ${mac} ONLINE TO CMS FAILED - ${error.message}`)
    }
}

export const updateCameraIp = async (nvrMac, newIp, camMac) => {
    try {
        const rs = await get(`/camera?action=update_ip_camera&device_id_server=${nvrMac}&ip=${newIp}&device_id_camera=${camMac}`)
        if(rs.message === "Success") logger.info(`UPDATED IP OF CAMERA ${camMac}: ${newIp}`);
        else logger.error(`UPDATED IP OF CAMERA ${camMac} FAILED`);
    } catch (error) {
        logger.error(`CAN'T UPDATE IP ${newIp} OF CAMERA ${camMac} TO CMS`)
    }
}

export const getTokenByNvrMac = async (mac) => {
    try {
        const rs = await get(`/getToken?device_id=${mac}`);
        if(rs.token) return rs.token;
    } catch (error) {
        logger.error(`GET TOKEN OF NVR MAC FROM CMS FAILED - ${error.message}`)
    }
}

export const getCdnController = async (nvrMac) => {
    try {
        const rs = await get(`/get_cdn_controller?nvr_device_id=${nvrMac}`);
        return rs;
    } catch (error) {
        logger.error(`GET CDN CONTROLLER FROM CMS FAILED - ${error.message}`)        
        return null;
    }
}  

export const getModules = async (nvrMac) => {
    try {
        const rs = await get(`/module?action=get_latest_version&device_id_server=${nvrMac}`);
        if(!!rs && typeof rs === 'string'){
            const modules = rs.replace('EOF\n', '').split('EOL\n')
            .map(line => {
                const [id, command, name, version, date, link, os, cpu] = line.split(";")
                return{
                id, command, name, version, date, link, os, cpu
            }})
            console.log(modules)
            return modules;
        }else if(typeof rs === 'object' && !!rs.error) 
            throw new Error(rs.message)
    } catch (error) {
        logger.error(`GET MODULES FROM CMS FAILED - ${error.message}`)
        return null;
    }
}

export const getCamerasFromCMS = async (nvrMac) => {
    try {
        const rs = await get(`/server/getDetail?version=v2&device_id=${nvrMac}`);

        const cameras = rs.cameras.map(cam => {
            const { ip, username, password, device_id, ptz_type } = cam
            return {mac: device_id, hostname: ip, username, password, isPtz: !!ptz_type}
        })

        return cameras;
    } catch (error) {
        logger.error(`GET CAMERAS FROM CMS FAILED - ${error.message}`)     
        return null;   
    }
}
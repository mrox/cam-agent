import { get, post} from '../utils/request';
import logger from '../utils/logger';

export const getNvrInfo = async (mac) => {
    var nvr;
    try {
        nvr = await get(`/server/getDetail?device_id=${mac}`);
    } catch (error) {
        logger.error(`Get NVR info FAILED - ${error.message}`)
    }

    return nvr;
}

export const updateStatusOfNvr = async  (data) => {
    try {
        const rs = await post('/healthchecker/update', data)
        logger.info("UPDATED NVR INFO")
    } catch (error) {
        logger.error(`Update NVR info FAILED - ${error.message}`)
    }
}

export const updateOnlineStatusCamera = async (mac) => {
    try {
        const rs = await get(`/lastupdatetimecamera?device_id=${mac}`);
        if(rs.success) return rs;
        
        else logger.error("Cannot camera status to server.")
    } catch (error) {
        logger.error(`Update Camera status FAILED - ${error.message}`)
    }
}

export const updateCameraIp = async (nvrMac, newIp, camMac) => {
    try {
        const rs = await get(`/camera?action=update_ip_camera&device_id_server=${nvrMac}&ip=${newIp}&device_id_camera=${camMac}`)
        if(rs.message === "Success") logger.info(`UPDATED IP OF CAMERA ${camMac}: ${newIp}`);
        else logger.error(`UPDATED IP OF CAMERA ${camMac} FAILED`);
    } catch (error) {
        logger.error(`CAN'T UPDATE IP ${newIp} OF CAMERA ${camMac} TO CMS SERVER`)
    }
}

export const getTokenByNvrMac = async (mac) => {
    try {
        const rs = await get(`/getToken?device_id=${mac}`);
        if(rs.token) return rs.token;
    } catch (error) {
        logger.error(`GET TOKEN OF NVR MAC FAILED - ${error.message}`)
    }
}

export const getCdnController = async (nvrMac) => {
    try {
        const rs = await get(`/get_cdn_controller?nvr_device_id=${nvrMac}`);
        return rs;
    } catch (error) {
        logger.error(`Get CDN controller FAILED - ${error.message}`)        
        return null;
    }
}  

export const getModules = async (nvrMac) => {
    try {
        const rs = await get(`/module?action=get_latest_version&device_id_server=${nvrMac}`);
        const modules = rs.replace('EOF\n', '').split('EOL\n')
        .map(line => {
            const [id, command, name, version, date, link, os, cpu] = line.split(";")
            return{
            id, command, name, version, date, link, os, cpu
        }})
        return modules;
    } catch (error) {
        logger.error("CANNOT GET MODULES")
    }
}

export const getCamerasFromCMS = async (nvrMac) => {
    try {
        const rs = await get(`/camera?action=get_all_camera_from_server&device_id_server=${nvrMac}`);
        const cameras = rs.split('\n').map(cam => {
            const [ mac, ip ] = cam.split(';');
            return {mac, ip}
        }).filter(c => !!c.mac)
        
        return cameras;
    } catch (error) {
        logger.error("CANNOT GET CAMERAS")        
    }
}
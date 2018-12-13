import axios from 'axios';
import { checkStatus } from '../utils/request';
import logger from '../utils/logger';

export const getLiveStatCamera = async () => {
    try {
        var rs = await axios.get('http://127.0.0.1/live/stat/');
        var pattern = /chn>(.*?)\s.*?pos:(.*?)\s/ig
        var str = checkStatus(rs);
        var e;
        const rt = {}
        while (e = pattern.exec(str)) {
            rt[e[1]] = isFinite(e[2]);
        }
        return rt
    } catch (error) {
        logger.error("CANNOT GET localhost/live/stat")
        return null;
    }
}
import axios from 'axios';
import { checkStatus } from '../utils/request';

export const getLiveStatCamera = async () => {
    var url = 'http://127.0.0.1/live/stat/'
    try {
        var rs = await axios.get(url);
        var pattern = /chn>(.*?)\s.*?pos:(.*?)\s/ig
        var str = checkStatus(rs);
        var e;
        const rt = {}
        while (e = pattern.exec(str)) {
            rt[e[1]] = isFinite(e[2]);
        }
        return rt
    } catch (error) {
        throw new Error(`CANNOT GET ${url}, ${error.message}`)
    }
}
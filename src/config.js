import fs from 'fs';
import reduce from 'lodash/reduce';
import trim from 'lodash/trim';
import path from 'path';

const argv = require('minimist')(process.argv.slice(2));
const rootPath = path.dirname(process.mainModule.filename);

const { LOG } = argv;

var settings;

try {
  settings = fs.readFileSync(`${rootPath}/config.json`, "utf8");
  settings = JSON.parse(settings);
} catch (error) {
  console.error("File settings.json lỗi, Kiểm tra lại định dạng");
  console.log(error);
  process.exit(0);
}


var apiConf;
try {
    apiConf = fs.readFileSync(`${settings.base_dir}/etc/api.conf`, 'utf-8');
    
} catch (error) {
    console.error(error.message);
    console.error("EXIT APP, BYE!")
    process.exit(1);
}
apiConf = apiConf.split('\n').filter(line => !!line && line.trim().charAt(0) !== "#");
apiConf = reduce(apiConf, function(result, str){
    var [ key, value ] = str.split('=');
    value = trim(value, '"\' ');
    result[key] = isFinite(value) ? Number(value) : value;
    return result;
},{})

const { api , url, onvif_socket} = apiConf;

const config = {
    ...settings,
    api,
    url,
    onvifSocket: onvif_socket || api.replace('/api', ''),
    log: !!LOG,
    type: url.includes('cam9') ? 'cam9' : 'vcam',
    log_server: {
        port: 443,
        host: api.replace(/^http(s?):\/\/core/i, 'logs').replace('/api', '')
    }
}

export {
    config,
    rootPath
};

export default config
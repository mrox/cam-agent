import http from 'http';
import { parseSOAPString } from '../utils/method-helpers';

export const requestOnvif = async (cam, options, callback) => {
    var callbackExecuted = false;

    const path = options.service ? `/onvif/${options.service}` : cam.path;
    const reqOptions = {
        hostname: options.hostname,
        //port: options.port || 2000,
        port: cam.port || 2000,
        path,
        username: options.username,
        password: options.password,
        headers: {
            'Content-Type': 'application/soap+xml',
            'Content-Length': Buffer.byteLength(options.body, 'utf8'),
            charset: 'utf-8'
        }, 
        method: "POST"
    };

    var req = http.request(reqOptions, function (res) {
        var bufs = [],
            length = 0;
        res.on('data', function (chunk) {
            bufs.push(chunk);
            length += chunk.length;

        });
        res.on('end', function () {
            if (callbackExecuted === true) {
                return;
            }
            var xml = Buffer.concat(bufs, length).toString('utf8');
            parseSOAPString(xml, callback);
            callbackExecuted = true;
        });
    });

    req.setTimeout(3000, function () {
        if (callbackExecuted === true) {
            return;
        }
        callback(new Error('cant request to camera'));
        callbackExecuted = true;
    });
    req.on('error', function (err) {
        if (callbackExecuted === true) {
            return;
        }
        if (err.code === 'ECONNREFUSED' && err.errno === 'ECONNREFUSED' && err.syscall === 'connect') {
            callback(err);
        } else if (err.code === 'ECONNRESET' && err.errno === 'ECONNRESET' && err.syscall === 'read') {
            callback(err);
        } else {
            callback(err);
        }
        callbackExecuted = true;
    });

    req.write(options.body);
    req.end();
}

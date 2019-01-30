import io from 'socket.io-client';
import { requestOnvif } from '../api/onvif-api';
import config from '../config';
import logger from '../utils/logger';
import os from 'os';

const onvifEvents = [
    ['message_cam', 'OnvifResult'],
    ['getCapabilities', 'getCapabilities'],
    ['getProfiles', 'getProfiles'],
    ['getVideoSources', 'getVideoSources']
]

class SocketController {
    constructor(nvr) {
        this.nvr = nvr;
        if (!!config.onvifSocket) {
            this.socket = io.connect(config.onvifSocket, { query: 'token=' + nvr.token });
            this.initSocket();
            // this.request = debounce(this.request, 200)
        }else {
            logger.error("File api.conf doesn't contain onvif_socket")
        }
    }

    initSocket() {
        const socket = this.socket;
        socket.on('connect', () => {
            socket.emit('join', { device_id: this.nvr.macAddress });
            socket.on("join", function (data) {
                logger.info("SOCKET - JOINED");
            });
            socket.emit('CamOderUbuntu', { device_id: this.nvr.macAddress });
        });

        socket.on('error', function (data) {
            logger.error('SOCKET -' + data);
        });
        socket.on('connect_error', function (data) {
            logger.error("SOCKET - connect_error " + data);
        });
        socket.on('disconnect', function () {
            logger.error("SOCKET - disconnect socket");
        });

        socket.on('query', this.handleQuery.bind(this))

        onvifEvents.forEach(([eventOn, eventEmit]) => {
            socket.on(eventOn, data => this.handleOnvifEvent(data, eventEmit))
        })
    }

    handleQuery(query){
        var result 
        switch (query.cmd) {
            case 'interfaces':
                result = {
                    type: query.cmd,
                    data:os.networkInterfaces()
                };
                delete result.data.lo;
                break;
        
            default:
                break;
        }
        this.socket.emit('result', {
            room: this.nvr.macAddress,
            result
        })
    }

    async handleOnvifEvent(data, event) {
        const cam = this.nvr.getCamByHostname(data.hostname);
        if (!cam) return;
        const { error, result, xml } = await new Promise((resolve, reject) => {
            requestOnvif(cam, data, (error, result, xml) => resolve({ error, result, xml }))
        })

        var mess = {
            method: data.method,
            code: error ? 1 : 0,
            message: error ? error : result,
            'xml': xml,
            camera_id: data.camera_id,
            device_id: this.nvr.macAddress
        }

        this.socket.emit(event, mess)
    }
}

export default SocketController;
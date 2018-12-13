import io from 'socket.io-client';
import { requestOnvif } from '../api/onvif-api';
import config from '../config';
import logger from '../utils/logger';

class OnvifController {
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
        socket.emit('my other event', { my: 'data' });

        socket.on('error', function (data) {
            logger.error('SOCKET -' + data);
        });
        socket.on('connect_error', function (data) {
            logger.error("SOCKET - connect_error " + data);
        });
        socket.on('disconnect', function () {
            logger.error("SOCKET - disconnect socket");
        });

        socket.on('message_cam', data => this.request(data, 'OnvifResult'))

        // socket.on('getCapabilities', data => {
        //     console.log("getCapabilities")
        //     const cam = this.nvr.getCamByHostname(data.hostname);
        //     if (!cam) return;
        //     var { capabilities } = cam;
        //     console.log(JSON.stringify(capabilities));
        //     socket.emit('getCapabilities', [{"getCapabilitiesResponse": [{"capabilities": [capabilities]}]}])
        // })
        // socket.on('getCapabilities', data => console.log(data))

        socket.on('getCapabilities', data => this.request(data, 'getCapabilities'))

        socket.on('getProfiles', data => this.request(data, 'getProfiles'))

        socket.on('getVideoSources', data => this.request(data, 'getVideoSources'))
    }

    async request(data, event) {
        const cam = this.nvr.getCamByIp(data.hostname);
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

export default OnvifController;
import NvrController from './nvr-controller';
import CdnController from './cdn-controller';
import NVR from '../models/NVR';
import SocketController from './socket-controller';
import CamerasController from './cameras-controller';
import LogTCP from '../models/LogTCP';
import config from '../config';

const app = async () => {
    const nvr = await new NVR();
    const logTcp =  new LogTCP(config.log_server)
    new CdnController(nvr)  
    new CamerasController(nvr,logTcp);
    new SocketController(nvr)
    new NvrController(nvr,logTcp);
}

export default app;
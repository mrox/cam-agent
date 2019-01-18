import NvrController from './nvr-controller';
import CdnController from './cdn-controller';
import NVR from '../models/NVR';
import SocketController from './socket-controller';
import CamerasController from './cameras-controller';

const app = async () => {
    const nvr = await new NVR();
    new CdnController(nvr)  
    new CamerasController(nvr);
    new SocketController(nvr)
    new NvrController(nvr);
}

export default app;
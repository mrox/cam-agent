import NvrController from './nvr-controller';
import CdnController from './cdn-controller';
import NVR from '../models/NVR';
import OnvifController from './onvif-controller';
import CamerasController from './cameras-controller';

const app = async () => {
    const nvr = await new NVR();
    new CdnController(nvr)  
    new CamerasController(nvr);
    new OnvifController(nvr)
    new NvrController(nvr);
}

export default app;
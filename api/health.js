import {endpoint} from '../lib/core.js';
import {KIND,NAME} from '../lib/config.js';
export default endpoint('GET',async()=>({ok:true,name:NAME,kind:KIND,mode:'local',free:true,authRequired:false,aiReady:true,voice:'on-device'}));

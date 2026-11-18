import {endpoint,HttpError} from '../lib/core.js';
// Retired endpoint: never calls a paid service, even if old keys remain configured.
export default endpoint('POST',async()=>{throw new HttpError(410,'A transcrição paga foi desativada. Atualize a página e use a voz gratuita no dispositivo.');});

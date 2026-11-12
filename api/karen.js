// Vercel Node.js function; credentials are environment secrets, never browser config.
import {handleKaren} from '../server/karen-api.js';
export default {fetch(request){return handleKaren(request,process.env);}};

'use strict';
// Temporary deployment-only acceptance entry point, removed from Railway config afterward.
(async()=>{await require('./setup-email-domain').main();await require('./production-probe').main();})().catch(error=>{console.error('CAREERLAUNCH_ACCEPTANCE_FAIL '+JSON.stringify({category:error.code||'provider_or_render',message:String(error.message||'failed').slice(0,180)}));process.exitCode=1;});

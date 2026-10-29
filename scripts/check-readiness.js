'use strict';
const {configuration}=require('../lib/config');
const c=configuration();console.log(JSON.stringify({intakeEnabled:c.enabled,checkoutEnabled:false,blockers:c.blockers},null,2));if(c.blockers.length)process.exitCode=1;

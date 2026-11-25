#!/usr/bin/env node
import {init,validate,plan} from './scaffold.mjs';
import {audit} from './audit.mjs';
import {capture, verify, readManifest} from './snapshot.mjs';
const [command,...args]=process.argv.slice(2);
try{
  if(command==='init' && (args.length===5 || (args.length===6 && args[5]==='--dry-run')) && args[1]==='--template' && args[3]==='--dest') console.log(JSON.stringify(await (args[5]==='--dry-run'?plan:init)({name:args[0],template:args[2],dest:args[4]}),null,2));
  else if(command==='audit' && args.length===1){const result=await audit(args[0]);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
  else if(command==='validate' && args.length===1){const result=await validate(args[0]);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
  else if(command==='snapshot' && args[0]==='create' && args.length>=3) console.log(JSON.stringify(capture(args[1],args.slice(2)),null,2));
  else if(command==='snapshot' && args[0]==='verify' && args.length===3) console.log(JSON.stringify(verify(args[1],readManifest(args[2])),null,2));
  else {console.error('Usage: ops-cli init NAME --template PATH --dest PATH [--dry-run] | ops-cli validate PATH | ops-cli audit PATH | ops-cli snapshot create ROOT NAME... | ops-cli snapshot verify ROOT MANIFEST');process.exitCode=2;}
}catch(e){console.error(e.message);process.exitCode=1;}

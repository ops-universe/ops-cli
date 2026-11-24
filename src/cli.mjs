#!/usr/bin/env node
import {init,validate,plan} from './scaffold.mjs';
import {audit} from './audit.mjs';
const [command,...args]=process.argv.slice(2);
try{
  if(command==='init' && (args.length===5 || (args.length===6 && args[5]==='--dry-run')) && args[1]==='--template' && args[3]==='--dest') console.log(JSON.stringify(await (args[5]==='--dry-run'?plan:init)({name:args[0],template:args[2],dest:args[4]}),null,2));
  else if(command==='audit' && args.length===1){const result=await audit(args[0]);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
  else if(command==='validate' && args.length===1){const result=await validate(args[0]);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
  else {console.error('Usage: ops-cli init NAME --template PATH --dest PATH [--dry-run] | ops-cli validate PATH | ops-cli audit PATH');process.exitCode=2;}
}catch(e){console.error(e.message);process.exitCode=1;}

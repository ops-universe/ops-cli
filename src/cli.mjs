#!/usr/bin/env node
import {init,validate} from './scaffold.mjs';
const [command,...args]=process.argv.slice(2);
try{
  if(command==='init' && args.length===5 && args[1]==='--template' && args[3]==='--dest') console.log(JSON.stringify(await init({name:args[0],template:args[2],dest:args[4]}),null,2));
  else if(command==='validate' && args.length===1){const result=await validate(args[0]);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;}
  else {console.error('Usage: ops-cli init NAME --template PATH --dest PATH | ops-cli validate PATH');process.exitCode=2;}
}catch(e){console.error(e.message);process.exitCode=1;}

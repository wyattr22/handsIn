const {spawnSync}=require('node:child_process');
for(const args of [[require.resolve('typescript/bin/tsc'),'--project','tsconfig.integration-tests.json'],['--test','tests/workspace-integration.test.cjs','tests/connected-capture.test.cjs']]){const result=spawnSync(process.execPath,args,{stdio:'inherit',shell:false});if(result.status!==0)process.exit(result.status||1);}


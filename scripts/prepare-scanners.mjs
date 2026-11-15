import {mkdir,copyFile,readdir,cp} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
const target='public/scanner-assets';
await mkdir(join(target,'core'),{recursive:true});
const tesseract=dirname(require.resolve('tesseract.js/package.json'));
const core=dirname(require.resolve('tesseract.js-core/package.json'));
const pdf=dirname(require.resolve('pdfjs-dist/package.json'));
await copyFile(join(tesseract,'dist/worker.min.js'),join(target,'ocr-worker.min.js'));
await copyFile(join(pdf,'build/pdf.worker.min.mjs'),join(target,'pdf.worker.min.mjs'));
for(const directory of ['cmaps','standard_fonts','wasm']){
 await cp(join(pdf,directory),join(target,'pdf',directory),{recursive:true});
}
for(const file of await readdir(core)){
 if(file.endsWith('.wasm')||file.endsWith('.wasm.js'))await copyFile(join(core,file),join(target,'core',file));
}
for(const [name,root] of [['tesseract',tesseract],['core',core],['pdf',pdf]]){
 const license=(await readdir(root)).find(file=>/^LICENSE(?:\.|$)/i.test(file));
 if(!license)throw Error('Missing license for '+name);
 await copyFile(join(root,license),join(target,name+'-LICENSE'));
}
console.log('Prepared pinned OCR and PDF workers for same-origin delivery.');

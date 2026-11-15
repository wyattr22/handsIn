// File contents stay in this browser. OCR engine assets may be downloaded on first use.
async function imageText(file:Blob|HTMLCanvasElement,progress:(n:number)=>void){
 const {createWorker}=await import('tesseract.js');
 const worker=await createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')progress(Math.round((m.progress||0)*100));}});
 try{return (await worker.recognize(file)).data.text;}finally{await worker.terminate();}
}
export async function extractSource(file:File,progress:(n:number)=>void):Promise<{text:string;pages:number}>{
 if(file.size>15*1024*1024)throw Error('Choose a file smaller than 15 MB.');
 if(file.type.startsWith('image/'))return {text:await imageText(file,progress),pages:1};
 if(file.type==='text/plain')return {text:await file.text(),pages:1};
 if(file.type!=='application/pdf')throw Error('Choose an image, PDF or text file.');
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
 const task=pdfjs.getDocument({data:await file.arrayBuffer()});
 const pdf=await task.promise;
 try{
  if(pdf.numPages>6)throw Error('Choose a report of six pages or fewer, or enter the reviewed results manually.');
  const pages:string[]=[];
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),content=await page.getTextContent();
   let text=content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join('');
   if(text.trim().length<40){const viewport=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;text=await imageText(canvas,n=>progress(Math.round((i-1+n/100)/pdf.numPages*100)));canvas.width=0;canvas.height=0;}
   pages.push(text);progress(Math.round(i/pdf.numPages*100));
  }
  return {text:pages.join('\n\n'),pages:pdf.numPages};
 }finally{await task.destroy();}
}


import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const origin=process.env.MEDIA_TEST_ORIGIN || 'http://127.0.0.1:3000';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Local API required');
const response=await fetch(origin+'/api/data');assert.equal(response.status,200);
const data=await response.json();
const images=new Map();
for(const artist of data.headliners)if(artist.imageUrl?.includes('/api/uploads/')){
  const image=new URL(artist.imageUrl,'https://uletayapp.ru');
  images.set(image.pathname,artist.id);
}
let cursor=0,totalBytes=0;const paths=[...images.keys()],small=[],failures=[];
await Promise.all(Array.from({length:4},async()=>{
  while(cursor<paths.length){
    const pathname=paths[cursor++];
    try{
      const image=await fetch(new URL(pathname,origin),{signal:AbortSignal.timeout(15000)});
      assert.equal(image.status,200);assert.match(image.headers.get('content-type')||'',/^image\/(webp|jpeg|png|gif)/);
      const buffer=Buffer.from(await image.arrayBuffer());totalBytes+=buffer.length;
      const info=await sharp(buffer).metadata();assert(info.width>0&&info.height>0);
      if(Math.min(info.width,info.height)<320)small.push({id:images.get(pathname),width:info.width,height:info.height});
    }catch(error){failures.push({id:images.get(pathname),path:pathname,error:error.message});}
  }
}));
const report={artists:data.headliners.length,uniqueUploadedImages:paths.length,totalBytes,imagesBelow320:small,failures,passed:failures.length===0};
if(process.env.MEDIA_TEST_REPORT)await writeFile(process.env.MEDIA_TEST_REPORT,JSON.stringify(report,null,2)+'\n');
console.log('Public artist media:',JSON.stringify({...report,imagesBelow320:small.length,failures:failures.slice(0,5)}));
assert.equal(failures.length,0,'All uploaded artist portraits must return a decodable image');

import fs from 'node:fs';
import opentype from 'opentype.js';
import clipping from 'polygon-clipping';

// Montserrat is already shipped with the app under SIL OFL. Export a small
// outline alphabet, not a font parser, for identical roof lettering on Native/GL.
const buffer=fs.readFileSync('node_modules/@expo-google-fonts/montserrat/700Bold/Montserrat_700Bold.ttf');
const font=opentype.parse(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
const alphabet=' АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789№—–-«».,:()/+&';
const area=ring=>ring.reduce((sum,p,i)=>{const next=ring[(i+1)%ring.length];return sum+p[0]*next[1]-next[0]*p[1];},0)/2;
const glyphs={};
for(const char of alphabet){
  const glyph=font.charToGlyph(char),rings=[];let ring=[],last=[0,0];
  const finish=()=>{if(ring.length>=3){if(String(ring[0])!==String(ring.at(-1)))ring.push(ring[0]);rings.push(ring);}ring=[];};
  const add=(x,y)=>{last=[x,y];ring.push([Number(x.toFixed(4)),Number(y.toFixed(4))]);};
  for(const c of glyph.getPath(0,0,1).commands){
    if(c.type==='M'){finish();add(c.x,c.y);}
    else if(c.type==='L')add(c.x,c.y);
    else if(c.type==='Q'||c.type==='C'){
      const a=last;
      for(let i=1;i<=6;i++){const t=i/6,u=1-t;
        if(c.type==='Q')add(u*u*a[0]+2*u*t*c.x1+t*t*c.x,u*u*a[1]+2*u*t*c.y1+t*t*c.y);
        else add(u*u*u*a[0]+3*u*u*t*c.x1+3*u*t*t*c.x2+t*t*t*c.x,u*u*u*a[1]+3*u*u*t*c.y1+3*u*t*t*c.y2+t*t*t*c.y);
      }
    }else if(c.type==='Z')finish();
  }
  finish();
  const direction=Math.sign(area([...rings].sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)))[0]??[]));
  const outers=rings.filter(r=>Math.sign(area(r))===direction),holes=rings.filter(r=>Math.sign(area(r))!==direction);
  const polygons=outers.length?clipping.difference(clipping.union(...outers.map(r=>[r])),...holes.map(r=>[r])):[];
  glyphs[char]={advance:Number((glyph.advanceWidth/font.unitsPerEm).toFixed(4)),polygons};
}
for(const char of alphabet.trim())if(!glyphs[char].polygons.length)throw new Error('Missing glyph: '+char);
fs.writeFileSync('src/data/mapFontOutlines.json',JSON.stringify(glyphs)+'\n');
fs.writeFileSync('src/data/mapFont.LICENSE.txt',fs.readFileSync('node_modules/@expo-google-fonts/montserrat/LICENSE_FONT','utf8').replace(/[ \t]+$/gm,''));
console.log(`Map lettering alphabet: ${Object.keys(glyphs).length} glyphs.`);

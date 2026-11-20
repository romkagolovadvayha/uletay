import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useInstalledAppMode } from '../src/hooks/useInstalledAppMode.web';

function Probe(){return React.createElement('span',null,useInstalledAppMode()?'installed':'browser');}
const windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
try {
  for(const scenario of [
    {name:'regular browser',media:false,standalone:false,expected:'browser'},
    {name:'Android/desktop installed PWA',media:true,standalone:false,expected:'installed'},
    {name:'iOS standalone app',media:false,standalone:true,expected:'installed'},
  ]) {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:scenario.media})}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{standalone:scenario.standalone}});
    assert.equal(renderToStaticMarkup(React.createElement(Probe)),`<span>${scenario.expected}</span>`,scenario.name);
  }
  console.log('Home display mode: browser download section, Android/desktop PWA and iOS standalone detection passed.');
} finally {
  if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else Reflect.deleteProperty(globalThis,'window');
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else Reflect.deleteProperty(globalThis,'navigator');
}

import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClockProvider } from '../src/context/ClockContext';
import { useNow } from '../src/hooks/useNow';

function ClockProbe() { return <time>{useNow(1000).getTime()}</time>; }
const before=Date.now();
const standalone=Number(renderToStaticMarkup(<ClockProbe/>).replace(/<[^>]*>/g,''));
assert(standalone>=before&&standalone<=Date.now(),'An isolated DOM root must render its clock without native providers');
const demoTime=new Date('2027-07-16T12:30:00+04:00');
assert.equal(renderToStaticMarkup(<ClockProvider value={()=>demoTime}><ClockProbe/></ClockProvider>),`<time>${demoTime.getTime()}</time>`,'The clock must preserve the explicit demo time across the DOM boundary');
console.log('PASS: standalone DOM clock and explicit demo time');

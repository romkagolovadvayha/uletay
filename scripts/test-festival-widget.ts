import assert from 'node:assert/strict';
import {buildFestivalWidgetData} from '../shared/festival-widget';
import type {AppData} from '../src/types';

const data={festival:{name:'Улетай',year:2027,startDate:'2027-07-07',endDate:'2027-07-11',locationShort:'Лагуново'},
  stages:[{id:'south',shortName:'Южная'}],headliners:[{id:'artist',name:'Original',vkSubtitle:'Имя артиста'}],
  schedule:[
    {id:'old',stageId:'south',headlinerId:'artist',artist:'Original',date:'2026-07-08',startTime:'20:00',endTime:'21:00'},
    {id:'night',stageId:'south',headlinerId:'artist',artist:'Original',date:'2027-07-11',startTime:'23:30',endTime:'01:00'},
    {id:'current',stageId:'south',headlinerId:'artist',artist:'Original',date:'2027-07-08',startTime:'18:00',endTime:'19:00'},
    {id:'next',stageId:'south',headlinerId:'artist',artist:'Original',date:'2027-07-08',startTime:'19:00',endTime:'20:00'},
    {id:'past',stageId:'south',headlinerId:'artist',artist:'Original',date:'2027-07-08',startTime:'16:00',endTime:'17:00'},
  ]} as AppData;
const widget=buildFestivalWidgetData(data,null,new Date('2027-07-08T14:30:00Z'));
assert.equal(widget.schemaVersion,1);
assert.equal(widget.startAt,'2027-07-07T08:00:00.000Z');
assert.equal(widget.endAt,'2027-07-12T00:00:00.000Z');
assert.deepEqual(widget.performances.map(p=>p.id),['current','next','night']);
assert.equal(widget.performances[0].artist,'Original');
assert.equal(widget.performances[0].stage,'Южная');
assert.equal(widget.performances[2].endAt,'2027-07-11T21:00:00.000Z');
assert.ok(widget.performances.every(p=>p.url==='uletay://headliners/artist'));
assert.equal(widget.weather,null);
assert.ok(!('headliners' in widget));
assert.ok(!('chat' in widget));
assert.equal(buildFestivalWidgetData({...data,schedule:[]},null).performances.length,0);
console.log('Festival widget: current year, UTC+4, overnight sets, sorting, guest payload and missing schedule PASS');

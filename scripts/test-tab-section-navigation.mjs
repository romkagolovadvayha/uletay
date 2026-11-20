import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['src/navigation/scheduleNavigation.ts'],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'navigation-test',setup(b){
 b.onResolve({filter:/^@react-navigation\/native$/},()=>({path:'navigation',namespace:'stub'}));
 b.onResolve({filter:/^\.\/linking$/},()=>({path:'linking',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:path==='navigation'?"export {CommonActions,StackActions} from '@react-navigation/routers';":"export const setHeadlinersInMoreTab=()=>{};",resolveDir:process.cwd()}));
}}]});
const module={exports:{}};new Function('require','module','exports',bundled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {createNestedTabListeners}=module.exports;
for(const [tabName,main,detail] of [['HeadlinersTab','HeadlinersMain','HeadlinerDetail'],['ScheduleTab','ScheduleMain','LiveDetail']]){
 for(const index of [0,1]){
  const actions=[];let prevented=false;
  const navigation={getState:()=>({index:0,routes:[{name:tabName,params:{screen:detail,params:{headlinerId:'hl-мельница'}},state:{key:'nested',index,routes:index?[{name:main},{name:detail}]:[{name:detail}]}}]}),navigate:(name,params)=>actions.push({type:'NAVIGATE',payload:{name,params}}),dispatch:action=>actions.push(action)};
  createNestedTabListeners(navigation,tabName).tabPress({preventDefault:()=>{prevented=true;}});
  assert.ok(prevented,'Handled section press must suppress stale detail replay');
  const root=actions.find(action=>action.type==='NAVIGATE');assert.equal(root.payload.name,tabName);assert.equal(root.payload.params.screen,main);assert.ok(!root.payload.params.params?.headlinerId);
  assert.ok(actions.some(action=>action.target==='nested'&&['RESET','POP_TO_TOP'].includes(action.type)),'Opened detail is replaced by the section list');
 }
}
console.log('Tab navigation: lineup and schedule always open their section root after normal and cold deep links.');

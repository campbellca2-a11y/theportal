import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile,stat,readFile,readdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import http from 'node:http';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const data=join(root,'work','service-test-'+Date.now());
await mkdir(data,{recursive:true});
const PORT=48834,base='http://127.0.0.1:'+PORT;
let child,lan,checks=0;
function check(value,message){assert.ok(value,message);checks++;console.log('PASS '+message)}
async function start(){
 child=spawn(process.execPath,[join(root,process.env.PORTAL_TEST_SOURCE === '1' ? 'server.mjs' : 'ThePortal.runtime.mjs')],{env:{...process.env,PORTAL_PORT:String(PORT),PORTAL_DATA_DIR:data},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let log='';child.stderr.on('data',d=>log+=d);child.stdout.on('data',d=>log+=d);
 for(let i=0;i<100;i++){try{const r=await fetch(base+'/api/health');if(r.ok)return}catch{}if(child.exitCode!==null)throw new Error(log);await new Promise(r=>setTimeout(r,100))}
 throw new Error('Test server did not start: '+log);
}
async function stop(){if(child&&child.exitCode===null){child.kill();await once(child,'exit')}}
async function req(origin,path,{cookie='',...options}={}){
 const r=await fetch(origin+path,{...options,headers:{...(cookie?{Cookie:cookie}:{}),...options.headers}});
 return r;
}
function getCookie(r){return r.headers.get('set-cookie').split(';')[0]}
const hash=b=>createHash('sha256').update(b).digest('hex');
try{
 await start();
 check((await req(base,'/')).status===200,'built portal page is served');
 check((await req(base,'/api/items')).status===401,'unpaired inbox is blocked');
 let r=await req(base,'/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({local:true})});
 const pc=getCookie(r);check(r.status===200,'PC connects through loopback');
 const info=await(await req(base,'/api/info',{cookie:pc})).json();
 lan=info.address;check(!!lan&&!!info.pair.code&&info.pair.qr.startsWith('data:image/png;base64,'),'local pairing code and QR are generated');
 r=await req(lan,'/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({local:true})});
 check(r.status===401,'LAN client cannot use local bootstrap');
 r=await req(lan,'/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:info.pair.code})});
 const phone=getCookie(r);check(r.status===200,'separate LAN client pairs with code');
 const phoneInfo=await(await req(lan,'/api/info',{cookie:phone})).json();
 check(phoneInfo.local===false&&!phoneInfo.pair,'LAN client does not receive pairing secrets');
 const file=Buffer.from('iPhone to PC and back \u{1f4f7}\n'.repeat(2400));
 r=await req(lan,'/api/items',{method:'POST',cookie:phone,headers:{'Content-Type':'image/heic','X-File-Name':encodeURIComponent('picture 📷.heic')},body:file});
 const uploaded=await r.json();check(r.status===201&&uploaded.size===file.length,'phone-side upload is committed');
 let list=await(await req(base,'/api/items',{cookie:pc})).json();
 check(list.items.some(i=>i.id===uploaded.id),'PC sees the phone-side item');
 const downloaded=Buffer.from(await(await req(base,'/api/items/'+uploaded.id+'/file?download=1',{cookie:pc})).arrayBuffer());
 check(hash(downloaded)===hash(file),'PC download matches every original byte');
 r=await req(base,'/api/items',{method:'POST',cookie:pc,headers:{'Content-Type':'application/octet-stream','X-File-Name':'same-name.bin'},body:Buffer.from([0,1,2,255])});
 const other=await r.json();
 r=await req(lan,'/api/items/'+other.id+'/file?download=1',{cookie:phone});
 check(r.status===200&&Buffer.from(await r.arrayBuffer()).equals(Buffer.from([0,1,2,255])),'PC upload is retrievable by the LAN client');
 check((await req(lan,'/api/items/'+other.id+'/file')).status===401,'unpaired direct download is blocked');
 check((await req(base,'/api/items',{cookie:pc,headers:{Origin:'https://example.invalid'}})).status===403,'cross-origin access is blocked');
 r=await req(base,'/api/items',{method:'POST',cookie:pc,headers:{'Content-Type':'text/html','X-File-Name':encodeURIComponent('../<script>.html')},body:'<script>alert(1)</script>'});
 const html=await r.json();r=await req(lan,'/api/items/'+html.id+'/file',{cookie:phone});
 check(r.headers.get('content-type')==='application/octet-stream'&&r.headers.get('content-disposition').startsWith('attachment;'),'active uploaded content is forced to download');
 check(!html.name.includes('/'),'unsafe filename separators are normalized');
 r=await req(base,'/api/items',{method:'POST',cookie:pc,headers:{'Content-Type':'application/octet-stream','X-File-Name':'empty.txt'},body:Buffer.alloc(0)});
 check(r.status===201,'empty files are supported');
 const oversized=await new Promise((resolve,reject)=>{
  const q=http.request(base+'/api/items',{method:'POST',headers:{Cookie:pc,'Content-Length':104857601}},r=>{r.resume();resolve(r.statusCode)});q.on('error',reject);q.end();
 });
 check(oversized===413,'oversized upload is rejected before reading file bytes');
 await stop();
 const interrupted=randomUUID(),orphan=randomUUID(),damaged=randomUUID();
 await writeFile(join(data,'items',interrupted+'.part'),'incomplete');
 await writeFile(join(data,'items',orphan+'.bin'),'never committed');
 await writeFile(join(data,'items',damaged+'.json'),'{bad');
 await writeFile(join(data,'items',damaged+'.bin'),'preserve me');
 await start();
 list=await(await req(lan,'/api/items',{cookie:phone})).json();
 check(list.items.some(i=>i.id===uploaded.id),'completed uploads and pairing survive restart');
 check(!await stat(join(data,'items',interrupted+'.part')).catch(()=>null)&&!await stat(join(data,'items',orphan+'.bin')).catch(()=>null),'interrupted uncommitted files are cleaned on restart');
 check(!!await stat(join(data,'items',damaged+'.bin')).catch(()=>null),'damaged record does not block startup and is preserved');
 check(hash(Buffer.from(await(await req(lan,'/api/items/'+uploaded.id+'/file',{cookie:phone})).arrayBuffer()))===hash(file),'original file remains intact after restart');
 r=await req(lan,'/api/items/'+uploaded.id,{method:'DELETE',cookie:phone});
 check(r.status===200&&(await req(base,'/api/items/'+uploaded.id+'/file',{cookie:pc})).status===404,'removing a portal copy updates both clients');
 const beforeReset=await(await req(base,'/api/items',{cookie:pc})).json();
 check(beforeReset.tally.count===4&&beforeReset.tally.total===4,'successful transfers counted once and deletion does not reduce tally');
 check((await req(base,'/api/tally/reset',{method:'POST'})).status===401,'unpaired tally reset is blocked');
 r=await req(lan,'/api/tally/reset',{method:'POST',cookie:phone});
 const reset=await r.json();
 const afterReset=await(await req(base,'/api/items',{cookie:pc})).json();
 check(reset.tally.count===0&&reset.tally.total===4&&afterReset.tally.count===0,'reset reaches every client without changing total');
 check(afterReset.items.length===beforeReset.items.length,'reset preserves every stored file');
 const parallel=await Promise.all(Array.from({length:6},(_,i)=>req(i%2?base:lan,'/api/items',{method:'POST',cookie:i%2?pc:phone,headers:{'Content-Type':'text/plain','X-File-Name':'concurrent-'+i+'.txt'},body:'concurrent transfer '+i})));
 check(parallel.every(p=>p.status===201),'concurrent uploads all complete');
 const parallelItems=await Promise.all(parallel.map(p=>p.json()));
 check(new Set(parallelItems.map(p=>p.sequence)).size===6,'concurrent transfers receive distinct commit sequence numbers');
 const together=await(await req(base,'/api/items',{cookie:pc})).json();
 check(together.tally.total===10&&together.tally.count===6,'shared tally remains exact across concurrent clients');
 const [resetDuring,uploadDuring]=await Promise.all([req(base,'/api/tally/reset',{method:'POST',cookie:pc}),req(lan,'/api/items',{method:'POST',cookie:phone,headers:{'Content-Type':'text/plain','X-File-Name':'during-reset.txt'},body:'arrives during reset'})]);
 const resetDuringValue=await resetDuring.json(),uploadDuringValue=await uploadDuring.json();
 const afterRace=await(await req(base,'/api/items',{cookie:pc})).json();
 check(afterRace.tally.total===11&&afterRace.tally.count===11-resetDuringValue.tally.total,'simultaneous reset and upload are serialized correctly');
 const finalCount=afterRace.tally.count;
 await stop();await start();
 const restored=await(await req(base,'/api/items',{cookie:pc})).json();
 check(restored.tally.total===11&&restored.tally.count===finalCount,'tally and reset survive a server restart');
 await stop();
 const recoveryTally=JSON.parse(await readFile(join(data,'tally.json'),'utf8'));
 recoveryTally.total=10;recoveryTally.resetTotal=Math.min(recoveryTally.resetTotal,10);
 await writeFile(join(data,'tally.json'),JSON.stringify(recoveryTally));
 await start();
 const recovered=await(await req(base,'/api/items',{cookie:pc})).json();
 check(recovered.tally.total===11,'completed metadata recovers an interrupted tally write');
 await stop();await writeFile(join(data,'tally.json'),'{bad');await start();
 check((await req(base,'/api/items',{cookie:pc})).status===200,'damaged tally does not block existing files');
 check((await readdir(data)).some(name=>name.startsWith('tally-recovery-')),'damaged tally is preserved for recovery');
 for(let i=0;i<5;i++)await req(lan,'/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"code":"bad"}'});
 r=await req(lan,'/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"code":"bad"}'});
 check(r.status===429,'pairing retries are rate limited');
 console.log('All '+checks+' API checks passed. This automated run does not test a physical phone or browser UI.');
 await writeFile(join(root,'work','service-test-result.json'),JSON.stringify({passed:checks,physicalIPhoneTested:false,browserUITested:false,date:new Date().toISOString()},null,2));
}finally{await stop()}

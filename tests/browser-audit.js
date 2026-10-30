async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:1440,height:1000}});const p=await context.newPage();const failures=[],passed=[];p.on('dialog',d=>d.accept());p.on('pageerror',e=>failures.push('Runtime: '+e.message));
 await p.route('**/src/context/IdentityContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:"export function IdentityProvider({children}){return children;}export const useIdentity=()=>({identity:'3zab',isUnlocked:true,authLoading:false,toggleIdentity(){},setIdentity(){},logout:async()=>{}});"}));
 await p.route('**/src/context/ArchiveContext.tsx*',r=>r.fulfill({contentType:'application/javascript',body:"export function ArchiveProvider({children}){return children;}export const useArchive=()=>({});export const saveArchive=async(value)=>{window.__audit.operations.push({op:'settings',value})};"}));
 await p.route('**/src/lib/store.ts*',r=>r.fulfill({contentType:'application/javascript',body:"export * from '/tests/browser-fixture.js';"}));
 await p.goto('http://localhost:5174/');await p.getByRole('heading',{name:'Memories Scrapbook Wall'}).waitFor();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ZcAAAAASUVORK5CYII=','base64');
 async function fill(dialog,marker){for(const input of await dialog.locator('input,textarea').all()){const type=await input.getAttribute('type');if(type==='file'||type==='hidden')continue;const placeholder=await input.getAttribute('placeholder')||'';const isUrl=type==='url'||placeholder.includes('https://');await input.fill(type==='number'?'2':type==='datetime-local'?'2027-09-04T12:00':type==='date'?'2027-09-04':isUrl?'https://example.com/a.jpg':marker);}const files=dialog.locator('input[type=file]');if(await files.count()){await files.first().setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await dialog.locator('img').last().waitFor();}}
 async function submit(dialog){await dialog.locator('button[type=submit]').click();await dialog.waitFor({state:'hidden'});}
 const specs=[
 {id:'our-story',name:'milestones',add:'Add Milestone',edit:'Edit Milestone',del:'Delete Milestone'},
 {id:'memories',name:'memories',add:'Add Memory',edit:'Edit Memory',del:'Delete Memory'},
 {id:'soundtrack',name:'songs',add:'Add Song',edit:'Edit Song',del:'Delete Song'},
 {id:'why-i-love-you',name:'loveReasons',add:'Add a Reason',edit:'Edit Reason',del:'Delete Reason'},
 {id:'letters',name:'letters',add:'Write a Letter',read:true},
 {id:'open-when',name:'openWhen',add:'Add Open When Letter',read:true},
 {id:'things-21',name:'things21',add:'Add Item',edit:'Edit Item',del:'Delete Item'},
 {id:'favorites',name:'favorites',add:'Add Favorite',edit:'Edit favorite',del:'Delete favorite'},
 {id:'our-future',name:'futureDreams',add:'Add Dream',edit:'Edit dream',del:'Delete dream'},
 ];
 for(const spec of specs){try{const section=p.locator('#'+spec.id);const before=await p.evaluate(name=>window.__audit.data[name].length,spec.name);await section.getByRole('button',{name:spec.add,exact:true}).click();let dialog=p.getByRole('dialog').last();await fill(dialog,'Audit added '+spec.name);if(spec.name==='memories')await dialog.getByRole('combobox',{name:'Save this memory to'}).selectOption('gallery');await submit(dialog);await p.waitForFunction(({name,before})=>window.__audit.data[name].length===before+1,{name:spec.name,before});passed.push(spec.name+': add');if(spec.read){await section.getByRole('heading',{name:'Audit added '+spec.name,exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:/Edit/}).click();}else await section.getByRole('button',{name:spec.edit,exact:true}).first().click();dialog=p.getByRole('dialog').last();await fill(dialog,'Audit edited '+spec.name);await submit(dialog);const updated=await p.evaluate(name=>window.__audit.operations.some(x=>x.name===name&&x.op==='update'),spec.name);if(!updated)throw Error('Update not recorded');passed.push(spec.name+': edit');if(spec.read){await section.getByRole('heading',{name:'Audit edited '+spec.name,exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:/Delete/}).click();}else await section.getByRole('button',{name:spec.del,exact:true}).first().click();await p.waitForFunction(({name,before})=>window.__audit.data[name].length===before,{name:spec.name,before});passed.push(spec.name+': delete');}catch(error){failures.push(spec.name+': '+error.message.slice(0,350));await p.keyboard.press('Escape');}}
 return {passed,failures,operations:await p.evaluate(()=>window.__audit.operations.map(x=>({op:x.op,name:x.name}))) };
}


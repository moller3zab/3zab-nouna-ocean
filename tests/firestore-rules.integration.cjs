const {test,before,after}=require('node:test');
const fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,getDoc,serverTimestamp}=require('firebase/firestore');
const assert=require('node:assert/strict');
const one='EJ9SoDzXCLgHBgXglBU703ZOcXH2',two='NJRJQyKj7JbSVBQeAYbKUOm8vcY2';let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-ocean-free',firestore:{host:'127.0.0.1',port:8089,rules:fs.readFileSync('firestore.rules','utf8')}});});
after(async()=>{await env.cleanup();});
const meta=(uid,media='none')=>({uid,eventId:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',at:serverTimestamp(),media});
test('only allowlisted accounts write; forged creator UID and fixed timestamps fail',async()=>{
 const db=env.authenticatedContext(one).firestore();
 await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'messages/anonymous'),{text:'No'}));
 await assertFails(setDoc(doc(db,'messages/forged'),{sender:'Nouna',text:'No',pushMeta:meta(two)}));
 await assertFails(setDoc(doc(db,'messages/old-clock'),{sender:'Nouna',text:'No',pushMeta:{...meta(one),at:new Date(0)}}));
 await assertSucceeds(setDoc(doc(db,'messages/valid'),{sender:'Nouna',text:'Real saved message',pushMeta:meta(one)}));
 assert.equal((await getDoc(doc(db,'messages/valid'))).data().pushMeta.uid,one);
});
test('metadata proves actual saved media presence, not a client event label',async()=>{
 const db=env.authenticatedContext(one).firestore();
 await assertFails(setDoc(doc(db,'memories/pretend-photo'),{title:'Us',pushMeta:meta(one,'photo')}));
 await assertSucceeds(setDoc(doc(db,'memories/real-photo'),{title:'Us',imageUrl:'data:image/jpeg;base64,private',pushMeta:meta(one,'photo')}));
 await assertFails(setDoc(doc(db,'memories/pretend-video'),{title:'Us',imageUrl:'photo',pushMeta:meta(one,'video')}));
});
test('legacy records remain readable/editable, but changed attribution must match current writer',async()=>{
 const a=env.authenticatedContext(one).firestore(),b=env.authenticatedContext(two).firestore();
 await assertSucceeds(setDoc(doc(a,'letters/legacy'),{author:'3zab',recipient:'Nouna',message:'Original'}));
 await assertSucceeds(updateDoc(doc(b,'letters/legacy'),{message:'Edited by an authorized member'}));
 await assertFails(updateDoc(doc(b,'letters/legacy'),{pushMeta:meta(one)}));
 await assertSucceeds(updateDoc(doc(b,'letters/legacy'),{pushMeta:meta(two)}));
 await assertSucceeds(getDoc(doc(a,'letters/legacy')));
});

test('Firestore attestation uses request time, which can precede commit time',async()=>{
 const response=await fetch('http://127.0.0.1:8089/v1/projects/demo-ocean-free/databases/(default)/documents/messages/valid',{headers:{Authorization:'Bearer owner'}});
 assert.equal(response.status,200);const saved=await response.json();assert.ok(Date.parse(saved.fields.pushMeta.mapValue.fields.at.timestampValue)<=Date.parse(saved.updateTime));
});

test('protected records require fresh authenticated attribution on every edit',async()=>{
 const a=env.authenticatedContext(one).firestore(),b=env.authenticatedContext(two).firestore();
 await assertFails(updateDoc(doc(a,'messages/valid'),{text:'No fresh metadata'}));
 await assertFails(updateDoc(doc(b,'messages/valid'),{text:'Trying to retain original sender metadata'}));
 await assertSucceeds(updateDoc(doc(b,'messages/valid'),{text:'Actual current writer',pushMeta:meta(two)}));
});

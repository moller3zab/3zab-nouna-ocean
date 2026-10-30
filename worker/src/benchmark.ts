import { SignJWT, importPKCS8, exportJWK, importJWK, jwtVerify } from 'jose';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import type { Env } from './env';
import { APIError, b64, hash } from './core';
import { vapid } from './registry';
export async function benchmark(request:Request,env:Env){
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 if(!env.BENCHMARK_TOKEN||token.length>100||await hash(token)!==await hash(env.BENCHMARK_TOKEN))throw new APIError(403,'Administrator benchmark authorization required.');
 // Synthetic data only. This route NEVER sends to a push service or accesses user documents.
 const service=JSON.parse(env.FIREBASE_READER_JSON);
 const privateKey=await importPKCS8(service.private_key,'RS256',{extractable:true});
 const jwt=await new SignJWT({test:true}).setProtectedHeader({alg:'RS256'}).setIssuedAt().setExpirationTime('1m').sign(privateKey);
 const rsa=await exportJWK(privateKey);const publicKey=await importJWK({kty:'RSA',n:rsa.n,e:rsa.e},'RS256');
 await jwtVerify(jwt,publicKey,{algorithms:['RS256']});
 const ec=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']) as CryptoKeyPair;
 const raw=await crypto.subtle.exportKey('raw',ec.publicKey);if(!(raw instanceof ArrayBuffer))throw new Error('Unexpected EC key format');
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-benchmark-never-sent',expirationTime:null,keys:{p256dh:b64(new Uint8Array(raw)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}};
 const payload=await buildPushPayload({data:{kind:'benchmark',body:'Synthetic content only'},options:{ttl:60}},subscription,vapid(env));
 return {synthetic:true,delivered:false,encryptedBytes:(await new Response(payload.body).arrayBuffer()).byteLength,externalSubrequests:0};
}

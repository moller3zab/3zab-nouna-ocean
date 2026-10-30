import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { APIError, PROJECT, member } from './core';
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),{cacheMaxAge:3600000,cooldownDuration:30000,timeoutDuration:5000});
export async function authenticate(token: string, key: JWTVerifyGetKey = googleKeys) {
 try {
  const {payload,protectedHeader}=await jwtVerify(token,key,{issuer:`https://securetoken.google.com/${PROJECT}`,audience:PROJECT,algorithms:['RS256'],clockTolerance:5,requiredClaims:['exp','iat','sub','auth_time']});
  if(protectedHeader.alg!=='RS256'||!protectedHeader.kid||typeof payload.sub!=='string'||payload.sub.length>128||typeof payload.iat!=='number'||payload.iat>Date.now()/1000+5||typeof payload.auth_time!=='number'||payload.auth_time>Date.now()/1000+5)throw Error();
  member(payload.sub);return {uid:payload.sub,name:typeof payload.name==='string'?payload.name:'Your partner'};
 }catch{throw new APIError(401,'Sign in again with an authorized Firebase account.');}
}

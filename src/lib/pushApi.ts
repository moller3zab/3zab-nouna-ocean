import { getAuth } from 'firebase/auth';
import app from './firebase';
const paths: Record<string,string> = {getWebPushConfig:'/config',beginWebPush:'/subscriptions/begin',confirmWebPush:'/subscriptions/confirm',updateWebPush:'/subscriptions/update',notifyEvent:'/events'};
export async function pushRequest<T>(name:string,data:unknown={}):Promise<T> {
  const base=import.meta.env.VITE_PUSH_API_URL || 'https://ocean-free-push.mollerahmed5.workers.dev';
  if(!base)throw new Error('Notification service has not been configured for this build.');
  const user=getAuth(app).currentUser;if(!user)throw new Error('Sign in to manage notifications.');
  const uid=user.uid, token=await user.getIdToken();
  const response=await fetch(base.replace(/\/$/,'')+paths[name],{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result.error||'Notification request failed.'),{status:response.status});
  if(getAuth(app).currentUser?.uid!==uid)throw new Error('Your account changed.');
  return result as T;
}

const enc=new TextEncoder();
export const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async value=>hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));
const unhex=value=>new Uint8Array(value.match(/../g).map(x=>parseInt(x,16)));
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
async function derive(password,salt,pepper){const hmac=await crypto.subtle.importKey('raw',enc.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);const material=await crypto.subtle.sign('HMAC',hmac,enc.encode(password));const key=await crypto.subtle.importKey('raw',material,'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-512',salt:unhex(salt),iterations:100000},key,256))}
export async function hashPassword(password,pepper){if(typeof pepper!=='string'||pepper.length<32)throw new Error('AUTH_NOT_CONFIGURED');const salt=randomToken();return `v1$${salt}$${await derive(password,salt,pepper)}`}
export async function verifyPassword(password,stored,pepper){if(typeof pepper!=='string'||pepper.length<32)return false;const [version,salt,hash]=String(stored).split('$');if(version!=='v1'||!/^[a-f0-9]{64}$/.test(salt)||!/^[a-f0-9]{64}$/.test(hash))return false;return equal(await derive(password,salt,pepper),hash)}
export const normalizeEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
export const validEmail=value=>value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const validPassword=value=>typeof value==='string'&&value.length>=12&&value.length<=128;

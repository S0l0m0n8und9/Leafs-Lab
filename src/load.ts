import { validateBundle } from './data.js';
import type { Bundle } from './data.js';
export async function loadBundle(fetcher:typeof fetch,signal?:AbortSignal):Promise<Bundle> {
 let response:Response;
 try { response=await fetcher('/data/leafs-lab.json',{signal}); }
 catch(error:unknown) { throw new Error(`Fetch error: ${signal?.aborted?'snapshot request interrupted or timed out':error instanceof Error?error.message:'snapshot unavailable'}.`); }
 if(!response.ok)throw new Error(`Fetch error: snapshot unavailable (HTTP ${response.status}).`);
 let value:unknown;
 try { value=await response.json(); } catch { throw new Error('Invalid schema: snapshot is not valid JSON.'); }
 return validateBundle(value);
}

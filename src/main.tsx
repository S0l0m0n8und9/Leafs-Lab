import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import { loadBundle } from './load.js';
import type { Bundle } from './data.js';
import './styles.css';
function Root() {
 const [bundle,setBundle]=useState<Bundle|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),15000);loadBundle(fetch,controller.signal).then(data=>{if(active)setBundle(data);}).catch((e:unknown)=>{if(active)setError(e instanceof Error?e.message:'Fetch error: snapshot could not be read.');}).finally(()=>window.clearTimeout(timer));return ()=>{active=false;controller.abort();window.clearTimeout(timer);};},[]);
 return bundle?<App bundle={bundle}/>:<div className="load-screen"><div className="brand">Leafs Lab</div><p className="eyebrow">DATA STATUS UNCONFIRMED</p><h1>{error?'Snapshot unavailable':'Opening the lab…'}</h1><p role={error?'alert':'status'}>{error||'Loading and validating the published data snapshot.'}</p>{error&&<button onClick={()=>window.location.reload()}>Try again</button>}<p>No statistics are shown until the schema is validated.</p></div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Root/></StrictMode>);

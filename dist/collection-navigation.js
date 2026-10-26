export function collectionPath(category='Alle',query='') {
  const path=category==='Alle'?'/collections':'/collections/'+encodeURIComponent(category);
  const params=new URLSearchParams();if(query)params.set('q',query);
  return path+(params.size?'?'+params:'');
}
export function collectionReturn(value,category='Alle') {
  try {
    if(typeof value==='string'&&value.startsWith('/')) {
      const url=new URL(value,'https://shop.neonmind-ai.com');
      if(url.origin==='https://shop.neonmind-ai.com'&&/^\/collections(?:\/[^/]+)?\/?$/.test(url.pathname)&&!url.hash)return url.pathname+url.search;
    }
  } catch {}
  return collectionPath(category);
}


/* Enhanced all-episodes.js — keeps posters and lists episodes only (typed Episode),
   but now series meta can be extended similarly if desired later.
*/
(function(){
  const ONTO = "https://jahid1081.github.io/ties4520-ontology/ontology.ttl#";
  const IND  = "https://jahid1081.github.io/ties4520-ontology/individuals.ttl#";
  const RDF  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  const RDFS = "http://www.w3.org/2000/01/rdf-schema#";

  const { DataFactory, Parser, Store } = N3;
  const { namedNode } = DataFactory;

  async function loadStore(ttlUrl){
    const txt = await (await fetch(ttlUrl,{cache:"no-store"})).text();
    const store=new Store(); store.addQuads(new Parser().parse(txt)); return store;
  }
  function q(store, s,p,o){ return store.getQuads(s?namedNode(s):null, p?namedNode(p):null, o?namedNode(o):null, null); }
  function getOne(store, s,p){ const r=q(store,s,p,null); return r.length?r[0].object:null; }
  function str(t){ return t?(t.termType==='NamedNode'?t.id:t.value):null; }
  function localName(iri){ try{ return iri.split('#').pop(); }catch(_){ return iri; } }
  function labelOf(store, iri){ const o=getOne(store, iri, RDFS+'label'); return str(o)||localName(iri); }
  function extractSE(local){ const m=local.match(/_S(\d+)_E(\d+)$/); return m?{s:+m[1],e:+m[2]}:{s:null,e:null}; }
  function chip(txt){ const s=document.createElement('span'); s.className='chip'; s.textContent=txt; return s; }
  function makeViewerLink(src, iri){ const u=new URL('viewer.xhtml',location.href); u.searchParams.set('src',src); u.searchParams.set('iri',iri); return u.href; }

  function seriesMeta(store, iri){
    const poster = str(getOne(store, iri, ONTO+'poster'));
    const w=document.createElement('div'); w.className='section-top';
    const ph=document.createElement('div'); ph.className='poster';
    const img=document.createElement('img'); img.alt='Poster'; if(poster) img.src=poster; ph.appendChild(img);
    w.appendChild(ph);
    const meta=document.createElement('div'); meta.className='series-meta';
    const r1=document.createElement('div'); r1.className='row';
    const l1=document.createElement('div'); l1.className='label'; l1.textContent='IRI:';
    const v1=document.createElement('div'); v1.className='value'; const code=document.createElement('code'); code.textContent=localName(iri); v1.appendChild(code);
    r1.append(l1,v1); meta.appendChild(r1);
    const r2=document.createElement('div'); r2.className='row';
    const l2=document.createElement('div'); l2.className='label'; l2.textContent='Label:';
    const v2=document.createElement('div'); v2.className='value'; v2.textContent=labelOf(store, iri);
    r2.append(l2,v2); meta.appendChild(r2);
    w.appendChild(meta);
    return w;
  }

  async function renderAllSeriesAndEpisodes(ttlUrl, containerId, countBadgeId){
    const mount=document.getElementById(containerId);
    const store=await loadStore(ttlUrl);
    const seriesList = q(store, null, RDF+'type', ONTO+'Series').map(q=>q.subject.id);
    if(countBadgeId){ const el=document.getElementById(countBadgeId); if(el) el.textContent = seriesList.length + ' series'; }

    for(const sIri of seriesList){
      const sec=document.createElement('section'); sec.className='section';
      const h=document.createElement('h2'); h.textContent=labelOf(store, sIri); sec.appendChild(h);
      sec.appendChild(seriesMeta(store, sIri));

      // episodes only
      const list=document.createElement('div'); list.className='list';
      const eps = q(store, null, ONTO+'partOfSeries', sIri).map(q=>q.subject.id)
        .filter(iri => q(store, iri, RDF+'type', ONTO+'Episode').length>0)
        .map(iri=>({iri, local:localName(iri), se:extractSE(localName(iri))}))
        .sort((a,b)=>(a.se.s??1e6)-(b.se.s??1e6) || (a.se.e??1e6)-(b.se.e??1e6));
      let cur=null;
      eps.forEach(e=>{
        if(e.se.s!==cur){ cur=e.se.s; const g=document.createElement('div'); g.className='item group'; g.textContent='Season '+String(cur||0).padStart(2,'0'); list.appendChild(g); }
        const left=document.createElement('div'); left.textContent=(e.se.s!=null&&e.se.e!=null)?`S${String(e.se.s).padStart(2,'0')} - E${String(e.se.e).padStart(2,'0')}`:e.local;
        const air=getOne(store, e.iri, ONTO+'airDate'); if(air) left.appendChild(chip(str(air)));
        const row=document.createElement('div'); row.className='item'; row.appendChild(left);
        const open=document.createElement('a'); open.className='btn small'; open.href=makeViewerLink(ttlUrl, e.iri); open.textContent='Open';
        row.appendChild(open); list.appendChild(row);
      });

      sec.appendChild(list); mount.appendChild(sec);
    }
  }

  window.renderAllSeriesAndEpisodes = renderAllSeriesAndEpisodes;
})();

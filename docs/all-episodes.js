
/* all-episodes.js (Season-0 fix) — only list onto:Episode */
(function(){
  const ONTO = "https://jahid1081.github.io/ties4520-ontology/ontology.ttl#";
  const IND  = "https://jahid1081.github.io/ties4520-ontology/individuals.ttl#";
  const RDF  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  const RDFS = "http://www.w3.org/2000/01/rdf-schema#";

  const { DataFactory, Parser, Store } = N3;
  const { namedNode } = DataFactory;

  async function loadStore(ttlUrl){
    const text = await (await fetch(ttlUrl, {cache:"no-store"})).text();
    const store = new Store();
    const parser = new Parser();
    store.addQuads(parser.parse(text));
    return store;
  }
  function getOne(store, s, p){
    const q = store.getQuads(namedNode(s), namedNode(p), null, null);
    return q.length ? q[0].object : null;
  }
  function str(obj){ return obj ? (obj.termType==='NamedNode'?obj.id:obj.value) : null; }
  function localName(iri){ try{ return iri.split('#').pop(); }catch(e){ return iri; } }
  function titleCase(s){ return (s||'').replace(/[_\-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
  function chip(t){ const s=document.createElement('span'); s.className='chip'; s.textContent=t; return s; }
  function extractSE(local){ const m=local.match(/_S(\d+)_E(\d+)$/); return m?{season:+m[1],episode:+m[2]}:{season:null,episode:null}; }
  function makeViewerLink(src, iri){ const u=new URL('viewer.xhtml',location.href); u.searchParams.set('src',src); u.searchParams.set('iri',iri); return u.href; }

  function section(title){
    const sec=document.createElement('section'); sec.className='section';
    const h2=document.createElement('h2'); h2.textContent=title; sec.appendChild(h2);
    return sec;
  }

  async function renderAllSeriesAndEpisodes(ttlUrl, containerId, countBadgeId){
    const mount=document.getElementById(containerId);
    const store=await loadStore(ttlUrl);

    const seriesList = store.getQuads(null, namedNode(RDF+'type'), namedNode(ONTO+'Series'), null).map(q=>q.subject.id);
    if(countBadgeId){ const b=document.getElementById(countBadgeId); if(b) b.textContent = seriesList.length + ' series'; }

    for(const seriesIRI of seriesList){
      const label = str(getOne(store, seriesIRI, RDFS+'label')) || titleCase(localName(seriesIRI.replace(IND,'')));
      const sec = section(label);

      const poster=str(getOne(store, seriesIRI, ONTO+'poster'));
      const top=document.createElement('div'); top.className='section-top';
      const posterWrap=document.createElement('div'); posterWrap.className='poster';
      const img=document.createElement('img'); img.alt='Poster'; if(poster) img.src=poster; posterWrap.appendChild(img);
      top.appendChild(posterWrap);
      const meta=document.createElement('div'); meta.className='series-meta';
      const r1=document.createElement('div'); r1.className='row';
      const L1=document.createElement('div'); L1.className='label'; L1.textContent='IRI:';
      const V1=document.createElement('div'); V1.className='value'; const code=document.createElement('code'); code.textContent=localName(seriesIRI); V1.appendChild(code);
      r1.append(L1,V1); meta.appendChild(r1);
      const r2=document.createElement('div'); r2.className='row';
      const L2=document.createElement('div'); L2.className='label'; L2.textContent='Label:';
      const V2=document.createElement('div'); V2.className='value'; V2.textContent=label;
      r2.append(L2,V2); meta.appendChild(r2);
      top.appendChild(meta);
      sec.appendChild(top);

      const list=document.createElement('div'); list.className='list';

      const candidates = store.getQuads(null, namedNode(ONTO+'partOfSeries'), namedNode(seriesIRI), null).map(q=>q.subject.id);
      const epSubjects = candidates.filter(iri => store.getQuads(namedNode(iri), namedNode(RDF+'type'), namedNode(ONTO+'Episode'), null).length>0);

      const eps = epSubjects.map(iri=>({iri, local:localName(iri), se:extractSE(localName(iri))}))
        .sort((a,b)=> (a.se.season??1e6) - (b.se.season??1e6) || (a.se.episode??1e6) - (b.se.episode??1e6));

      let current=null;
      eps.forEach(e=>{
        if(e.se.season!==current){
          current=e.se.season;
          const g=document.createElement('div'); g.className='item group';
          g.textContent = 'Season ' + String(current||0).padStart(2,'0');
          list.appendChild(g);
        }
        const row=document.createElement('div'); row.className='item';
        const left=document.createElement('div');
        left.textContent = (e.se.season!=null && e.se.episode!=null)
          ? `S${String(e.se.season).padStart(2,'0')} - E${String(e.se.episode).padStart(2,'0')}` : e.local;
        const air=str(getOne(store, e.iri, ONTO+'airDate')); if(air) left.appendChild(chip(air));
        row.appendChild(left);
        const open=document.createElement('a'); open.className='btn small'; open.href=makeViewerLink(ttlUrl, e.iri); open.textContent='Open';
        row.appendChild(open);
        list.appendChild(row);
      });

      sec.appendChild(list);
      mount.appendChild(sec);
    }
  }

  window.renderAllSeriesAndEpisodes = renderAllSeriesAndEpisodes;
})();

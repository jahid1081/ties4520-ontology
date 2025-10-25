
/* series-page.js (Season-0 fix) — show only resources typed onto:Episode */
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
  function getAll(store, s, p){
    return store.getQuads(namedNode(s), namedNode(p), null, null).map(q => q.object);
  }
  function str(obj){ return obj ? (obj.termType === "NamedNode" ? obj.id : obj.value) : null; }
  function localName(iri){ try{ return iri.split('#').pop(); }catch(e){ return iri; } }
  function titleCase(s){ return (s||'').replace(/[_\-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
  function chip(text){ const s=document.createElement('span'); s.className='chip'; s.textContent=text; return s; }
  function row(label, node){
    const r=document.createElement('div'); r.className='row';
    const l=document.createElement('div'); l.className='label'; l.textContent=label;
    const v=document.createElement('div'); v.className='value'; v.appendChild(node);
    r.append(l,v); return r;
  }
  function itemRow(leftNode, openHref){
    const row=document.createElement('div'); row.className='item';
    row.appendChild(leftNode);
    const a=document.createElement('a'); a.className='btn small'; a.href=openHref; a.textContent='Open';
    row.appendChild(a);
    return row;
  }
  function groupHeader(text){ const g=document.createElement('div'); g.className='item group'; g.textContent=text; return g; }
  function makeViewerLink(src, iri){ const u=new URL('viewer.xhtml', location.href); u.searchParams.set('src',src); u.searchParams.set('iri',iri); return u.href; }
  function extractSE(local){ const m=local.match(/_S(\d+)_E(\d+)$/); return m?{season:+m[1],episode:+m[2]}:{season:null,episode:null}; }

  async function renderSeriesFull(ttlUrl, key, topId, listId){
    const store=await loadStore(ttlUrl);
    const seriesIRI=IND + 'Series_' + key;

    // Poster + label + showrunners...
    const poster=str(getOne(store, seriesIRI, ONTO+'poster'));
    const label=str(getOne(store, seriesIRI, RDFS+'label')) || titleCase(key.replace(/_/g,' '));
    const posterWrap=document.getElementById(topId);
    const pDiv=document.createElement('div'); pDiv.className='poster';
    const img=document.createElement('img'); img.alt='Poster'; if(poster) img.src=poster; pDiv.appendChild(img);
    const meta=document.createElement('div'); meta.className='series-meta';
    const code=document.createElement('code'); code.textContent=localName(seriesIRI);
    meta.appendChild(row('IRI:',code));
    const lblSpan=document.createElement('span'); lblSpan.textContent=label;
    meta.appendChild(row('Label:',lblSpan));
    const runners=document.createElement('div'); runners.className='chips';
    getAll(store, seriesIRI, ONTO+'hasShowrunner').forEach(p=>{
      const nm=str(getOne(store, str(p), RDFS+'label')) || titleCase(localName(str(p)));
      runners.appendChild(chip(nm));
    });
    meta.appendChild(row('Showrunner(s):', runners));
    const linkWrap=document.createElement('div'); linkWrap.className='chips';
    const rl=str(getOne(store, seriesIRI, ONTO+'relatedLink'));
    linkWrap.appendChild(chip(rl ? 'Open' : '—')); if(rl){ const a=linkWrap.querySelector('.chip'); a.onclick=()=>{window.open(rl,'_blank','noopener');}; }
    meta.appendChild(row('Link:', linkWrap));
    posterWrap.append(pDiv, meta);

    // EPISODES — only onto:Episode
    const epSubjects = store.getQuads(null, namedNode(ONTO+'partOfSeries'), namedNode(seriesIRI), null)
      .map(q=>q.subject.id)
      .filter(iri => store.getQuads(namedNode(iri), namedNode(RDF+'type'), namedNode(ONTO+'Episode'), null).length>0);

    const eps = epSubjects.map(iri=>({iri, local:localName(iri), se:extractSE(localName(iri))}))
      .sort((a,b)=> (a.se.season??1e6) - (b.se.season??1e6) || (a.se.episode??1e6) - (b.se.episode??1e6));

    const list=document.getElementById(listId);
    let current=null;
    eps.forEach(e=>{
      const season = e.se.season;
      if(season!==current){
        current=season;
        list.appendChild(groupHeader('Season '+ String(season||0).padStart(2,'0')));
      }
      const left=document.createElement('div');
      left.textContent = (season!=null && e.se.episode!=null)
        ? `S${String(season).padStart(2,'0')} - E${String(e.se.episode).padStart(2,'0')}` : e.local;
      const air=str(getOne(store, e.iri, ONTO+'airDate')); if(air) left.appendChild(chip(air));
      const open=makeViewerLink(ttlUrl, e.iri);
      list.appendChild(itemRow(left, open));
    });
  }

  window.renderSeriesFull = renderSeriesFull;
})();

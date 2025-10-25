
/* all-episodes.js — renders the all-shows page; uses onto:poster for images */
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
  function localName(iri){ try{ return iri.split("#").pop(); }catch(e){ return iri; } }
  function titleCase(s){ return (s||"").replace(/[_\-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
  function chip(txt){
    const s = document.createElement("span"); s.className="chip"; s.textContent = txt; return s;
  }
  function group(title){
    const sec = document.createElement("section"); sec.className="section";
    const h2 = document.createElement("h2"); h2.textContent = title; sec.appendChild(h2);
    return sec;
  }
  function extractSE(local){
    const m = local.match(/_S(\d+)_E(\d+)$/);
    if(!m) return {season:0, episode:0};
    return {season:parseInt(m[1],10), episode:parseInt(m[2],10)};
  }
  function makeViewerLink(src, iri){
    const u = new URL("viewer.xhtml", location.href);
    u.searchParams.set("src", src);
    u.searchParams.set("iri", iri);
    return u.href;
  }

  async function renderAllSeriesAndEpisodes(ttlUrl, containerId, countBadgeId){
    const root = document.getElementById(containerId);
    const store = await loadStore(ttlUrl);
    const seriesList = store.getQuads(null, namedNode(RDF+"type"), namedNode(ONTO+"Series"), null).map(q => q.subject.id);
    if(countBadgeId){
      const b = document.getElementById(countBadgeId);
      if(b) b.textContent = seriesList.length + " series";
    }
    for(const s of seriesList){
      const label = str(getOne(store, s, RDFS+"label")) || titleCase(localName(s.replace(IND,"")));
      const sec = group(label);
      // top row with poster + meta
      const top = document.createElement("div"); top.className = "section-top";

      const posterUri = str(getOne(store, s, ONTO+"poster"));
      const posterWrap = document.createElement("div"); posterWrap.className = "poster";
      const img = document.createElement("img"); img.alt = "Poster";
      if(posterUri) img.src = posterUri;
      posterWrap.appendChild(img);
      top.appendChild(posterWrap);

      const meta = document.createElement("div"); meta.className = "series-meta";
      const iriRow = document.createElement("div"); iriRow.className="row";
      const l1 = document.createElement("div"); l1.className="label"; l1.textContent="IRI:";
      const v1 = document.createElement("div"); v1.className="value";
      const code = document.createElement("code"); code.textContent = localName(s); v1.appendChild(code);
      iriRow.append(l1,v1); meta.appendChild(iriRow);

      const labelRow = document.createElement("div"); labelRow.className="row";
      const l2 = document.createElement("div"); l2.className="label"; l2.textContent="Label:";
      const v2 = document.createElement("div"); v2.className="value"; v2.textContent = label;
      labelRow.append(l2,v2); meta.appendChild(labelRow);

      top.appendChild(meta);
      sec.appendChild(top);

      // episodes
      const list = document.createElement("div"); list.className="list";
      const eps = store.getQuads(null, namedNode(ONTO+"partOfSeries"), namedNode(s), null).map(q=>q.subject.id)
        .map(iri=>({iri,local:localName(iri),se:extractSE(localName(iri))}))
        .sort((a,b)=>a.se.season-b.se.season || a.se.episode-b.se.episode);

      let cur=-1;
      eps.forEach(e=>{
        if(e.se.season!==cur){ cur=e.se.season; const g=document.createElement("div"); g.className="item group"; g.textContent="Season "+String(cur).padStart(2,"0"); list.appendChild(g); }
        const row = document.createElement("div"); row.className="item";
        const left = document.createElement("div"); left.textContent=`S${String(e.se.season).padStart(2,"0")} - E${String(e.se.episode).padStart(2,"0")}`;
        const air = str(getOne(store, e.iri, ONTO+"airDate")); if(air) left.appendChild(chip(air));
        row.appendChild(left);
        const open = document.createElement("a"); open.className="btn small"; open.href = makeViewerLink(ttlUrl, e.iri); open.textContent="Open";
        row.appendChild(open);
        list.appendChild(row);
      });
      sec.appendChild(list);
      root.appendChild(sec);
    }
  }

  window.renderAllSeriesAndEpisodes = renderAllSeriesAndEpisodes;
})();


/* series-page.js — renders a single series page using TTL (XHTML-safe) */
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
  function str(obj){
    if(!obj) return null;
    return (obj.termType === "NamedNode") ? obj.id : obj.value;
  }
  function localName(iri){
    try{ return iri.split("#").pop(); }catch(e){ return iri; }
  }
  function titleCase(s){ return (s||"").replace(/[_\-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
  function chip(text, href){
    const a = document.createElement(href?"a":"span");
    a.className = "chip";
    a.textContent = text;
    if(href){ a.href = href; a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }
  function row(label, node){
    const r = document.createElement("div");
    r.className = "row";
    const l = document.createElement("div");
    l.className = "label"; l.textContent = label;
    const v = document.createElement("div");
    v.className = "value";
    v.appendChild(node);
    r.append(l,v);
    return r;
  }
  function episodeItem(title, openHref){
    const li = document.createElement("div");
    li.className = "item";
    const a = document.createElement("div");
    a.textContent = title;
    const btn = document.createElement("a");
    btn.className = "btn small";
    btn.href = openHref;
    btn.textContent = "Open";
    li.append(a, btn);
    return li;
  }
  function groupHeader(text){
    const h = document.createElement("div");
    h.className = "item group";
    h.textContent = text;
    return h;
  }

  function makeViewerLink(src, iri){
    const u = new URL("viewer.xhtml", location.href);
    u.searchParams.set("src", src);
    u.searchParams.set("iri", iri);
    return u.href;
  }

  function extractSeasonEpisode(local){
    // expects like Series_The_Bear_S01_E07 or similar
    const m = local.match(/_S(\d+)_E(\d+)$/);
    if(!m) return {season: 0, episode: 0};
    return {season: parseInt(m[1],10), episode: parseInt(m[2],10)};
  }

  async function renderSeriesFull(ttlUrl, key, topId, listId){
    const store = await loadStore(ttlUrl);
    const seriesIRI = IND + "Series_" + key;

    // Poster from onto:poster
    let poster = str(getOne(store, seriesIRI, ONTO + "poster"));

    // Label
    let label = str(getOne(store, seriesIRI, RDFS + "label")) || titleCase(key.replace(/_/g," "));

    // Showrunners
    const srs = getAll(store, seriesIRI, ONTO + "hasShowrunner");
    const showrunners = document.createElement("div");
    showrunners.className = "chips";
    if(srs.length){
      srs.forEach(p => {
        const name = str(getOne(store, p.id || p.value, RDFS+"label")) || titleCase(localName(str(p)));
        showrunners.appendChild(chip(name));
      });
    }else{
      showrunners.appendChild(chip("—"));
    }

    // Platforms / Home
    const homes = getAll(store, seriesIRI, ONTO + "hasHomePlatform");
    const streams = getAll(store, seriesIRI, ONTO + "streamsOn");
    const plat = document.createElement("div"); plat.className="chips";
    homes.concat(streams).forEach(p=>{
      const nm = str(getOne(store, str(p), RDFS+"label")) || titleCase(localName(str(p)));
      plat.appendChild(chip(nm));
    });

    // Related link
    const rl = str(getOne(store, seriesIRI, ONTO + "relatedLink"));
    const rlWrap = document.createElement("div"); rlWrap.className = "chips";
    if(rl){ rlWrap.appendChild(chip("Open", rl)); } else { rlWrap.appendChild(chip("—")); }

    // Build top
    const top = document.getElementById(topId);
    // poster
    const posterWrap = document.createElement("div");
    posterWrap.className = "poster";
    const img = document.createElement("img");
    img.alt = "Poster";
    img.referrerPolicy = "no-referrer";
    if(poster){ img.src = poster; }
    posterWrap.appendChild(img);
    // meta
    const meta = document.createElement("div");
    meta.className = "series-meta";
    const iriBox = document.createElement("code");
    iriBox.textContent = localName(seriesIRI);
    meta.appendChild(row("IRI:", iriBox));
    const lbl = document.createElement("span"); lbl.textContent = label;
    meta.appendChild(row("Label:", lbl));
    meta.appendChild(row("Showrunner(s):", showrunners));
    if(plat.childNodes.length) meta.appendChild(row("Platform(s):", plat));
    meta.appendChild(row("Link:", rlWrap));
    top.append(posterWrap, meta);

    // Episodes: ?ep onto:partOfSeries seriesIRI
    const EP_IN = store.getQuads(null, namedNode(ONTO+"partOfSeries"), namedNode(seriesIRI), null).map(q => q.subject.id);
    const eps = EP_IN.map(iri => ({ iri, local: localName(iri), se: extractSeasonEpisode(localName(iri)) }));
    eps.sort((a,b)=> a.se.season - b.se.season || a.se.episode - b.se.episode);

    const list = document.getElementById(listId);
    let curSeason = -1;
    eps.forEach(e => {
      if(e.se.season !== curSeason){
        curSeason = e.se.season;
        list.appendChild(groupHeader("Season " + String(curSeason).padStart(2,"0")));
      }
      const air = str(getOne(store, e.iri, ONTO + "airDate"));
      const dir = getAll(store, e.iri, ONTO + "hasDirector").map(x => str(getOne(store, str(x), RDFS+"label")) || titleCase(localName(str(x))));
      const wri = getAll(store, e.iri, ONTO + "hasWriter").map(x => str(getOne(store, str(x), RDFS+"label")) || titleCase(localName(str(x))));

      const left = document.createElement("div");
      left.textContent = `S${String(e.se.season).padStart(2,"0")} - E${String(e.se.episode).padStart(2,"0")}`;
      if(air){ left.appendChild(chip(air)); }
      if(dir.length){ left.appendChild(chip("Dir: " + dir.join(", "))); }
      if(wri.length){ left.appendChild(chip("Writ: " + wri.join(", "))); }

      const rowDiv = document.createElement("div");
      rowDiv.className = "item";
      rowDiv.appendChild(left);
      const link = document.createElement("a");
      link.className = "btn small";
      link.href = makeViewerLink(ttlUrl, e.iri);
      link.textContent = "Open";
      rowDiv.appendChild(link);
      list.appendChild(rowDiv);
    });
  }

  // expose
  window.renderSeriesFull = renderSeriesFull;
})();

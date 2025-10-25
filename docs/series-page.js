
/* Enhanced series-page.js — renders many optional sections by TYPE discovery.
   Requires N3 to be loaded on the page.
*/
(function(){
  const ONTO = "https://jahid1081.github.io/ties4520-ontology/ontology.ttl#";
  const IND  = "https://jahid1081.github.io/ties4520-ontology/individuals.ttl#";
  const RDF  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
  const XSD  = "http://www.w3.org/2001/XMLSchema#";

  const { DataFactory, Parser, Store } = N3;
  const { namedNode } = DataFactory;

  async function loadStore(ttlUrl){
    const txt = await (await fetch(ttlUrl, {cache:"no-store"})).text();
    const store = new Store();
    store.addQuads(new Parser().parse(txt));
    return store;
  }

  function q(store, s,p,o){
    return store.getQuads(s?namedNode(s):null, p?namedNode(p):null, o?namedNode(o):null, null);
  }
  function getOne(store, s, p){
    const r=q(store, s,p,null);
    return r.length ? r[0].object : null;
  }
  function getAll(store, s, p){
    return q(store, s,p,null).map(x=>x.object);
  }
  function str(term){ return term ? (term.termType==="NamedNode" ? term.id : term.value) : null; }
  function localName(iri){ try{ return iri.split('#').pop(); } catch(_){ return iri; } }
  function labelOf(store, iri){
    const o = getOne(store, iri, RDFS+'label');
    return str(o) || localName(iri);
  }

  function chip(text, href){
    const s=document.createElement(href?'a':'span');
    s.className='chip';
    if(href){ s.href=href; s.target="_blank"; s.rel="noopener"; }
    s.textContent=text;
    return s;
  }
  function row(label, node){
    const r=document.createElement('div'); r.className='row';
    const l=document.createElement('div'); l.className='label'; l.textContent=label;
    const v=document.createElement('div'); v.className='value'; v.appendChild(node);
    r.append(l,v); return r;
  }
  function section(title){
    const box=document.createElement('div'); box.className='box';
    const h=document.createElement('h3'); h.textContent=title; box.appendChild(h);
    return box;
  }
  function listGroup(title){
    const g=document.createElement('div'); g.className='list-group';
    const h=document.createElement('div'); h.className='item group'; h.textContent=title;
    g.appendChild(h); return g;
  }
  function listItem(leftNode, openHref){
    const row=document.createElement('div'); row.className='item';
    row.appendChild(leftNode);
    if(openHref){
      const a=document.createElement('a'); a.className='btn small'; a.href=openHref; a.textContent='Open';
      row.appendChild(a);
    }
    return row;
  }
  function makeViewerLink(src, iri){ const u=new URL('viewer.xhtml',location.href); u.searchParams.set('src',src); u.searchParams.set('iri',iri); return u.href; }

  function linkedOfType(store, subjectIri, classIri){
    // Find objects reachable via any predicate where that object a classIri
    const out = new Set();
    store.getQuads(namedNode(subjectIri), null, null, null).forEach(q1 => {
      const obj = q1.object;
      if(obj.termType==="NamedNode"){
        const t = store.getQuads(obj, namedNode(RDF+'type'), namedNode(classIri), null);
        if(t.length) out.add(obj.id);
      }
    });
    return [...out];
  }

  function collectEpisodeNodes(store, seriesIri){
    // subjects with ( ?ep onto:partOfSeries seriesIri ) AND type onto:Episode
    const eps = store.getQuads(null, namedNode(ONTO+'partOfSeries'), namedNode(seriesIri), null)
      .map(q=>q.subject.id)
      .filter(iri => store.getQuads(namedNode(iri), namedNode(RDF+'type'), namedNode(ONTO+'Episode'), null).length>0);
    return eps;
  }

  function uniqueBy(arr, keyFn){ const seen=new Set(), out=[]; for(const x of arr){ const k=keyFn(x); if(!seen.has(k)){ seen.add(k); out.push(x);} } return out; }
  function extractSE(local){ const m=local.match(/_S(\d+)_E(\d+)$/); return m?{s:+m[1],e:+m[2]}:{s:null,e:null}; }

  async function renderSeriesFull(ttlUrl, key, topId, listId){
    const store = await loadStore(ttlUrl);
    const seriesIri = IND + 'Series_' + key;

    // Poster + meta
    const poster = str(getOne(store, seriesIri, ONTO+'poster'));
    const name = labelOf(store, seriesIri);
    const top = document.getElementById(topId);
    const posterWrap = document.createElement('div'); posterWrap.className='poster';
    const img=document.createElement('img'); img.alt='Poster'; if(poster) img.src=poster; posterWrap.appendChild(img);
    const meta=document.createElement('div'); meta.className='series-meta';
    meta.appendChild(row('IRI:', Object.assign(document.createElement('code'),{textContent: localName(seriesIri)})));
    meta.appendChild(row('Label:', Object.assign(document.createElement('span'),{textContent: name})));

    // Showrunners
    const srBox=document.createElement('div'); srBox.className='chips';
    getAll(store, seriesIri, ONTO+'hasShowrunner').forEach(p => srBox.appendChild(chip(labelOf(store, str(p)))));
    if(srBox.childNodes.length) meta.appendChild(row('Showrunner(s):', srBox));

    // Identifiers
    const ids = linkedOfType(store, seriesIri, ONTO+'Identifier');
    if(ids.length){
      const sec = section('Identifiers');
      const wrap=document.createElement('div'); wrap.className='chips';
      ids.forEach(idNode => {
        const lbl = labelOf(store, idNode);
        // Try url/code
        const urlT = getOne(store, idNode, ONTO+'url'); const codeT = getOne(store, idNode, ONTO+'code') || getOne(store, idNode, ONTO+'value');
        if(urlT){ wrap.appendChild(chip(lbl, str(urlT))); }
        else if(codeT){ wrap.appendChild(chip(lbl+': '+str(codeT))); }
        else { wrap.appendChild(chip(lbl)); }
      });
      meta.appendChild(row('IDs:', wrap));
      //top.appendChild(sec); sec.appendChild(wrap);  // keep in meta row style
    }

    // Content rating
    const ratings = linkedOfType(store, seriesIri, ONTO+'ContentRating');
    if(ratings.length){
      const wrap=document.createElement('div'); wrap.className='chips';
      ratings.forEach(r => wrap.appendChild(chip(labelOf(store, r))));
      meta.appendChild(row('Rating:', wrap));
    }

    // Languages
    const langs = linkedOfType(store, seriesIri, ONTO+'Language');
    if(langs.length){
      const wrap=document.createElement('div'); wrap.className='chips';
      langs.forEach(l => wrap.appendChild(chip(labelOf(store, l))));
      meta.appendChild(row('Language(s):', wrap));
    }

    // Availability (find Availability nodes linked, then show Region/Platform labels)
    const avails = linkedOfType(store, seriesIri, ONTO+'Availability');
    if(avails.length){
      const sec = section('Availability');
      avails.forEach(av => {
        const line=document.createElement('div'); line.className='row';
        const l = document.createElement('div'); l.className='label'; l.textContent='Window';
        const v = document.createElement('div'); v.className='value';
        // collect region/platform nodes
        const chips = document.createElement('div'); chips.className='chips inline';
        store.getQuads(namedNode(av), null, null, null).forEach(q => {
          if(q.object.termType==='NamedNode'){
            const t1 = store.getQuads(q.object, namedNode(RDF+'type'), null, null);
            const types = t1.map(t=>t.object.id);
            if(types.includes(ONTO+'Platform') || types.includes(ONTO+'StreamingService')){
              chips.appendChild(chip(labelOf(store, q.object.id)));
            }
            if(types.includes(ONTO+'Region')){
              chips.appendChild(chip(labelOf(store, q.object.id)));
            }
          }else if(q.object.termType==='Literal'){
            // show any dates/numbers
            const predLocal = localName(q.predicate.id);
            if(/date|start|end|from|to/i.test(predLocal)){
              chips.appendChild(chip(predLocal+': '+q.object.value));
            }
          }
        });
        v.appendChild(chips);
        line.append(l,v);
        sec.appendChild(line);
      });
      meta.appendChild(sec);
    }

    // Franchise
    const franchises = linkedOfType(store, seriesIri, ONTO+'Franchise');
    if(franchises.length){
      const wrap=document.createElement('div'); wrap.className='chips';
      franchises.forEach(f => wrap.appendChild(chip(labelOf(store, f))));
      meta.appendChild(row('Franchise:', wrap));
    }

    // Awards
    const awards = linkedOfType(store, seriesIri, ONTO+'Award');
    if(awards.length){
      const sec = section('Awards');
      const wrap=document.createElement('div'); wrap.className='chips';
      awards.forEach(a => wrap.appendChild(chip(labelOf(store, a))));
      sec.appendChild(wrap); meta.appendChild(sec);
    }

    // Releases
    const releases = linkedOfType(store, seriesIri, ONTO+'Release');
    if(releases.length){
      const sec = section('Releases');
      releases.forEach(rn => {
        const r = document.createElement('div'); r.className='row';
        const l = document.createElement('div'); l.className='label'; l.textContent='Release';
        const v = document.createElement('div'); v.className='value';
        const chips=document.createElement('div'); chips.className='chips';
        const date = getOne(store, rn, ONTO+'date') || getOne(store, rn, ONTO+'airDate');
        if(date) chips.appendChild(chip(str(date)));
        v.appendChild(chips); r.append(l,v); sec.appendChild(r);
      });
      meta.appendChild(sec);
    }

    top.appendChild(posterWrap); top.appendChild(meta);

    // Episodes list
    const list=document.getElementById(listId);
    const episodes = collectEpisodeNodes(store, seriesIri)
      .map(iri=>({iri, local:localName(iri), se:extractSE(localName(iri))}))
      .sort((a,b)=>(a.se.s??1e6)-(b.se.s??1e6) || (a.se.e??1e6)-(b.se.e??1e6));

    let current=null;
    episodes.forEach(ep => {
      if(ep.se.s!==current){
        current=ep.se.s;
        const g=document.createElement('div'); g.className='item group'; g.textContent='Season '+String(current||0).padStart(2,'0');
        list.appendChild(g);
      }
      const left=document.createElement('div');
      left.textContent=(ep.se.s!=null && ep.se.e!=null)
        ? `S${String(ep.se.s).padStart(2,'0')} - E${String(ep.se.e).padStart(2,'0')}` : ep.local;
      const air = getOne(store, ep.iri, ONTO+'airDate'); if(air) left.appendChild(chip(str(air)));
      list.appendChild(listItem(left, makeViewerLink(ttlUrl, ep.iri)));
    });

    // Cast & Contributors aggregated from episodes (find linked nodes of type Actor/Contributor/Auteur)
    function aggOfType(classIri){
      const out=new Set();
      episodes.forEach(ep => {
        store.getQuads(namedNode(ep.iri), null, null, null).forEach(q => {
          if(q.object.termType==='NamedNode'){
            if(store.getQuads(q.object, namedNode(RDF+'type'), namedNode(classIri), null).length){
              out.add(q.object.id);
            }
          }
        });
      });
      return [...out];
    }
    const cast = aggOfType(ONTO+'Actor');
    const contrib = aggOfType(ONTO+'Contributor');
    const auteurs = aggOfType(ONTO+'Auteur');

    if(cast.length || contrib.length || auteurs.length){
      const sec=section('People');
      if(cast.length){
        const g=listGroup('Cast (Actors)');
        cast.forEach(p => g.appendChild(listItem(Object.assign(document.createElement('div'),{textContent:labelOf(store, p)}))));
        sec.appendChild(g);
      }
      if(contrib.length){
        const g=listGroup('Contributors');
        contrib.forEach(p => g.appendChild(listItem(Object.assign(document.createElement('div'),{textContent:labelOf(store, p)}))));
        sec.appendChild(g);
      }
      if(auteurs.length){
        const g=listGroup('Auteurs');
        auteurs.forEach(p => g.appendChild(listItem(Object.assign(document.createElement('div'),{textContent:labelOf(store, p)}))));
        sec.appendChild(g);
      }
      document.getElementById(listId).appendChild(sec);
    }
  }

  window.renderSeriesFull = renderSeriesFull;
})();

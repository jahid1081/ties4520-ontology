(function(){
  var XHTML_NS='http://www.w3.org/1999/xhtml';
  function el(tag,attrs,text){ var n=document.createElementNS(XHTML_NS,tag); if(attrs){for(var k in attrs){n.setAttribute(k,attrs[k]);}} if(text!=null){n.textContent=text;} return n; }
  var P = {
    rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs:'http://www.w3.org/2000/01/rdf-schema#',
    xsd:'http://www.w3.org/2001/XMLSchema#',
    onto:'https://jahid1081.github.io/ties4520-ontology/ontology.ttl#',
    ind:'https://jahid1081.github.io/ties4520-ontology/individuals.ttl#'
  };
  function parseTTL(url){ return fetch(url,{headers:{'Accept':'text/turtle,text/plain;q=0.9,*/*;q=0.8'}}).then(r=>{if(!r.ok) throw new Error(r.status+' '+r.statusText); return r.text();}).then(ttl=> new N3.Parser({baseIRI:url}).parse(ttl)); }
  function index(quads){
    var byS={}; var labels={};
    quads.forEach(function(q){
      var s=q.subject.value,p=q.predicate.value;
      if(!byS[s]) byS[s]=[]; byS[s].push(q);
      if(p===P.rdfs+'label' && q.object.termType==='Literal'){ labels[s]=q.object.value; }
    });
    return {byS:byS,labels:labels};
  }
  function qname(u){
    if (!u) return '';
    if (u.indexOf(P.onto)===0) return 'onto:'+u.slice(P.onto.length);
    if (u.indexOf(P.ind)===0)  return 'ind:'+u.slice(P.ind.length);
    if (u.indexOf(P.rdf)===0)  return 'rdf:'+u.slice(P.rdf.length);
    if (u.indexOf(P.rdfs)===0) return 'rdfs:'+u.slice(P.rdfs.length);
    if (u.indexOf(P.xsd)===0)  return 'xsd:'+u.slice(P.xsd.length);
    return '<'+u+'>';
  }
  function renderTable(tbody, rows, labels){
    while(tbody.firstChild) tbody.removeChild(tbody.firstChild);
    if(!rows.length){ var tr=el('tr',null,null); var td=el('td',{'colspan':'2'},'No triples found for that subject.'); tr.appendChild(td); tbody.appendChild(tr); return; }
    rows.forEach(function(q){
      var pred=qname(q.predicate.value);
      var td1=el('td',{'class':'key'},pred);
      var td2=el('td',null,null);
      if (q.object.termType==='NamedNode'){
        var a=el('a',{'href':'viewer.xhtml?iri='+encodeURIComponent(q.object.value)}, (labels[q.object.value]||qname(q.object.value)));
        td2.appendChild(a);
        var small=el('div',{'class':'chips'},null);
        small.appendChild(el('span',{'class':'chip'}, qname(q.object.value)));
        td2.appendChild(small);
      } else if (q.object.termType==='Literal'){
        td2.textContent = q.object.value + (q.object.datatype && q.object.datatype.value && q.object.datatype.value!==P.xsd+'string' ? (' ^^'+qname(q.object.datatype.value)) : '');
      } else {
        td2.textContent = '(blank node)';
      }
      var tr=el('tr',null,null); tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr);
    });
  }
  function firstO(byS, s, p){ var arr=(byS[s]||[]).filter(q=>q.predicate.value===p); return arr.length?arr[0].object:null; }
  function allO(byS, s, p){ return (byS[s]||[]).filter(q=>q.predicate.value===p).map(q=>q.object); }

  window.startViewerWithSubject = function(src, subject){
    if (!subject){ var st=document.getElementById('status'); st.className='alert bad'; st.textContent='Missing ?iri= or ?src=&id='; return; }
    parseTTL(src).then(function(parsed){
      var qx=index(parsed);
      document.getElementById('subjectLine').textContent = qname(subject);
      var rows=(qx.byS[subject]||[]);
      renderTable(document.getElementById('rows'), rows, qx.labels);
      var st=document.getElementById('status'); st.className='alert ok'; st.textContent='Done.';

      // One-hop: if Episode -> show Series meta; if Series -> show Availability + Episodes
      var oneSec = document.getElementById('oneHopSection');
      var top   = document.getElementById('oneHopTop');
      var list  = document.getElementById('oneHopList');
      while(top.firstChild) top.removeChild(top.firstChild);
      while(list.firstChild) list.removeChild(list.firstChild);

      var isSeries = (qx.byS[subject]||[]).some(q=>q.predicate.value===P.rdf+'type' && q.object.termType==='NamedNode' && q.object.value===P.onto+'Series');
      var series = firstO(qx.byS, subject, P.onto+'partOfSeries');
      if (!(isSeries || series)){ oneSec.style.display='none'; return; }
      oneSec.style.display='block';
      var sIRI = isSeries ? subject : (series?series.value:null);
      var labels=qx.labels;

      var posterObj = firstO(qx.byS, sIRI, P.onto+'poster');
      var posterURL = posterObj ? (posterObj.termType==='NamedNode' ? posterObj.value : posterObj.value) : 'img/placeholder.png';
      var poster = el('div',{'class':'poster'}); poster.appendChild(el('img',{'src':posterURL,'alt':'Poster'}));
      var meta = el('div',{'class':'series-meta'});

      var sr = allO(qx.byS, sIRI, P.onto+'hasShowrunner').map(o=>labels[o.value]||qname(o.value));
      if (sr.length){ var r=el('div',{'class':'row'}); r.appendChild(el('div',{'class':'label'},'Showrunner(s):')); var chips=el('div',{'class':'chips'}); sr.forEach(n=>chips.appendChild(el('span',{'class':'chip'},n))); r.appendChild(chips); meta.appendChild(r); }

      var home = firstO(qx.byS, sIRI, P.onto+'hasHomePlatform'); var streams = allO(qx.byS, sIRI, P.onto+'streamsOn');
      if (home || streams.length){ var r=el('div',{'class':'row'}); r.appendChild(el('div',{'class':'label'},'Platform(s):')); var chips=el('div',{'class':'chips'}); if(home){chips.appendChild(el('span',{'class':'chip'},'Home: '+(labels[home.value]||qname(home.value))));} streams.forEach(p=>chips.appendChild(el('span',{'class':'chip'},labels[p.value]||qname(p.value)))); r.appendChild(chips); meta.appendChild(r); }

      var av = allO(qx.byS, sIRI, P.onto+'hasAvailability');
      if (av.length){ var r=el('div',{'class':'row'}); r.appendChild(el('div',{'class':'label'},'Availability:')); var chips=el('div',{'class':'chips'}); av.forEach(function(a){ if(a.termType==='NamedNode'){ var reg=firstO(qx.byS,a.value,P.onto+'region'); var plat=firstO(qx.byS,a.value,P.onto+'platform'); var txt=(reg?(labels[reg.value]||qname(reg.value)):'?')+' • '+(plat?(labels[plat.value]||qname(plat.value)):'?'); chips.appendChild(el('span',{'class':'chip'},txt)); }}); r.appendChild(chips); meta.appendChild(r); }

      top.appendChild(poster); top.appendChild(meta);

      // If Series: list episodes by partOfSeries
      if (isSeries){
        var eps=[];
        Object.keys(qx.byS).forEach(function(s){
          var po = firstO(qx.byS, s, P.onto+'partOfSeries');
          if (po && po.termType==='NamedNode' && po.value===sIRI){
            var sn = firstO(qx.byS, s, P.onto+'seasonNumber');
            var en = firstO(qx.byS, s, P.onto+'episodeNumber');
            var ss = sn && sn.termType==='Literal' ? parseInt(sn.value,10) : null;
            var ee = en && en.termType==='Literal' ? parseInt(en.value,10) : null;
            eps.push({iri:s, s:ss, e:ee});
          }
        });
        eps.sort(function(a,b){ return ((a.s||0)-(b.s||0)) || ((a.e||0)-(b.e||0)); });
        var curS=null;
        eps.forEach(function(ep){
          if (ep.s!=null && curS!==ep.s){ curS=ep.s; list.appendChild(el('div',{'class':'item group'},'Season '+String(ep.s).padStart(2,'0'))); }
          var href='viewer.xhtml?iri='+encodeURIComponent(ep.iri);
          var row=el('div',{'class':'item'});
          row.appendChild(el('a',{'class':'btn title-btn','href':href},(ep.s!=null&&ep.e!=null?('S'+String(ep.s).padStart(2,'0')+' · E'+String(ep.e).padStart(2,'0')):(labels[ep.iri]||'Episode'))));
          row.appendChild(el('a',{'class':'btn','href':href},'Open'));
          list.appendChild(row);
        });
      }
    }).catch(function(e){
      var st=document.getElementById('status'); st.className='alert bad'; st.textContent='Failed: '+e.message;
    });
  };
})();
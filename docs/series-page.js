(function(){
  var XHTML_NS='http://www.w3.org/1999/xhtml';
  function el(tag,attrs,text){ var n=document.createElementNS(XHTML_NS,tag); if(attrs){for(var k in attrs){n.setAttribute(k,attrs[k]);}} if(text!=null){n.textContent=text;} return n; }
  function pad(n){return String(n).padStart(2,'0');}
  function lab(iri, labels){ return labels[iri] || iri.replace(/^.*[#\/]/,''); }
  function parseTTL(url){ return fetch(url,{headers:{'Accept':'text/turtle,text/plain;q=0.9,*/*;q=0.8'}}).then(r=>{if(!r.ok) throw new Error(r.status+' '+r.statusText); return r.text();}).then(ttl=> new N3.Parser({baseIRI:url}).parse(ttl)); }
  function index(quads){
    var byS={}; var labels={};
    quads.forEach(function(q){
      var s=q.subject.value,p=q.predicate.value;
      if(!byS[s]) byS[s]=[]; byS[s].push(q);
      if(p==='http://www.w3.org/2000/01/rdf-schema#label' && q.object.termType==='Literal'){ labels[s]=q.object.value; }
    });
    return {byS:byS,labels:labels};
  }
  function firstO(byS, s, p){ var arr=(byS[s]||[]).filter(q=>q.predicate.value===p); return arr.length?arr[0].object:null; }
  function allO(byS, s, p){ return (byS[s]||[]).filter(q=>q.predicate.value===p).map(q=>q.object); }

  var P = {
    rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs:'http://www.w3.org/2000/01/rdf-schema#',
    onto:'https://jahid1081.github.io/ties4520-ontology/ontology.ttl#',
    ind:'https://jahid1081.github.io/ties4520-ontology/individuals.ttl#'
  };

  function collectEpisodesForSeries(byS, labels, seriesIRI){
    var eps=[];
    Object.keys(byS).forEach(function(s){
      var po = firstO(byS, s, P.onto+'partOfSeries');
      if (po && po.termType==='NamedNode' && po.value===seriesIRI){
        var sn = firstO(byS, s, P.onto+'seasonNumber');
        var en = firstO(byS, s, P.onto+'episodeNumber');
        var ss = sn && sn.termType==='Literal' ? parseInt(sn.value,10) : null;
        var ee = en && en.termType==='Literal' ? parseInt(en.value,10) : null;
        eps.push({ iri:s, s:ss, e:ee });
      }
    });
    eps.sort(function(a,b){ return ((a.s||0)-(b.s||0)) || ((a.e||0)-(b.e||0)); });
    return eps;
  }

  window.renderSeriesFull = function(ttlPath, key, topId, listId){
    var src=ttlPath||'individuals.ttl';
    var seriesIRI = P.ind + 'Series_' + key;
    parseTTL(src).then(function(parsed){
      var qx = index(parsed);
      // Top area (poster, showrunners, platforms, availability, link)
      var top = document.getElementById(topId);
      while (top.firstChild) top.removeChild(top.firstChild);

      // poster
      var posterObj = firstO(qx.byS, seriesIRI, P.onto+'poster');
      var posterURL = posterObj ? (posterObj.termType==='NamedNode' ? posterObj.value : posterObj.value) : 'img/placeholder.png';
      var poster = el('div',{'class':'poster'}); poster.appendChild(el('img',{'src':posterURL,'alt':'Poster'}));

      var meta = el('div',{'class':'series-meta'});

      // IRI + label
      var row0 = el('div',{'class':'row'});
      row0.appendChild(el('div',{'class':'label'},'IRI:'));
      row0.appendChild(el('div',{'class':'value'}, 'ind:Series_'+key));
      meta.appendChild(row0);

      // Showrunners
      var srs = allO(qx.byS, seriesIRI, P.onto+'hasShowrunner').map(o=>lab(o.value,qx.labels));
      if (srs.length){
        var r = el('div',{'class':'row'});
        r.appendChild(el('div',{'class':'label'},'Showrunner(s):'));
        var chips = el('div',{'class':'value chips'});
        srs.forEach(n=>chips.appendChild(el('span',{'class':'chip'},n)));
        r.appendChild(chips);
        meta.appendChild(r);
      }

      // Platforms
      var home = firstO(qx.byS, seriesIRI, P.onto+'hasHomePlatform');
      var streams = allO(qx.byS, seriesIRI, P.onto+'streamsOn');
      if (home || streams.length){
        var r = el('div',{'class':'row'});
        r.appendChild(el('div',{'class':'label'},'Platform(s):'));
        var chips = el('div',{'class':'value chips'});
        if (home){ chips.appendChild(el('span',{'class':'chip'}, 'Home: '+lab(home.value,qx.labels))); }
        streams.forEach(p=>chips.appendChild(el('span',{'class':'chip'}, lab(p.value,qx.labels))));
        r.appendChild(chips);
        meta.appendChild(r);
      }

      // Availability (Region • Platform) from hasAvailability → (region, platform)
      var avs = allO(qx.byS, seriesIRI, P.onto+'hasAvailability');
      if (avs.length){
        var r = el('div',{'class':'row'});
        r.appendChild(el('div',{'class':'label'},'Availability:'));
        var chips = el('div',{'class':'value chips'});
        avs.forEach(function(a){
          if (a.termType==='NamedNode'){
            var reg = firstO(qx.byS, a.value, P.onto+'region');
            var plt = firstO(qx.byS, a.value, P.onto+'platform');
            var txt = (reg?lab(reg.value,qx.labels):'?') + ' • ' + (plt?lab(plt.value,qx.labels):'?');
            chips.appendChild(el('span',{'class':'chip'}, txt));
          }
        });
        r.appendChild(chips);
        meta.appendChild(r);
      }

      // relatedLink (if present)
      var link = firstO(qx.byS, seriesIRI, P.onto+'relatedLink');
      if (link){
        var r = el('div',{'class':'row'});
        r.appendChild(el('div',{'class':'label'},'Link:'));
        var a = el('a',{'class':'btn small','href':link.value,'target':'_blank','rel':'noopener'},'Open');
        var v = el('div',{'class':'value'}); v.appendChild(a);
        r.appendChild(v);
        meta.appendChild(r);
      }

      top.appendChild(poster); top.appendChild(meta);

      // Episodes for this series
      var list = document.getElementById(listId);
      while (list.firstChild) list.removeChild(list.firstChild);

      var eps = collectEpisodesForSeries(qx.byS, qx.labels, seriesIRI);
      if (!eps.length){
        list.appendChild(el('div',{'class':'item'},'No episodes found.'));
      } else {
        var curS=null;
        eps.forEach(function(ep){
          if (ep.s!=null && curS!==ep.s){
            curS=ep.s;
            list.appendChild(el('div',{'class':'item group'},'Season '+String(ep.s).padStart(2,'0')));
          }
          var row = el('div',{'class':'item'});
          var href;
          var frag = ep.iri.indexOf('#')>=0 ? ep.iri.split('#').pop() : null;
          if (frag){
            href = 'viewer.xhtml?src=individuals.ttl&id='+encodeURIComponent(frag);
          } else {
            href = 'viewer.xhtml?iri='+encodeURIComponent(ep.iri);
          }
          var left = el('a',{'class':'btn title-btn','href':href}, (ep.s!=null&&ep.e!=null?('S'+String(ep.s).padStart(2,'0')+' · E'+String(ep.e).padStart(2,'0')):'Episode'));

          // episode chips
          var chips = el('div',{'class':'chips'});
          var ad = firstO(qx.byS, ep.iri, P.onto+'airDate'); if (ad && ad.termType==='Literal'){ chips.appendChild(el('span',{'class':'chip'}, ad.value)); }
          var dirs = allO(qx.byS, ep.iri, P.onto+'hasDirector').map(o=>lab(o.value,qx.labels));
          if (dirs.length){ chips.appendChild(el('span',{'class':'chip'}, 'Dir: '+dirs.join(', '))); }
          var wrs = allO(qx.byS, ep.iri, P.onto+'hasWriter').map(o=>lab(o.value,qx.labels));
          if (wrs.length){ chips.appendChild(el('span',{'class':'chip'}, 'Writ: '+wrs.join(', '))); }

          var leftWrap = el('div',null,null); leftWrap.appendChild(left); leftWrap.appendChild(chips);
          var openBtn = el('a',{'class':'btn','href':href},'Open');
          row.appendChild(leftWrap);
          row.appendChild(openBtn);
          list.appendChild(row);
        });
      }
    }).catch(function(e){
      var top = document.getElementById(topId);
      while (top.firstChild) top.removeChild(top.firstChild);
      top.appendChild(el('div',{'class':'alert ok'}, 'Error: '+e.message));
    });
  };
})();
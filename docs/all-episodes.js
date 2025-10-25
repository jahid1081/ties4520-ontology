(function(){
  var XHTML_NS='http://www.w3.org/1999/xhtml';
  function el(tag,attrs,text){ var n=document.createElementNS(XHTML_NS,tag); if(attrs){for(var k in attrs){n.setAttribute(k,attrs[k]);}} if(text!=null){n.textContent=text;} return n; }
  function pad(n){return String(n).padStart(2,'0');}
  function byId(id){return document.getElementById(id);}
  var P = {
    rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs:'http://www.w3.org/2000/01/rdf-schema#',
    onto:'https://jahid1081.github.io/ties4520-ontology/ontology.ttl#',
    ind:'https://jahid1081.github.io/ties4520-ontology/individuals.ttl#'
  };
  function lab(iri, labels){ return labels[iri] || iri.replace(/^.*[#\/]/,''); }
  function parseTTL(url){ return fetch(url,{headers:{'Accept':'text/turtle,text/plain;q=0.9,*/*;q=0.8'}}).then(r=>{if(!r.ok) throw new Error(r.status+' '+r.statusText); return r.text();}).then(ttl=> new N3.Parser({baseIRI:url}).parse(ttl)); }
  function index(quads){
    var byS = {}; var labels={};
    quads.forEach(function(q){
      var s=q.subject.value,p=q.predicate.value;
      if(!byS[s]) byS[s]=[]; byS[s].push(q);
      if(p===P.rdfs+'label' && q.object.termType==='Literal'){ labels[s]=q.object.value; }
    });
    return {byS:byS,labels:labels};
  }
  function discoverSeriesKeys(quads){
    var keys={}; var re=/#Series_([^#]+)_S\d+_E\d+$/;
    quads.forEach(function(q){ var s=q.subject.value||''; var m=re.exec(s); if(m){ keys[m[1]]=true; } });
    return Object.keys(keys).sort();
  }
  function seriesIRI(key){ return P.ind+'Series_'+key; }
  function epKeyPattern(key){ return new RegExp('#Series_'+key+'_S(\\d+)_E(\\d+)$'); }
  function collectEpisodes(key, quads){
    var seen={}; var eps=[]; var re=epKeyPattern(key);
    quads.forEach(function(q){
      var s=q.subject.value||''; var m=re.exec(s);
      if(m){ var id=s.split('#').pop(); if(!seen[id]){ seen[id]=true; eps.push({s:parseInt(m[1],10), e:parseInt(m[2],10), iri:s}); } }
    });
    eps.sort(function(a,b){ return (a.s-b.s)||(a.e-b.e); });
    return eps;
  }
  function firstO(qx, s, p){ var arr=(qx.byS[s]||[]).filter(q=>q.predicate.value===p); return arr.length?arr[0].object:null; }
  function allO(qx, s, p){ return (qx.byS[s]||[]).filter(q=>q.predicate.value===p).map(q=>q.object); }

  window.renderAllSeriesAndEpisodes = function(ttlPath, containerId, badgeId){
    var src=ttlPath||'individuals.ttl', base=new URL(src, location.href).href.replace(/#.*$/,'');
    parseTTL(src).then(function(parsed){
      var keys = discoverSeriesKeys(parsed);
      var qx = index(parsed);
      var root = byId(containerId);
      var badge= byId(badgeId);
      if (badge) badge.textContent = keys.length + ' shows';
      while(root.firstChild) root.removeChild(root.firstChild);
      if(!keys.length){ root.appendChild(el('div',{'class':'item'},'No shows discovered.')); return; }

      keys.forEach(function(key){
        var sIRI = seriesIRI(key);
        var sec = el('section', {'class':'section','about':'ind:Series_'+key,'typeof':'onto:Series'});
        // Title
        sec.appendChild(el('h2',null,(qx.labels[sIRI]||key.replace(/_/g,' '))));
        // Top row with poster + meta
        var top = el('div',{'class':'section-top'});
        var posterDiv = el('div',{'class':'poster'});
        var posterObj = firstO(qx, sIRI, P.onto+'poster');
        var posterURL = posterObj ? (posterObj.termType==='NamedNode' ? posterObj.value : posterObj.value) : 'img/placeholder.png';
        posterDiv.appendChild(el('img', {'src': posterURL, 'alt':'Poster'}));
        var meta = el('div',{'class':'series-meta'});
        // Showrunners
        var showrunners = allO(qx, sIRI, P.onto+'hasShowrunner').map(o=>lab(o.value,qx.labels));
        if (showrunners.length){
          var r = el('div',{'class':'row'}); r.appendChild(el('div',{'class':'label'},'Showrunner(s):'));
          var chips = el('div',{'class':'value chips'}); showrunners.forEach(n=>chips.appendChild(el('span',{'class':'chip'},n)));
          r.appendChild(chips); meta.appendChild(r);
        }
        // Platforms
        var home = firstO(qx, sIRI, P.onto+'hasHomePlatform'); var streams = allO(qx,sIRI,P.onto+'streamsOn');
        if (home || streams.length){
          var r = el('div',{'class':'row'}); r.appendChild(el('div',{'class':'label'},'Platform(s):'));
          var chips= el('div',{'class':'value chips'});
          if (home) chips.appendChild(el('span',{'class':'chip'},'Home: '+lab(home.value,qx.labels)));
          streams.forEach(p=>chips.appendChild(el('span',{'class':'chip'},lab(p.value,qx.labels))));
          r.appendChild(chips); meta.appendChild(r);
        }
        // Availability nodes
        var avails = allO(qx, sIRI, P.onto+'hasAvailability');
        if (avails.length){
          var r = el('div',{'class':'row'}); r.appendChild(el('div',{'class':'label'},'Availability:'));
          var chips= el('div',{'class':'value chips'});
          avails.forEach(function(a){
            var avIRI = (a.termType==='NamedNode') ? a.value : null;
            if (avIRI){
              var reg = firstO(qx, avIRI, P.onto+'region'); var plat = firstO(qx, avIRI, P.onto+'platform');
              var txt = (reg?lab(reg.value,qx.labels):'?') + ' • ' + (plat?lab(plat.value,qx.labels):'?');
              chips.appendChild(el('span',{'class':'chip'},txt));
            }
          });
          r.appendChild(chips); meta.appendChild(r);
        }
        // Related link
        var link = firstO(qx, sIRI, P.onto+'relatedLink');
        if (link){
          var r= el('div',{'class':'row'}); r.appendChild(el('div',{'class':'label'},'Link:'));
          var a= el('a',{'class':'btn small','href': link.value, 'target':'_blank','rel':'noopener'}, 'Open');
          var v= el('div',{'class':'value'}); v.appendChild(a); r.appendChild(v); meta.appendChild(r);
        }
        top.appendChild(posterDiv); top.appendChild(meta); sec.appendChild(top);

        // Episodes list with metadata
        var list = el('div',{'class':'list'});
        var eps = collectEpisodes(key, parsed);
        if (!eps.length){ list.appendChild(el('div',{'class':'item'},'No episodes found.')); }
        var curS=null;
        eps.forEach(function(ep){
          if (curS!==ep.s){ curS=ep.s; list.appendChild(el('div',{'class':'item group'},'Season '+pad(ep.s))); }
          var row = el('div',{'class':'item'});
          var frag = ep.iri.split('#').pop();
          var href = 'viewer.xhtml?src=individuals.ttl&id='+encodeURIComponent(frag);
          var left = el('a',{'class':'btn title-btn','href':href},'S'+pad(ep.s)+' · E'+pad(ep.e));
          var right= el('a',{'class':'btn','href':href},'Open');
          var epMeta = el('div',{'class':'chips'});
          var ad = firstO(qx, ep.iri, P.onto+'airDate'); if (ad && ad.termType==='Literal'){ epMeta.appendChild(el('span',{'class':'chip'}, ad.value)); }
          var dirs = allO(qx, ep.iri, P.onto+'hasDirector').map(o=>lab(o.value,qx.labels));
          if (dirs.length){ epMeta.appendChild(el('span',{'class':'chip'}, 'Dir: '+dirs.join(', '))); }
          var wrs  = allO(qx, ep.iri, P.onto+'hasWriter').map(o=>lab(o.value,qx.labels));
          if (wrs.length){ epMeta.appendChild(el('span',{'class':'chip'}, 'Writ: '+wrs.join(', '))); }
          var leftWrap = el('div',null,null); leftWrap.appendChild(left); leftWrap.appendChild(epMeta);
          row.appendChild(leftWrap); row.appendChild(right);
          list.appendChild(row);
        });
        sec.appendChild(list);
        root.appendChild(sec);
      });
    }).catch(function(e){
      var root=byId(containerId);
      while(root.firstChild) root.removeChild(root.firstChild);
      var msg=el('div',{'class':'alert bad'}, 'Error: '+e.message); root.appendChild(msg);
    });
  };
})();
(function(){
  var XHTML_NS = 'http://www.w3.org/1999/xhtml';
  function pad(n){ return String(n).padStart(2,'0'); }
  function byId(id){ return document.getElementById(id); }
  function el(tag, attrs, text){
    var node = document.createElementNS(XHTML_NS, tag);
    if (attrs){ for (var k in attrs){ node.setAttribute(k, attrs[k]); } }
    if (text!=null){ node.textContent = text; }
    return node;
  }
  // Map series key -> poster path and human label
  // Keys match the fragment after "Series_" in your TTL subjects.
  var POSTERS = {
    "Poker_Face": { src: "img/poker-face.jpg", alt: "Poker Face poster", label: "Poker Face" },
    "The_Bear":   { src: "img/the-bear.jpg",   alt: "The Bear poster",   label: "The Bear" },
    "The_Boys":   { src: "img/the-boys.jpg",   alt: "The Boys poster",   label: "The Boys" }
  };
  function discoverSeriesKeys(quads){
    var keys = Object.create(null);
    var re = /#Series_([^#]+)_S\d+_E\d+$/;
    for (var i=0;i<quads.length;i++){
      var s = quads[i].subject;
      if (s && s.termType === 'NamedNode'){
        var m = re.exec(s.value);
        if (m){ keys[m[1]] = true; }
      }
    }
    var list = Object.keys(keys).sort();
    return list;
  }
  function collectEpisodesFor(key, quads){
    var eps = [], seen = Object.create(null);
    var re = new RegExp('#Series_' + key + '_S(\\d+)_E(\\d+)$');
    for (var i=0;i<quads.length;i++){
      var s = quads[i].subject;
      if (s && s.termType === 'NamedNode'){
        var m = re.exec(s.value);
        if (m){
          var id = s.value.split('#').pop();
          if (!seen[id]){ seen[id] = true; eps.push({ s:+m[1], e:+m[2], id:id }); }
        }
      }
    }
    eps.sort(function(a,b){ return (a.s-b.s) || (a.e-b.e); });
    return eps;
  }
  function seriesLabelFromKey(key){
    if (POSTERS[key] && POSTERS[key].label){ return POSTERS[key].label; }
    return key.replace(/_/g,' ');
  }
  window.renderAllEpisodes = function(ttlPath, containerId, badgeId){
    var src  = ttlPath || 'individuals.ttl';
    var base = new URL(src, location.href).href.replace(/#.*$/,'');
    fetch(src, { headers:{ 'Accept':'text/turtle,text/plain;q=0.9,*/*;q=0.8' } })
      .then(function(r){ if(!r.ok) throw new Error(r.status+' '+r.statusText); return r.text(); })
      .then(function(ttl){
        var parser = new N3.Parser({ baseIRI: base });
        var quads  = parser.parse(ttl);
        var keys   = discoverSeriesKeys(quads);
        var root   = byId(containerId);
        var badge  = byId(badgeId);
        if (badge) badge.textContent = keys.length + ' shows';
        while (root.firstChild) root.removeChild(root.firstChild);
        if (!keys.length){ root.appendChild(el('div',{ 'class':'item' }, 'No shows discovered.')); return; }

        for (var k=0;k<keys.length;k++){
          var key = keys[k];
          var section = el('section', { 'class':'section', 'about': 'ind:Series_' + key, 'typeof':'onto:Series' });
          // Top area with poster + meta
          var top = el('div', { 'class':'section-top' });
          var poster = el('div', { 'class':'poster' });
          var posterInfo = POSTERS[key] || { src:'', alt:'Poster', label: seriesLabelFromKey(key) };
          var img = el('img', { 'src': posterInfo.src || 'img/placeholder.png', 'alt': posterInfo.alt || (posterInfo.label + ' poster') });
          poster.appendChild(img);
          var meta = el('div', { 'class':'series-meta' });
          meta.appendChild(el('h2', null, posterInfo.label));
          var rowIri = el('div', { 'class':'row' });
          rowIri.appendChild(el('div', { 'class':'label' }, 'IRI:'));
          rowIri.appendChild(el('div', { 'class':'value' }, 'ind:Series_' + key));
          meta.appendChild(rowIri);
          var rowData = el('div', { 'class':'row' });
          rowData.appendChild(el('div', { 'class':'label' }, 'Data:'));
          var dataBtn = el('a', { 'class':'btn small', 'href':'individuals.ttl' }, 'individuals.ttl');
          rowData.appendChild(dataBtn);
          meta.appendChild(rowData);
          top.appendChild(poster);
          top.appendChild(meta);
          section.appendChild(top);

          // Episode list
          var list = el('div', { 'class':'list' });
          var eps = collectEpisodesFor(key, quads);
          if (!eps.length){
            list.appendChild(el('div',{ 'class':'item' }, 'No episodes found for ' + key));
          } else {
            var curS=null;
            for (var j=0;j<eps.length;j++){
              var ep = eps[j];
              if (curS !== ep.s){
                curS = ep.s;
                list.appendChild(el('div',{ 'class':'item group' }, 'Season ' + pad(ep.s)));
              }
              var row = el('div',{ 'class':'item' });
              var href = 'viewer.html?src=individuals.ttl&id=' + encodeURIComponent(ep.id);
              row.appendChild(el('a', { 'class':'btn title-btn', 'href': href }, 'S'+pad(ep.s)+' · E'+pad(ep.e)));
              row.appendChild(el('a', { 'class':'btn', 'href': href }, 'Open'));
              list.appendChild(row);
            }
          }
          section.appendChild(list);
          root.appendChild(section);
        }
      })
      .catch(function(e){
        var root = byId(containerId);
        while (root.firstChild) root.removeChild(root.firstChild);
        var msg = el('div',{ 'class':'item' }, 'Error: '+e.message);
        msg.setAttribute('style','color:#ff6b6b');
        root.appendChild(msg);
      });
  };
})();
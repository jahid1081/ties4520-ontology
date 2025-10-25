(function(){
  var XHTML_NS = 'http://www.w3.org/1999/xhtml';
  function pad(n){return String(n).padStart(2,'0');}
  function byId(id){return document.getElementById(id);}
  function el(tag, attrs, text){
    var node = document.createElementNS(XHTML_NS, tag);
    if (attrs){ for (var k in attrs){ node.setAttribute(k, attrs[k]); } }
    if (text!=null){ node.textContent = text; }
    return node;
  }
  // seriesKey after "Series_": e.g., "The_Bear"
  window.renderEpisodes = function(seriesKey, containerId, ttlPath){
    var src  = ttlPath || 'individuals.ttl';
    var base = new URL(src, location.href).href.replace(/#.*$/,'');
    var re   = new RegExp('#Series_' + seriesKey + '_S(\\d+)_E(\\d+)$');
    fetch(src, {headers:{'Accept':'text/turtle,text/plain;q=0.9,*/*;q=0.8'}})
      .then(function(r){ if(!r.ok) throw new Error(r.status+' '+r.statusText); return r.text(); })
      .then(function(ttl){
        var parser = new N3.Parser({baseIRI: base});
        var quads  = parser.parse(ttl);
        var eps    = [];
        var seen   = Object.create(null); // dedupe by subject IRI
        for (var i=0;i<quads.length;i++){
          var s = quads[i].subject;
          if (s && s.termType === 'NamedNode'){
            var m = re.exec(s.value);
            if (m){
              var id = s.value.split('#').pop();
              if (!seen[id]){ // only push once per episode subject
                seen[id] = true;
                eps.push({ s: +m[1], e: +m[2], id: id });
              }
            }
          }
        }
        eps.sort(function(a,b){ return (a.s-b.s) || (a.e-b.e); });
        var root = byId(containerId);
        if (!root) return;
        while (root.firstChild) root.removeChild(root.firstChild);
        if (!eps.length){
          root.appendChild(el('div',{ 'class':'item' }, 'No episodes found in individuals.ttl for ' + seriesKey));
          return;
        }
        var curS = null;
        for (var j=0;j<eps.length;j++){
          var ep = eps[j];
          if (curS !== ep.s){
            curS = ep.s;
            root.appendChild(el('div',{ 'class':'item group' }, 'Season ' + pad(ep.s)));
          }
          var row = el('div',{ 'class':'item' });
          var href = 'viewer.html?src=individuals.ttl&id=' + encodeURIComponent(ep.id);
          row.appendChild(el('a',{ 'class':'btn title-btn', 'href': href }, 'S'+pad(ep.s)+' · E'+pad(ep.e)));
          row.appendChild(el('a',{ 'class':'btn', 'href': href }, 'Open'));
          root.appendChild(row);
        }
      })
      .catch(function(e){
        var root = byId(containerId);
        if (root){
          while (root.firstChild) root.removeChild(root.firstChild);
          var msg = el('div',{ 'class':'item' }, 'Error loading episodes: ' + e.message);
          msg.setAttribute('style','color:#ff6b6b');
          root.appendChild(msg);
        }
      });
  };
})();
(function(){
  function pad(n){return String(n).padStart(2,'0');}
  function byId(id){return document.getElementById(id);}

  // seriesKey matches fragments after "Series_": e.g., "Poker_Face" or "The_Bear"
  window.renderEpisodes = function(seriesKey, containerId, ttlPath){
    var src = ttlPath || 'individuals.ttl';
    var base = new URL(src, location.href).href.replace(/#.*$/,'');
    // Full subject looks like #Series_<Key>_S01_E03
    var re = new RegExp('#Series_' + seriesKey + '_S(\\d+)_E(\\d+)$');
    fetch(src, {headers:{'Accept':'text/turtle,text/plain;q=0.9,*/*;q=0.8'}})
      .then(function(res){ if(!res.ok) throw new Error(res.status+' '+res.statusText); return res.text(); })
      .then(function(ttl){
        var parser = new N3.Parser({baseIRI: base});
        var quads = parser.parse(ttl);
        var eps = [];
        for (var i=0;i<quads.length;i++){
          var s = quads[i].subject;
          if (s && s.termType === 'NamedNode'){
            var m = re.exec(s.value);
            if (m){
              eps.push({ s: parseInt(m[1],10), e: parseInt(m[2],10), id: s.value.split('#').pop() });
            }
          }
        }
        eps.sort(function(a,b){ return (a.s-b.s) || (a.e-b.e); });
        var root = byId(containerId);
        if(!root) return;
        if(!eps.length){
          root.innerHTML = '<div class="item"><em>No episodes found in individuals.ttl for '+seriesKey+'</em></div>';
          return;
        }
        var html = '';
        var curS = null;
        for (var j=0;j<eps.length;j++){
          var ep = eps[j];
          if (curS !== ep.s){
            curS = ep.s;
            html += '<div class="item group">Season ' + pad(ep.s) + '</div>';
          }
          var label = 'S'+pad(ep.s)+' · E'+pad(ep.e);
          var link  = 'viewer.html?src=individuals.ttl&id=' + encodeURIComponent(ep.id);
          html += '<div class="item"><a class="btn title-btn" href="'+link+'">'+label+'</a><a class="btn" href="'+link+'">Open</a></div>';
        }
        root.innerHTML = html;
      })
      .catch(function(e){
        var root = byId(containerId);
        if (root) root.innerHTML = '<div class="item"><span style="color:#ff6b6b">Error loading episodes: '+e.message+'</span></div>';
      });
  };
})();
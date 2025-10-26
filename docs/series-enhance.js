
/* Lightweight enhancer: show Language, Content Rating, Awards, Franchise using the same TTL parser as viewer */
(function(){
  const file = (location.pathname.split('/').pop() || '').toLowerCase();
  const metaSeries = document.querySelector('meta[name="series-id"]');
  const sid = metaSeries ? metaSeries.content : (file.includes('poker') ? 'Series_Poker_Face' : file.includes('the-bear') ? 'Series_The_Bear' : file.includes('the-boys') ? 'Series_The_Boys' : null);
  if(!sid) return;
  const iri = P.ind + sid;

  function pill(text, href){
    const a = document.createElement(href ? 'a' : 'span');
    a.className = 'pill';
    a.textContent = text;
    if(href){ a.href = href; a.target = '_blank'; a.rel = 'noopener';}
    return a;
  }
  Promise.all([parseTTL('ontology.ttl'), parseTTL('individuals.ttl')]).then(([q1,q2])=>{
    const {byS, labels, firstO, allO, P:PX} = index(q1.concat(q2));
    const meta = document.getElementById('extra-meta') || document.querySelector('.meta') || document.querySelector('.chips');
    if(!meta) return;

    function addRow(label, pills){
      if(!pills || !pills.length) return;
      const row = document.createElement('div');
      row.className='meta-row';
      const lab = document.createElement('div'); lab.className='label'; lab.textContent = label+':';
      const val = document.createElement('div'); val.className='value';
      pills.forEach(p=>val.appendChild(p));
      row.appendChild(lab); row.appendChild(val);
      meta.appendChild(row);
    }

    const langs = (allO(byS, iri, PX.inLanguage)||[]).map(o => pill(labels[o] || qname(o)));
    addRow('Language', langs);

    const cr = (allO(byS, iri, PX.contentRating)||[]).map(o => pill(labels[o] || qname(o)));
    addRow('Rating', cr);

    const franch = firstO(byS, iri, PX.partOfFranchise);
    if(franch) addRow('Franchise', [pill(labels[franch] || qname(franch))]);

    const awards = (allO(byS, iri, PX.hasAward)||[]);
    const awardPills = awards.map(a => {
      const label = labels[a] || qname(a);
      let href = firstO(byS, a, PX.relatedLink);
      href = href && href.startsWith('"') ? href.replace(/^"|"$/g,'') : href;
      return pill(label, href);
    });
    addRow('Awards', awardPills);
  }).catch(console.error);
})();
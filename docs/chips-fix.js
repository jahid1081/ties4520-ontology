/* chips-fix.js — light-touch runtime helper
   - Finds the "row" that contains Language/Rating/Streams/etc. chips
   - Marks that row with [data-meta-row] so chips-fix.css can lay it out
   - Normalizes children by giving them a .chip class (non-destructive)
*/
(function () {
  function looksLikeChip(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (!tag) return false;
    if ((tag === 'A' || tag === 'BUTTON' || tag === 'SPAN') && (el.textContent || '').trim().length) {
      return true;
    }
    return false;
  }

  function findMetaRow() {
    // Heuristic: look for a sibling group near the poster/title that
    // contains several short label-like items ("Language:", "Rating:", "Streams:", "Home:", "Franchise:")
    const candidates = Array.from(document.querySelectorAll(
      '.series-meta, .series__meta, .meta, #series-meta, #enhanced-meta, .header-meta'
    ));
    if (candidates.length) return candidates[0];

    // Fallback: find the first container that has many short inline items
    const containers = Array.from(document.querySelectorAll('section, div'));
    for (const box of containers) {
      const items = Array.from(box.querySelectorAll('a,button,span')).filter(looksLikeChip);
      const shortItems = items.filter(i => (i.textContent || '').trim().length < 40);
      if (shortItems.length >= 4) return box;
    }
    return null;
  }

  function normalizeRow(row) {
    if (!row) return;
    row.setAttribute('data-meta-row', 'true');
    const kids = Array.from(row.querySelectorAll('a,button,span'));
    kids.forEach(k => {
      if (looksLikeChip(k)) {
        k.classList.add('chip');
        // Optional: fuse "Label: Value" into label/value spans if it matches
        const t = (k.textContent || '').trim();
        const m = t.match(/^([^:]+):\s*(.+)$/);
        if (m && !k.querySelector('.chip__label')) {
          k.textContent = '';
          const lab = document.createElement('span');
          lab.className = 'chip__label';
          lab.textContent = m[1] + ':';
          k.appendChild(lab);
          k.appendChild(document.createTextNode(' ' + m[2]));
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => normalizeRow(findMetaRow()));
  } else {
    normalizeRow(findMetaRow());
  }
})();

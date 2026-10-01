// Only allowlisted read filters belong in URLs. Never persist edit forms or credentials.
(() => {
  const routes = {"today": "overview", "usage": "usage", "money": "finance", "users": "users", "safety": "safety", "ops": "settings", "diaryprompts": "diary-prompts", "jev": "follow-up-questions", "ads": "ads", "notice": "announcements", "inq": "inquiries", "story": "stories", "audit": "audit", "characteritems": "character-items", "portraits": "character-portraits", "tarotcards": "tarot-cards"};
  const base = '/merokdam/admin/';
  const filters = {
    usage: {genFbKind:'kind', genFbRating:'rating'},
    ads: {adTelHours:'hours', adLogHours:'log_hours', adLogFilter:'filter', adLogLimit:'limit'},
    users: {uq:'q'}
  };
  const defaults = {};
  for (const fields of Object.values(filters)) for (const id of Object.keys(fields)) defaults[id]=$(id)?.value || '';
  let restoring = false;
  function current() {
    const slug=location.pathname.slice(base.length).replace(/\/$/,'');
    return Object.keys(routes).find(k=>routes[k]===slug) || 'today';
  }
  function readFilters(name) {
    const params=new URLSearchParams(location.search);
    for(const [id,key] of Object.entries(filters[name]||{})) {
      const el=$(id); if(!el)continue;
      const value=params.get(key) ?? defaults[id];
      el.value=el.tagName==='SELECT' && !Array.from(el.options).some(o=>o.value===value) ? defaults[id] : value;
    }
  }
  function url(name) {
    const u=new URL(base+routes[name],location.origin);
    for(const [id,key] of Object.entries(filters[name]||{})) {
      const value=$(id)?.value;
      if(value && value!==defaults[id])u.searchParams.set(key,value);
    }
    return u.pathname+u.search;
  }
  const original=openTab;
  openTab=function(name,force) {
    if(!Object.hasOwn(routes,name))return;
    if(!restoring) {
      // Keep existing query parameters when refreshing the same page.
      const target=name===current()?location.pathname+location.search:url(name);
      if(target!==location.pathname+location.search)history.pushState(null,'',target);
    }
    original(name,force);
  };
  function restore(force) {
    restoring=true;
    try {const name=current();readFilters(name);openTab(name,force);} finally {restoring=false;}
  }
  window.adminRoute={restore,current};
  window.addEventListener('popstate',()=>{if(entered)restore(true);});
  document.addEventListener('change',event=>{
    if(restoring)return;
    const name=current();
    if(Object.hasOwn(filters[name]||{},event.target.id))history.replaceState(null,'',url(name));
  },true);
  const search=searchUsers;
  searchUsers=function(...args){if(!restoring && current()==='users')history.replaceState(null,'',url('users'));return search(...args);};
  // Real links allow copying, bookmarking and opening a menu in another tab.
  document.querySelectorAll('#tabs .tab').forEach(button=>{
    const link=document.createElement('a');
    for(const attr of button.attributes)if(attr.name!=='type')link.setAttribute(attr.name,attr.value);
    link.style.textDecoration='none';link.href=base+routes[button.dataset.t];link.innerHTML=button.innerHTML;button.replaceWith(link);
  });
  $('tabs').onclick=event=>{
    const link=event.target.closest('a.tab');
    if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button!==0)return;
    event.preventDefault();openTab(link.dataset.t);
  };
  // Use the existing allowed OAuth callback; restore only a same-origin admin destination.
  const returnKey='mrd.admin.returnTo';
  const stored=sessionStorage.getItem(returnKey);
  if(stored && (location.pathname===base || location.pathname===base+'index.html')) {
    sessionStorage.removeItem(returnKey);
    const target=new URL(stored,location.origin);
    if(target.origin===location.origin && Object.values(routes).some(slug=>target.pathname===base+slug || target.pathname===base+slug+'/'))history.replaceState(null,'',target.pathname+target.search+location.hash);
  }
  $('btnGoogle').onclick=()=>{
    sessionStorage.setItem(returnKey,location.pathname+location.search);
    sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+base}}).then(({error})=>{if(error)$('loginMsg').textContent=error.message;});
  };
})();

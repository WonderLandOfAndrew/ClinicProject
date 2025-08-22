async function loadPartials() {
  const headerContainer = document.getElementById('site-header');
  const footerContainer = document.getElementById('site-footer');

  if (!headerContainer) return;
  const res = await fetch('/essentials/header.html', { cache: 'no-store' });
  const headerHTML = await res.text();
  headerContainer.innerHTML = headerHTML;
  
  if (footerContainer) {
    const footerHTML = await fetch('/essentials/footer.html').then(res => res.text());
    footerContainer.innerHTML = footerHTML;
  }

  const temp = document.createElement('div');
  temp.innerHTML = headerHTML;
  const scripts = temp.querySelectorAll('script');

  for (const oldScript of scripts) {
    const s = document.createElement('script');
    if (oldScript.src) {
      const srcAttr = oldScript.getAttribute('src');
      s.src = srcAttr.startsWith('/') ? srcAttr : ('/' + srcAttr.replace(/^\.\//, ''));
      if (oldScript.defer) s.defer = true;
    } else {
      s.textContent = oldScript.textContent || '';
    }
    document.head.appendChild(s);
  }
}

document.addEventListener('DOMContentLoaded', loadPartials);
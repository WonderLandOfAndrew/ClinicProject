async function loadUserHeader() {
  const container = document.getElementById('site-header');
  if (!container) return;

  const res = await fetch('/essentials/user/header.html', { cache: 'no-store' });
  const html = await res.text();
  container.innerHTML = html;

  const temp = document.createElement('div');
  temp.innerHTML = html;
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

document.addEventListener('DOMContentLoaded', loadUserHeader);

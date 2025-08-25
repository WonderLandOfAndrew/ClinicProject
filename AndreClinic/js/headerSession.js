(function () {
  function safeText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  async function refreshAuthUI() {
    try {
      const r = await fetch('http://localhost:3001/api/me', { credentials: 'include' });
      const { authenticated, user } = await r.json();

      const loginButton = document.getElementById('loginButton');
      const loginButtonFromIndex = document.getElementById('goLogin');
      const logoutBtn = document.getElementById('logoutBtn');

      if (authenticated) {
        safeText('doctorInfo', user?.username || `Role: ${user?.role || ''}`);
        if (loginButton) loginButton.style.display = 'none';
        if (loginButtonFromIndex) loginButtonFromIndex.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
      } else {
        safeText('doctorInfo', '');
        if (loginButton) loginButton.style.display = 'inline-block';
        if (loginButtonFromIndex) loginButtonFromIndex.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
      }
    } catch (e) {
      console.error(e);
    }
  }

  document.addEventListener('click', async function (e) {
    const t = e.target;
    if (t && t.id === 'logoutBtn') {
      try {
        await fetch('http://localhost:3001/api/logout', { method: 'POST', credentials: 'include' });
      } finally {
        window.location.replace('login.html');
      }
    }
  });

  // initial load
  refreshAuthUI();
})();

(function () {
    function safeText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    const raw = localStorage.getItem('session');
    let session = null;
    try { session = raw ? JSON.parse(raw) : null; } catch(e) {}

    if (session && session.name) {
        safeText('doctorInfo', session.name);
    }

    const loginButton = document.getElementById('loginButton');
    const loginButtonFromIndex = document.getElementById('goLogin');
    if (loginButton) {
        if (session && session.role === 'doctor') {
            loginButton.style.display = 'none';
            if (loginButtonFromIndex) {
                loginButtonFromIndex.style.display = 'none';
            }
        }
        else {
            loginButton.textContent = 'Login';
            loginButton.style.display = 'block';
            if (loginButtonFromIndex) {
                loginButtonFromIndex.style.display = 'inline-block';
            }
        }
    }

    document.addEventListener('click', function (e) {
        const target = e.target;
        if (target && target.id === 'logoutBtn') {
        localStorage.removeItem('session');
        const to = location.pathname.includes('/Doctor/') ? '../login.html' : '../login.html';
        window.location.replace(to);
        }
    });
})();

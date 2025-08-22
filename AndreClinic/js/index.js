// index.js — welcome page logic
(function () {
  const btn = document.getElementById('goLogin');
  if (btn) btn.addEventListener('click', () => {
    window.location.href = 'login.html';
  });
})();
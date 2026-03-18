(function () {
  var path = window.location.pathname;
  if (path === '/login.html' || path === '/login') return;

  var next = encodeURIComponent(path + window.location.search);

  fetch('/auth/status', { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('auth-status-failed');
      }
      return response.json();
    })
    .then(function (data) {
      if (!data || !data.authenticated) {
        window.location.replace('/login.html?next=' + next);
      }
    })
    .catch(function () {
      window.location.replace('/login.html?next=' + next);
    });
})();

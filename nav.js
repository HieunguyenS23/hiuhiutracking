(() => {
  const body = document.body;
  const drawer = document.querySelector('[data-nav-drawer]');
  const overlay = document.querySelector('.nav-overlay');
  const toggle = document.querySelector('[data-nav-toggle]');
  if (!drawer || !overlay || !toggle) return;

  const openDrawer = () => {
    body.classList.add('drawer-open');
  };

  const closeDrawer = () => {
    body.classList.remove('drawer-open');
  };

  toggle.addEventListener('click', openDrawer);
  document.querySelectorAll('[data-nav-close]').forEach((node) => {
    node.addEventListener('click', closeDrawer);
  });
  drawer.querySelectorAll('.drawer-link').forEach((node) => {
    node.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });
})();

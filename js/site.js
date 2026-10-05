// Highlight the nav link for the section in view.
(function () {
  var links = document.querySelectorAll('.nav a');
  if (!('IntersectionObserver' in window) || !links.length) return;

  var byId = {};
  links.forEach(function (a) { byId[a.hash.slice(1)] = a; });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      var link = byId[entry.target.id];
      if (link) link.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  Object.keys(byId).forEach(function (id) {
    var section = document.getElementById(id);
    if (section) observer.observe(section);
  });
})();

// Submit the Netlify contact form without leaving the page.
// Without JavaScript the form still posts normally to Netlify.
(function () {
  var form = document.querySelector('form[name="contact"]');
  if (!form || !window.fetch) return;

  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.classList.remove('is-error');

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        form.reset();
        status.textContent = 'Message sent. I\'ll reply by email.';
      })
      .catch(function () {
        status.classList.add('is-error');
        status.textContent = 'Your message didn\'t send. Try again, or email tagoonjulynard@gmail.com.';
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = 'Send message';
      });
  });
})();

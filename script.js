const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('nav');

menuButton.addEventListener('click', () => {
  const opened = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', opened);
});

document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('in-view');
    observer.unobserve(entry.target);
  }
}), { threshold: .12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const form = document.querySelector('#enquiryForm');
const status = document.querySelector('#formStatus');

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  status.classList.remove('error');

  const endpoint = window.CONFIG?.SCRIPT_URL;
  if (!endpoint) {
    status.textContent = 'The enquiry form is not connected to a Google Sheet yet. Please email mragriengineer@gmail.com.';
    status.classList.add('error');
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const phoneDigits = String(payload.phone || '').replace(/\D/g, '');

  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    status.textContent = 'Please enter a valid phone number, including the country code if applicable.';
    status.classList.add('error');
    form.elements.phone.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (response.redirected && response.url.startsWith('https://accounts.google.com/')) {
      throw new Error('Google is redirecting the enquiry service to sign-in. The Apps Script web app needs public access.');
    }
    if (!response.ok) {
      throw new Error(`The enquiry service returned HTTP ${response.status}. Check that the Apps Script web app is deployed for public access.`);
    }
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error('The enquiry service returned an unexpected response. Check the Apps Script deployment and try again.');
    }
    if (!result.ok) throw new Error(result.error || 'The enquiry could not be saved. Please try again.');

    form.reset();
    status.textContent = 'Thank you. Your enquiry has been received.';
  } catch (error) {
    if (error instanceof TypeError) {
      status.textContent = 'The Google Apps Script endpoint is not publicly reachable. In Apps Script, set the web app to execute as you and allow access to Anyone, deploy a new version, then try again. You can also email mragriengineer@gmail.com.';
    } else {
      status.textContent = `${error.message} You can also email mragriengineer@gmail.com.`;
    }
    status.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Send enquiry <span aria-hidden="true">→</span>';
  }
});

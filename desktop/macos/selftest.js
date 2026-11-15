// Checks the live TeamPulse site from inside the app. Run with: TeamPulse.app/Contents/MacOS/TeamPulse --selftest
// It only reads pages. It never signs in, registers or changes anything on the live site.
const out = [];
const ok = m => out.push('ok: ' + m);
const fail = m => out.push('FAIL: ' + m);
const step = async (name, fn) => { try { await fn(); } catch (e) { fail(name + ' (' + (e && e.message ? e.message : e) + ')'); } };

await step('home page', async () => {
  document.title === 'TeamPulse' ? ok('the home page loads inside the app') : fail('title is ' + document.title);
});
await step('desktop flag', async () => {
  window.TP_DESKTOP === 'mac' ? ok('the app tells the site it is the Mac app') : fail('the Mac app flag is missing');
});
await step('no download buttons inside the app', async () => {
  const s = document.getElementById('download');
  (!s || s.hidden) ? ok('the download section is hidden inside the desktop app') : fail('the desktop app still shows the download section');
});
await step('sign-in page', async () => {
  const r = await fetch('/signin');
  const t = await r.text();
  (r.ok && t.includes('Welcome back') && t.includes('TeamPulse ID')) ? ok('the sign-in page answers') : fail('the sign-in page did not answer (' + r.status + ')');
});
await step('register page', async () => {
  const r = await fetch('/register');
  (r.ok && (await r.text()).includes('Register as a team leader')) ? ok('the registration page answers') : fail('the registration page did not answer');
});
await step('signed-out dashboard', async () => {
  const r = await fetch('/dashboard', { redirect: 'follow' });
  r.url.endsWith('/signin') ? ok('the dashboard sends signed-out visitors to sign in') : fail('the dashboard did not ask for sign-in');
});
await step('test pages are closed', async () => {
  const r = await fetch('/dev/mailbox');
  r.status === 404 ? ok('the test mailbox is closed on the live site') : fail('the test mailbox is open (' + r.status + ')');
});
return out.join('\n');

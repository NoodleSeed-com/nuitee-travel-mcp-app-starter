import { icon, wayline } from './icons.js';

// Private records come only from the authenticated, same-origin portal API.
// Drafts remain in memory. Credentials are never placed in draft or browser storage.
const state = {
  session: null, workspace: null, settingsDraft: null, page: 'overview', step: 0,
  loading: true, busy: false, error: '', notice: '', conflict: false, dialog: null,
  knowledgeQuery: '', knowledgeStatus: 'all', knowledgeDraft: null, sourceDrafts: {}, connectionEnvironment: null,
  operations: {}, auth: { name: '', email: '', businessName: 'Wayfare' },
  panel: null, dialogReturn: null, modelDraft: null, previewAccess: null, runtimeTask: ''
};
const pages = [
  ['overview', 'Overview', 'Squares2X2'], ['bookings', 'Bookings', 'BookOpen'],
  ['analytics', 'Analytics', 'Signal'], ['conversations', 'Conversations', 'ChatBubbleLeftRight'],
  ['setup', 'Setup & launch', 'PaperAirplane'], ['knowledge', 'Knowledge', 'BookOpen'],
  ['controls', 'Agent controls', 'AdjustmentsHorizontal'], ['appearance', 'Appearance', 'Swatch'],
  ['connections', 'Connections', 'Signal'], ['activity', 'Activity', 'Clock']
];
const steps = ['Connect', 'Configure', 'Preview', 'Launch'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = value => structuredClone(value);
const titleFor = page => pages.find(item => item[0] === page)?.[1] || 'Overview';
const saved = () => state.workspace.settings;
const draft = () => state.settingsDraft.value;
const tag = (label, color = '') => `<span class="tag ${color}">${esc(label)}</span>`;
const button = (label, action, primary = false, image = '', disabled = false) => `<button type="button" class="pill ${primary ? 'primary' : ''}" data-action="${esc(action)}" ${disabled || state.busy ? 'disabled' : ''}>${image ? icon(image) : ''}${esc(label)}</button>`;
const iconButton = (name, label, action) => `<button type="button" class="iconbutton" data-action="${esc(action)}" aria-label="${esc(label)}">${icon(name)}</button>`;
const glyph = name => `<span class="glyph">${icon(name)}</span>`;
const heading = (title, subtitle, action = '') => `<div class="titleblock ${action ? 'spread' : ''}"><div><h1>${title}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
const card = (title, body, action = '', extra = '') => `<section class="card ${extra}"><div class="cardhead"><h2>${esc(title)}</h2>${action}</div>${body}</section>`;
const banner = (title, text, image = 'Eye', extra = '') => `<div class="banner ${extra}">${icon(image)}<div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
const row = (image, title, description, action = '') => `<div class="listrow">${glyph(image)}<div class="maincopy"><h3>${esc(title)}</h3><p>${esc(description)}</p></div><div class="trail">${action}</div></div>`;
const metric = (label, value, note) => `<div class="metric"><div class="label">${esc(label)}</div><div class="num">${esc(value)}</div><div class="hint">${esc(note)}</div></div>`;
const empty = (title, text, image = 'CircleStack', action = '') => `<div class="ops-empty">${glyph(image)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
const options = (values, value) => values.map(item => `<option value="${esc(item)}" ${item === value ? 'selected' : ''}>${esc(item)}</option>`).join('');
const displayDate = value => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not checked';
const changedPaths = (base, value, prefix = '') => Object.keys(value).flatMap(key => {
  const path = prefix + key;
  return value[key] && typeof value[key] === 'object' ? changedPaths(base?.[key] || {}, value[key], path + '.') : base?.[key] !== value[key] ? [path] : [];
});
const getPath = (object, path) => path.split('.').reduce((value, key) => value[key], object);
function setPath(object, path, value) {
  const keys = path.split('.'), last = keys.pop();
  keys.reduce((target, key) => target[key], object)[last] = value;
}
const settingsDirty = () => Boolean(state.settingsDraft && changedPaths(state.settingsDraft.base, draft()).length);
const sourceDraftsDirty = () => Object.values(state.sourceDrafts).some(source => source.dirty);
const runtime = () => state.workspace.runtime || { enabled: false, status: 'not_connected', preview: null, active: null, busy: false };
const runtimeBusy = () => Boolean(state.busy || runtime().busy);
const modelConnection = () => state.workspace.modelConnection || { configured: false, baseUrl: null, model: null, transport: 'responses', version: null };
const exactVersion = (left, right) => Boolean(left && right && left.releaseId === right.id && left.digest === right.digest);
const previewReady = (release = state.workspace.release) => Boolean(runtime().enabled && runtime().preview?.ready && exactVersion(runtime().preview, release));
const activeCurrent = () => Boolean(state.workspace.releaseCurrent && exactVersion(runtime().active, state.workspace.release));

function runtimeLimitations(settings) {
  const issues = [];
  if (settings.capabilities.checkout) issues.push('Hotel checkout is not supported by this runtime. Turn it off in Agent controls.');
  if (settings.capabilities.hotels && settings.currency === 'GBP') issues.push('Hotel search does not support GBP in this runtime. Choose CAD, USD or EUR, or turn off hotel planning.');
  return issues;
}
function runtimeSettingsNotice() {
  const issues = runtimeLimitations(draft());
  return `<div id="runtime-settings-note" class="${issues.length ? '' : 'hidden'}">${issues.map(issue => banner('Adjust before preview or publication', issue, 'ExclamationTriangle')).join('')}</div>`;
}
function modelFields() {
  const connection = modelConnection();
  return { revision: state.workspace.revision, baseUrl: connection.baseUrl || 'https://api.openai.com/v1', model: connection.model || '', transport: connection.transport || 'responses' };
}
function previewBlockers(release = state.workspace.release) {
  const issues = [];
  if (!runtime().enabled) issues.push('The local traveler runtime is not connected to this portal installation.');
  if (!state.workspace.connection.configured || !modelConnection().configured) issues.push('Save both your Nuitée connection and your model connection before starting real chat.');
  if (!release || !state.workspace.releaseCurrent || release.schemaVersion !== 2) issues.push('Prepare a reviewed version of your current saved settings and both connections.');
  if (settingsDirty()) issues.push('Save or discard unsaved settings before previewing or publishing.');
  if (state.modelDraft) issues.push('Save or discard your unsaved model connection fields before previewing or publishing.');
  if (release) issues.push(...runtimeLimitations(release.settings));
  return issues;
}
function publishReady(release = state.workspace.release) {
  return !runtimeBusy() && !previewBlockers(release).length && previewReady(release);
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && state.session?.csrfToken) headers['X-CSRF-Token'] = state.session.csrfToken;
  const response = await fetch(path, { method, credentials: 'same-origin', headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  let result;
  try { result = await response.json(); } catch { throw new Error('The portal could not read the server response. Please try again.'); }
  if (!response.ok) {
    const error = new Error(result.error || 'The request could not be completed.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function acceptWorkspace(workspace, { savedSettings = false, mergeEdits = false } = {}) {
  const previous = state.settingsDraft;
  state.workspace = workspace;
  if (state.previewAccess && (!workspace.releaseCurrent || !exactVersion({ releaseId: state.previewAccess.releaseId, digest: state.previewAccess.digest }, workspace.release))) state.previewAccess = null;
  if (!previous || savedSettings || !settingsDirty()) {
    state.settingsDraft = { base: clone(workspace.settings), value: clone(workspace.settings), revision: workspace.revision };
  } else if (mergeEdits) {
    const value = clone(workspace.settings);
    changedPaths(previous.base, previous.value).forEach(path => setPath(value, path, getPath(previous.value, path)));
    state.settingsDraft = { base: clone(workspace.settings), value, revision: workspace.revision };
  } else if (JSON.stringify(previous.base) === JSON.stringify(workspace.settings)) {
    // A successful source/key write in this tab advances the shared revision.
    previous.revision = workspace.revision;
  }
}

function handleError(error) {
  if (error.status === 401) {
    state.session = { setupRequired: false, user: null, csrfToken: null };
    state.dialog = null;
    state.previewAccess = null;
    state.error = 'Your session has ended. Sign in again to continue; unsaved non-secret edits are kept in this tab.';
  } else {
    state.conflict = error.status === 409 && Boolean(state.session?.user) && /workspace changed|source is unavailable|draft can be approved/i.test(error.message);
    state.error = state.conflict
      ? error.message + ' Load the latest saved version and review your edits before trying again.'
      : error.message || 'The portal could not reach the server. Please try again.';
    if (error.status === 409 && !state.session?.user && /already set up/i.test(error.message)) state.session = { setupRequired: false, user: null, csrfToken: null };
  }
}

async function mutate(path, method, body, { savedSettings = false, notice = '', nextStep, savedModel = false } = {}) {
  if (state.busy) return false;
  state.busy = true; state.error = ''; render();
  try {
    const workspace = await api(path, { method, body });
    acceptWorkspace(workspace, { savedSettings });
    if (savedModel) state.modelDraft = null;
    state.conflict = false; state.dialog = null; state.notice = notice;
    if (nextStep !== undefined) { state.page = 'setup'; state.step = nextStep; updateUrl(); }
    return true;
  } catch (error) { handleError(error); return false; }
  finally { state.busy = false; render(); }
}

function routeFromUrl() {
  const query = new URLSearchParams(location.search);
  state.page = pages.some(item => item[0] === query.get('page')) ? query.get('page') : 'overview';
  state.step = Math.max(0, steps.findIndex(step => step.toLowerCase() === query.get('step')));
}
function updateUrl(replace = false) {
  const url = new URL(location.href); url.search = '';
  if (state.page !== 'overview') url.searchParams.set('page', state.page);
  if (state.page === 'setup') url.searchParams.set('step', steps[state.step].toLowerCase());
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
}
function navigate(page, step = state.step) {
  if (!pages.some(item => item[0] === page)) return;
  state.page = page; state.step = step; state.panel = null; state.dialog = null;
  state.notice = ''; state.error = ''; state.conflict = false;
  updateUrl(); render(); window.scrollTo({ top: 0 }); loadOperations();
}

function brand(name = state.workspace?.settings.name || 'Business') {
  return `<div class="brand">${wayline}<span class="wordmark">${esc(name)}<span class="brand-subtitle">Studio</span></span></div>`;
}
function messageArea() {
  return `${state.runtimeTask ? `<div class="app-message" role="status">${icon('Clock')}<p>${esc(state.runtimeTask)}</p></div>` : ''}${state.error ? `<div class="app-message error-message" role="alert"><div><strong>Something needs your attention</strong><p>${esc(state.error)}</p></div>${state.conflict ? button('Load latest and keep my edits', 'reload-workspace') : ''}</div>` : ''}${state.notice ? `<div class="app-message success-message" role="status">${icon('CheckCircle')}<p>${esc(state.notice)}</p></div>` : ''}`;
}
function authView() {
  const first = state.session?.setupRequired;
  return `<main class="auth-shell"><div class="auth-intro">${brand('Business')}<span class="contextchip">Your business. Your studio.</span><h1>${first ? 'A new chapter.<br>Make it yours.' : 'Welcome back.<br>Your studio awaits.'}</h1><p>${first ? 'Create the owner account for this local portal and give your travel workspace a name.' : 'Sign in to manage your business, knowledge and travel settings.'}</p></div><section class="card auth-card"><div class="cardhead"><h2>${first ? 'Create your workspace' : 'Sign in'}</h2>${tag('Local portal')}</div><div class="cardbody">${messageArea()}<form id="auth-form" class="stack"><fieldset class="plain-fieldset stack" ${state.busy ? 'disabled' : ''}>${first ? `<div class="field"><label for="owner-name">Your name</label><input id="owner-name" name="name" autocomplete="name" value="${esc(state.auth.name)}" maxlength="80" required></div><div class="field"><label for="business-name">Business name</label><input id="business-name" name="businessName" value="${esc(state.auth.businessName)}" maxlength="40" required></div>` : ''}<div class="field"><label for="owner-email">Email</label><input id="owner-email" name="email" type="email" autocomplete="username" maxlength="254" value="${esc(state.auth.email)}" required></div><div class="field"><label for="owner-password">Password</label><input id="owner-password" name="password" type="password" autocomplete="${first ? 'new-password' : 'current-password'}" ${first ? 'minlength="12"' : ''} maxlength="128" required>${first ? '<small>Use at least 12 characters. This account is for the owner of this installation.</small>' : ''}</div><button class="pill primary auth-submit" type="submit">${state.busy ? 'Please wait…' : first ? 'Create workspace' : 'Sign in'}${icon('ArrowRight')}</button></fieldset></form><p class="note">Manage one business on this machine. Preview and publication require your configured travel and model connections.</p></div></section></main>`;
}
function sidebar() {
  const user = state.session.user;
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
  return `<aside class="sidebar ${state.panel === 'sidebar' ? 'open' : ''}" id="sidebar" aria-label="Workspace navigation">${iconButton('XMark', 'Close navigation', 'close-panels') .replace('class="iconbutton"', 'class="iconbutton sidebarclose"')}${brand()}<p class="brandnote">Your business. Your studio.</p><nav class="nav">${pages.map(([key, label, image], index) => `${index === 0 ? '<span class="navgroup">Your business</span>' : key === 'setup' ? '<span class="navgroup">Your experience</span>' : ''}<button data-page="${key}" class="${state.page === key ? 'active' : ''}" ${state.page === key ? 'aria-current="page"' : ''}>${icon(image)}${label}</button>`).join('')}</nav><div class="sidebarbottom"><div class="modechip"><span class="dot"></span>Local workspace · saved on this machine</div><a class="platformbutton" href="http://localhost:3002/" target="_blank" rel="noopener">${icon('Eye')}Open example design</a><div class="row ownerrow"><span class="avatar">${esc(initials)}</span><div class="owner-copy"><h3>${esc(user.name)}</h3><p>Business owner</p></div>${iconButton('ArrowRight', 'Sign out', 'logout')}</div></div></aside>`;
}
const helpText = {
  overview: ['A little clarity.<br>A better journey.', 'Start with your account connection, then save your brand and the facts your assistant should know.'],
  setup: ['Your business.<br>Ready for its<br>next chapter.', 'Save your connections and settings, prepare a reviewed version, then try the real chat privately before publishing.'],
  knowledge: ['The right facts.<br>A better<br>conversation.', 'Save a source as a draft, review it, then approve it inside this portal. Approval is separate from publishing to the traveler assistant.'],
  controls: ['Helpful defaults.<br>Clear boundaries.', 'Preferences guide the reviewed experience. Save, prepare and publish to apply them; they do not grant provider permissions.'],
  appearance: ['Your name.<br>Your welcome.', 'See your changes as you edit. Review and save them when they feel right. Publish a reviewed version to apply saved changes.'],
  connections: ['Your account.<br>A clear connection.', 'Save the key securely on this machine, then explicitly check it. A successful check does not establish booking or ticketing permissions.'],
  bookings: ['Every stay.<br>The details<br>that matter.', 'A booking source has not been connected. When supported records are available, booking and payment status will remain separate.'],
  analytics: ['A clearer view.<br>A better next move.', 'Real activity needs a connected event source. Booking value, payments and business revenue are different measures.'],
  conversations: ['Listen. Learn.<br>Make the next<br>one better.', 'A supported private conversation source is needed before traveler threads can appear here.'],
  activity: ['What changed.<br>A clear record.', 'This history records changes made through your authenticated portal account, using server timestamps.']
};
function helper() {
  const [title, text] = helpText[state.page];
  return `<aside class="assistant ${state.panel === 'helper' ? 'open' : ''}" id="helper" aria-label="Workspace guide">${iconButton('XMark', 'Close guide', 'close-panels').replace('class="iconbutton"', 'class="iconbutton assistantclose"')}<div class="assistantbrand">${glyph('Sparkles')}<div><h2>A hand with your business</h2><p>Workspace guide · not AI</p></div></div><div class="assistantcontent"><span class="contextchip">${esc(saved().name)} · ${esc(titleFor(state.page).toLowerCase())}</span><h2 class="assistantheadline">${title}</h2><p class="assistantdescription">${text}</p><div class="assistantactions">${button('Review your connection', 'step:0', false, 'ChevronRight')}${button('Preview saved branding', 'step:2', false, 'ChevronRight')}</div></div><div class="guide-footer"><h3>What is working here?</h3><p>Owner sign-in, saved preferences, knowledge drafts and credential management.</p><p>Private chat and publication use the connected local runtime. Operational feeds are still disconnected.</p></div></aside>`;
}
function draftNotice() {
  return `<div id="draft-notice" class="draft-notice ${settingsDirty() ? '' : 'hidden'}">${icon('Clock')}<span>Unsaved settings are kept in this tab as you move between pages.</span>${button('Review changes', 'review-settings')}${button('Discard edits', 'discard-settings')}</div>`;
}
function render() {
  const focused = document.activeElement?.id;
  const app = document.getElementById('app');
  if (state.loading) app.innerHTML = '<main class="auth-shell"><p role="status">Opening your workspace…</p></main>';
  else if (!state.session?.user) app.innerHTML = authView();
  else if (!state.workspace) app.innerHTML = `<main class="auth-shell"><section class="card"><div class="cardbody">${messageArea()}${button('Try again', 'retry-load', true)}</div></section></main>`;
  else {
    document.title = saved().name + ' Studio';
    app.innerHTML = `<header class="mobileheader">${iconButton('Bars3', 'Open navigation', 'open-sidebar')}${brand()}${iconButton('Sparkles', 'Open workspace guide', 'open-helper')}</header><div class="mobilebackdrop ${state.panel ? 'open' : ''}" data-action="close-panels"></div>${sidebar()}<main class="main" id="main"><div class="topline"><span>${esc(saved().name)} / ${esc(titleFor(state.page))}</span><div class="topright">${tag('Local workspace')}${iconButton('Sparkles', 'Open workspace guide', 'open-helper').replace('class="iconbutton"', 'class="iconbutton mobileassistant"')}</div></div>${messageArea()}${draftNotice()}${pageView()}<p class="note portal-footnote">Saved changes stay separate from the published traveler until you review and publish a version. Operational feeds remain disconnected.</p></main>${helper()}`;
  }
  renderDialog();
  if (focused && !state.dialog) document.getElementById(focused)?.focus();
}
function pageView() {
  return ({ overview, setup: setupView, knowledge, appearance, controls, connections, activity, bookings: operationsView, analytics: operationsView, conversations: operationsView })[state.page]();
}

function overview() {
  const connection = state.workspace.connection;
  const sources = state.workspace.knowledge;
  return heading('Your travel business.<br>A new way to connect.', 'Your space to shape the experience and keep your business moving.', button('Set up your experience', 'step:' + (connection.configured && modelConnection().configured ? 1 : 0), true, 'ArrowRight')) +
    `<div class="metrics working-metrics">${metric('Approved knowledge', sources.filter(source => source.status === 'Published').length, 'Saved in this portal')}${metric('Drafts to review', sources.filter(source => source.status === 'Draft').length, 'Not approved yet')}${metric('Traveler experience', runtime().active ? runtime().status === 'ready' ? 'Live' : 'Offline' : '—', runtime().active ? 'Published local runtime · server status' : 'Not published · review and preview first')}</div>` +
    card('Bring your experience to life', row('Signal', 'Connect your Nuitée account', connection.configured ? 'Your key is stored. Check status and the selected environment.' : 'Save the key from your business account, then check the connection.', connectionTag() + iconButton('ChevronRight', 'Manage Nuitée connection', 'step:0')) + row('Sparkles', 'Connect your model account', modelConnection().configured ? 'Your model connection is saved. Private preview will use it.' : 'Bring the model API endpoint, model name and key for your business.', tag(modelConnection().configured ? 'Key stored' : 'Not configured') + iconButton('ChevronRight', 'Manage model connection', 'step:0')) + row('Swatch', 'Make the experience yours', 'Set your brand, welcome, language and assistant preferences.', tag('Saved preferences') + iconButton('ChevronRight', 'Configure your experience', 'step:1')) + row('ChatBubbleLeftRight', 'See your saved branding', 'A visual preview of the settings saved in this portal.', iconButton('ChevronRight', 'Open visual preview', 'step:2')) + row('PaperAirplane', 'Publish your traveler experience', runtime().active ? 'Review the currently published version and any newer saved changes.' : 'Prepare saved content, try the real chat privately, then review publication.', tag(runtime().active ? 'Published locally' : 'Not published', runtime().active ? 'teal' : '') + iconButton('ChevronRight', 'Review launch availability', 'step:3'))) +
    `<div class="operationscards"><section class="card"><div class="cardbody">${glyph('BookOpen')}<h3>Every booking, in one place.</h3><p>Booking and payment records will appear when a verified source is connected.</p>${button('View bookings', 'page:bookings', false, 'ArrowRight')}</div></section><section class="card"><div class="cardbody">${glyph('Signal')}<h3>See how your business is doing.</h3><p>Real activity and trends will follow a supported analytics connection.</p>${button('View analytics', 'page:analytics', false, 'ArrowRight')}</div></section></div>`;
}
function setupView() {
  return heading('Your experience.<br>Ready when you are.', 'Connect your account. Make it yours. See what comes next.') + `<nav class="setupsteps" aria-label="Experience setup steps">${steps.map((label, index) => `<button class="setupstep ${state.step === index ? 'active' : ''}" data-action="step:${index}" ${state.step === index ? 'aria-current="step"' : ''}><span class="stepnumber">${index + 1}</span><span>${label}</span></button>`).join('')}</nav>` + [setupConnect, configure, previewView, launchView][state.step]();
}
function settingsField(id, label, key, { values, max = 40, textarea = false, hint = '' } = {}) {
  const value = getPath(draft(), key);
  const input = values ? `<select id="${id}" data-setting="${key}">${options(values, value)}</select>` : textarea ? `<textarea id="${id}" data-setting="${key}" maxlength="${max}" required>${esc(value)}</textarea>` : `<input id="${id}" data-setting="${key}" value="${esc(value)}" maxlength="${max}" required>`;
  return `<div class="field"><label for="${id}">${esc(label)}</label>${input}${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
}
function configure() {
  return card('Make it your business', `<form id="settings-form" class="cardbody stack"><fieldset class="plain-fieldset stack" ${state.busy ? 'disabled' : ''}><div class="formgrid">${settingsField('setup-name', 'Business name', 'name')}${settingsField('setup-currency', 'Display currency', 'currency', { values: ['CAD', 'USD', 'GBP', 'EUR'] })}</div>${runtimeSettingsNotice()}${settingsField('setup-welcome', 'Welcome message', 'welcome', { textarea: true, max: 90, hint: 'The first words your travelers will see after you publish a reviewed version.' })}<div class="formgrid">${settingsField('setup-language', 'Language', 'language', { values: ['English', 'French', 'Spanish'] })}${settingsField('setup-tone', 'Agent tone', 'tone', { values: ['Warm and helpful', 'Concise and practical', 'Thoughtful and detailed'] })}</div><div class="setuprelated"><div><h3>A little more you</h3><p>Fine-tune your look, assistant preferences and business FAQs.</p></div><div class="row wrap">${button('Appearance', 'page:appearance', false, 'Swatch')}${button('Agent controls', 'page:controls', false, 'AdjustmentsHorizontal')}${button('Knowledge', 'page:knowledge', false, 'BookOpen')}</div></div><div class="setupfooter"><span class="small muted">Saving updates portal preferences. It does not change the current traveler assistant.</span><button class="pill primary" type="submit">Review and save ${icon('ArrowRight')}</button></div></fieldset></form>`, tag('Portal preferences'));
}
function visualCard(settings, editing = false) {
  const translated = { English: 'Where would you like to go?', French: 'Où souhaitez-vous aller ?', Spanish: '¿Adónde te gustaría ir?' };
  return `<div class="travelerwindow"><div class="travelerbar"><span class="row"><span class="businessmark compact-mark">${esc(settings.initials)}</span><strong>${esc(settings.name)}</strong></span>${tag(editing ? 'Unsaved visual' : 'Visual preview')}</div><div class="travelerbody"><div class="previewhero">${esc(settings.welcome)}</div><p class="small muted">${esc(settings.language)} · ${esc(settings.currency)} · ${esc(settings.tone)}</p><div class="promptchips">${settings.capabilities.hotels ? `<span class="tag" style="background:${esc(settings.theme)}">${icon('BuildingOffice2')}Hotel planning</span>` : ''}${settings.capabilities.flights ? tag('Flight search') : ''}</div><div class="previewcomposer"><span>${esc(translated[settings.language] || translated.English)}</span><span class="send">${icon('ArrowUp')}</span></div><p class="note">Visual only. No AI response, search or booking is available in this panel.</p></div></div>`;
}
function travelerLink() {
  const value = state.workspace.runtime.travelerUrl;
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const active = runtime().active;
    return `<div class="launchlink sectionspace"><div><h3>Your traveler storefront</h3><p>${active ? 'Opens the currently published version. Later saved or unsaved changes are not applied until you publish again.' : 'Opens the configured storefront. No portal version has been published to it yet.'}</p></div><a class="pill" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${active ? 'Open published storefront' : 'Open traveler storefront'} ${icon('ArrowTopRightOnSquare')}</a></div>`;
  } catch { return ''; }
}
function previewView() {
  return `<div class="previewsummary"><div><h2>A first look at your brand</h2><p class="small muted">This shows your saved portal settings.</p></div>${tag('Not a live chat')}</div>${visualCard(saved())}${card('Prepare a reviewed version', `<div class="cardbody stack"><p class="small muted">Review your saved preferences, approved knowledge, travel provider and model connection metadata together. Preparing a version saves a fixed copy in this portal. Your traveler stays unchanged.</p>${state.modelDraft ? banner('Model connection edits are unsaved', 'Save or discard these fields in Connections before reviewing your saved version.', 'Clock') : ''}${settingsDirty() ? banner('Save or discard your settings edits first', 'Your unsaved settings are kept in this tab. Save them to include them, or discard them before preparing the saved version.', 'Clock') : ''}<div class="setupfooter"><span class="small muted">${state.workspace.releaseCurrent ? 'The latest prepared version already matches your saved content.' : 'Saved knowledge drafts and unsaved source edits are excluded. API keys are never included.'}</span>${button('Review saved version', 'review-release', true, 'Eye', settingsDirty() || Boolean(state.modelDraft))}</div></div>`, tag('Review before launch'), 'sectionspace')}${runtimePreviewCard()}${travelerLink()}<div class="setupfooter sectionspace"><span class="small muted">Preparation and launch are separate. Your current traveler remains unchanged.</span>${button('Review launch availability', 'step:3', false, 'ArrowRight')}</div>`;
}
function launchView() {
  const active = runtime().active;
  const current = activeCurrent();
  const healthy = runtime().status === 'ready';
  const status = active ? healthy ? 'Published locally' : 'Health unavailable' : runtime().enabled ? 'Not published' : 'Not connected';
  const activeFacts = active ? `<dl class="ops-detail-facts"><div><dt>Published on</dt><dd>${esc(displayDate(active.activatedAt))}</dd></div><div><dt>Saved content</dt><dd>${current ? 'Matches the published version' : 'Changes have not been published'}</dd></div></dl><details class="sectionspace"><summary class="small">Published version details</summary><dl class="ops-detail-facts"><div><dt>Version ID</dt><dd>${esc(active.releaseId)}</dd></div><div><dt>SHA-256 digest</dt><dd>${esc(active.digest)}</dd></div></dl></details>` : '<p class="small muted">No version has been published from this portal.</p>';
  return preparedReleaseCard() + runtimePreviewCard() + card('Publish your traveler experience', `<div class="cardbody stack">${banner(active ? healthy ? 'Your published version is serving travelers' : 'Published runtime needs attention' : 'Review, preview, then publish', runtime().message || 'Publishing starts the reviewed version and switches the storefront only after the runtime is healthy.', active && healthy ? 'CheckCircle' : 'Signal')}${activeFacts}<div class="setupfooter"><p class="small muted">${settingsDirty() ? 'Unsaved settings must be saved or discarded first.' : current && healthy ? 'The current saved version is already published.' : 'Publish only after trying the exact prepared version in the private chat preview. Failed publication keeps the previous active version.'}</p>${button(current && healthy ? 'Current version published' : 'Review publication', 'review-publication', true, 'PaperAirplane', !publishReady() || (current && healthy))}</div>${travelerLink()}</div>`, tag(status, active && healthy ? 'teal' : 'amber'), 'sectionspace');
}

function runtimePreviewCard() {
  const release = state.workspace.release;
  const blockers = previewBlockers(release);
  const ready = previewReady(release) && !blockers.length;
  const link = ready && state.previewAccess && state.previewAccess.releaseId === release.id && state.previewAccess.digest === release.digest ? state.previewAccess.url : null;
  const title = runtime().enabled ? 'Try the real chat privately' : 'Private chat preview';
  const body = `<div class="cardbody stack"><p class="small muted">This starts the actual assistant with the prepared settings, approved knowledge and saved server-side credentials. Your model and travel services may receive requests when you use the chat.</p>${blockers.length ? `<div class="connectionfeedback"><div>${icon('Clock')}</div><div><h3>Complete the setup first</h3>${blockers.map(issue => `<p>${esc(issue)}</p>`).join('')}</div></div><div class="row wrap">${!state.workspace.connection.configured || !modelConnection().configured || state.modelDraft ? button('Configure connections', 'step:0', false, 'Signal') : ''}${!release || !state.workspace.releaseCurrent || release.schemaVersion !== 2 ? button('Review saved content', 'step:2', false, 'Eye') : ''}${release && runtimeLimitations(release.settings).length ? button('Review preferences', 'page:controls') + button('Review currency', 'step:1') : ''}</div>` : ''}<div class="setupfooter"><span class="small muted">${ready ? 'The server reports this exact prepared version ready for private preview.' : 'No scripted replies. Publication remains a separate, explicit step.'}</span>${button(ready ? 'Get a new preview link' : 'Preview saved version', ready ? 'preview-link' : 'start-runtime-preview', !link, 'ChatBubbleLeftRight', runtimeBusy() || blockers.length > 0)}</div>${link ? `<div class="runtime-preview-access" role="status"><a class="pill primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer" data-preview-access>Open private chat preview ${icon('ArrowTopRightOnSquare')}</a><p class="note">One-time access link. It opens a separate tab and does not publish this version. Generate a new link if you need to open it again.</p></div>` : ''}<p class="small muted">Only the prepared version is used. Saved knowledge drafts and unsaved source edits are excluded.</p><div class="row wrap">${button('Refresh runtime status', 'refresh-runtime', false, 'Signal')}</div></div>`;
  return card(title, body, tag(ready ? 'Exact version ready' : runtime().busy ? 'Working' : 'Not ready', ready ? 'teal' : ''), 'sectionspace');
}

function releaseCandidate() {
  const connection = state.workspace.connection;
  return {
    sourceRevision: state.workspace.revision,
    settings: clone(saved()),
    knowledge: state.workspace.knowledge.filter(source => source.status === 'Published').map(({ id, title, kind, content, version }) => ({ id, title, kind, content, version })),
    schemaVersion: runtime().enabled ? 2 : 1,
    ...(runtime().enabled ? { assistant: { configured: modelConnection().configured, baseUrl: modelConnection().baseUrl, model: modelConnection().model, transport: modelConnection().transport, credentialVersion: modelConnection().version || null } } : {}),
    provider: { configured: connection.configured, environment: connection.environment, status: connection.status, credentialVersion: connection.version || null },
    excludedDraftCount: state.workspace.knowledge.filter(source => source.status === 'Draft').length,
    hasUnsavedSources: sourceDraftsDirty(),
    alreadyPrepared: Boolean(state.workspace.releaseCurrent)
  };
}

function releaseMetadata(release) {
  const facts = fields => `<dl class="ops-detail-facts">${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  return facts([['Prepared on', displayDate(release.createdAt)], ['Saved workspace revision', release.sourceRevision]]) + `<details class="sectionspace"><summary class="small">Version details</summary>${facts([['Version ID', release.id], ['SHA-256 digest', release.digest]])}</details>`;
}

function preparedReleaseCard() {
  const release = state.workspace.release;
  if (!release) return card('Your reviewed version', empty('No version has been prepared yet', 'Review your saved settings and approved knowledge before preparing a fixed copy. Preparation does not launch the traveler.', 'BookOpen', button('Review saved content', 'step:2', true, 'Eye')), tag('Not prepared'));
  const current = state.workspace.releaseCurrent;
  return card('Latest prepared version', `<div class="cardbody stack"><div><h3 class="preserve-text">${esc(release.settings.name)}</h3><p class="note">${current ? 'This prepared version matches your current saved content.' : 'Saved settings, approved knowledge or connection metadata have changed since this version was prepared.'}${settingsDirty() ? ' Unsaved settings are not included.' : ''} ${exactVersion(runtime().active, release) ? 'This is the currently published version.' : 'This is a prepared copy; it is not the currently published version.'}</p></div>${releaseMetadata(release)}<div class="row wrap">${button('Review prepared version', 'view-release:' + release.id, false, 'Eye')}${button('Download reviewed JSON', 'download-release:' + release.id, false, 'ArrowTopRightOnSquare')}${!current ? button('Review latest saved content', 'step:2', true) : ''}</div><p class="small muted">The downloaded record includes reviewed business settings and approved source text. It contains travel and model connection metadata but no API keys.</p></div>`, tag(current ? 'Matches saved content' : 'Newer saved changes', current ? 'teal' : 'amber'));
}

function releaseContents(release) {
  const provider = release.provider;
  const status = { disconnected: 'Not connected', saved: 'Key saved, not checked', verified: 'Read-only key check passed', rejected: 'Key rejected', unavailable: 'Key check unavailable' }[provider.status] || provider.status;
  const providerFields = [['Saved key', provider.configured ? 'Configured; API key excluded' : 'Not configured'], ['Selected environment', provider.environment ? provider.environment + ' · owner-selected, not verified' : 'Not selected'], ['Check status', status]];
  const assistant = release.assistant;
  const modelFields = assistant ? [['Saved model key', assistant.configured ? 'Configured; API key excluded' : 'Not configured'], ['API base URL', assistant.baseUrl || 'Not configured'], ['Model', assistant.model || 'Not configured'], ['Transport', assistant.transport]] : [['Model connection', 'Not included in this older prepared version. Prepare a new version before previewing.']];
  const facts = fields => `<dl class="ops-detail-facts">${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  return `<section class="stack"><h3>Saved business and agent settings</h3>${settingsSummary(release.settings)}</section><section class="stack sectionspace"><h3>Approved knowledge · ${release.knowledge.length} ${release.knowledge.length === 1 ? 'source' : 'sources'}</h3>${release.knowledge.length ? release.knowledge.map(source => `<article class="reviewbox"><div class="chatlabel">${esc(source.kind)} · version ${esc(source.version)}</div><h3 class="preserve-text">${esc(source.title)}</h3><p class="preserve-text">${esc(source.content)}</p></article>`).join('') : '<p class="small muted">No approved knowledge is included in this version.</p>'}</section><section class="stack sectionspace"><h3>Travel provider metadata</h3>${facts(providerFields)}<p class="small muted">The API key is not included. Connection metadata does not establish booking or ticketing permissions.</p></section><section class="stack sectionspace"><h3>Model connection metadata</h3>${facts(modelFields)}<p class="small muted">No model API key is included. Saving a connection does not validate it with the model provider.</p></section>`;
}

function reviewRelease() {
  if (settingsDirty() || state.modelDraft) {
    state.error = 'Save or discard your unsaved settings and model connection fields before reviewing a prepared version. Your edits are still kept in this tab.';
    render(); return;
  }
  openDialog('release-prepare', { candidate: releaseCandidate() });
}

async function readPreparedRelease(id, download = false) {
  if (!/^r_[a-zA-Z0-9-]+$/.test(id)) return;
  const returnAction = document.activeElement?.dataset.action;
  state.busy = true; state.error = ''; state.notice = ''; render();
  try {
    const { release } = await api('/api/releases/' + encodeURIComponent(id));
    if (release?.id !== id) throw new Error('The requested prepared version could not be verified. Please try again.');
    if (download) {
      const blob = new Blob([JSON.stringify(release, null, 2) + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'portal-reviewed-' + id + '.json';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      state.notice = 'The reviewed JSON download is ready. It has not been sent to the traveler.';
    } else {
      state.dialog = { type: 'release-details', release: clone(release) };
    }
  } catch (error) { handleError(error); }
  finally {
    state.busy = false; render();
    if (!download && returnAction) state.dialogReturn = document.querySelector(`[data-action="${CSS.escape(returnAction)}"]`);
  }
}

function validatePreviewLink(value) {
  const storefront = new URL(runtime().travelerUrl);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(storefront.protocol) || url.origin !== storefront.origin || url.username || url.password || url.pathname !== '/studio-preview' || url.search || !/^#ticket=[A-Za-z0-9_-]{43}$/.test(url.hash)) {
    throw new Error('The server returned an unexpected preview address. Refresh the runtime status and try again.');
  }
  return url.href;
}
async function requestPreviewLink(release) {
  const result = await api('/api/runtime/preview-link', { method: 'POST', body: { releaseId: release.id } });
  state.previewAccess = { releaseId: release.id, digest: release.digest, url: validatePreviewLink(result.url) };
}
async function refreshRuntime() {
  if (state.busy) return;
  state.busy = true; state.error = ''; state.notice = ''; render();
  try {
    acceptWorkspace(await api('/api/workspace'));
    // A publication must be reviewed again after loading different saved state.
    if (state.dialog?.type === 'runtime-publish') state.dialog = null;
    state.notice = 'Runtime status refreshed from the server. Unsaved edits are kept in this tab.';
  } catch (error) { handleError(error); }
  finally { state.busy = false; render(); }
}
function reviewPublication() {
  if (!publishReady()) {
    state.error = 'Prepare and privately preview the current saved version before reviewing publication. Save or discard any settings or model edits first.';
    render(); return;
  }
  openDialog('runtime-publish', { release: clone(state.workspace.release), revision: state.workspace.revision });
}
async function runtimeAction(action) {
  if (runtimeBusy()) return;
  const publishing = action === 'publish';
  if (publishing && state.dialog?.type !== 'runtime-publish') return;
  const release = clone(publishing ? state.dialog.release : state.workspace.release);
  const revision = publishing ? state.dialog.revision : state.workspace.revision;
  const exactLatest = release && release.id === state.workspace.release?.id && release.digest === state.workspace.release?.digest;
  if (!exactLatest || previewBlockers(release).length || ((publishing || action === 'link') && !previewReady(release))) {
    state.error = 'This version is not ready. Refresh the runtime status and review the current saved version before continuing.';
    render(); return;
  }
  state.busy = true; state.error = ''; state.notice = ''; state.previewAccess = null;
  state.runtimeTask = publishing ? 'Starting the reviewed traveler version. The current storefront switches only after the new version is healthy…' : action === 'link' ? 'Preparing one-time private chat access…' : 'Starting the actual assistant for this reviewed version. This may take a little while…';
  render();
  try {
    if (action !== 'link') {
      const workspace = await api('/api/runtime/' + (publishing ? 'publish' : 'preview'), { method: 'POST', body: { revision, releaseId: release.id } });
      acceptWorkspace(workspace);
      if (publishing) {
        if (runtime().status !== 'ready' || !exactVersion(runtime().active, release)) throw new Error('The server did not confirm this version as published and healthy. Refresh status before trying again.');
        state.dialog = null;
        state.notice = 'The server confirmed your reviewed version is published locally. Open the published storefront to see it.';
      } else if (!previewReady(release) || !state.workspace.releaseCurrent || state.workspace.release?.id !== release.id) {
        throw new Error('The server did not confirm this exact saved version as ready for preview. Refresh status before trying again.');
      }
    }
    if (!publishing) {
      state.runtimeTask = 'Preparing one-time private chat access…'; render();
      await requestPreviewLink(release);
      state.notice = 'Your private preview is ready. Use Open private chat preview to try the actual assistant in a separate tab.';
    }
    state.conflict = false;
  } catch (error) {
    handleError(error);
    // A failed start can still change runtime health. Keep the original failure
    // visible while reading authoritative active/preview metadata again.
    if (state.session?.user) {
      try { acceptWorkspace(await api('/api/workspace')); }
      catch (refreshError) { if (refreshError.status === 401) handleError(refreshError); }
    }
  } finally { state.busy = false; state.runtimeTask = ''; render(); }
}
function connectionTag() {
  const connection = state.workspace.connection;
  const labels = { disconnected: 'Not connected', saved: 'Key saved', verified: 'Key check passed', rejected: 'Key rejected', unavailable: 'Check unavailable' };
  return tag(labels[connection.status] || 'Not connected', connection.status === 'verified' ? 'teal' : ['rejected', 'unavailable'].includes(connection.status) ? 'amber' : '');
}
function connectionEditor() {
  const connection = state.workspace.connection;
  const descriptions = {
    disconnected: 'Save your own Nuitée key to prepare the connection. No provider request is made when you save.',
    saved: 'Your key is stored. Run an explicit read-only check when you are ready.',
    verified: 'The saved key passed a read-only provider check. Booking and ticketing permissions have not been verified.',
    rejected: 'The provider rejected the saved key. Replace it or check again after reviewing your Nuitée account.',
    unavailable: 'The connection could not be checked. Your saved key has been retained; you can try again.'
  };
  return card('Connect Nuitée', `<div class="cardbody stack"><div class="connectionfeedback ${connection.status === 'verified' ? 'success' : ''}">${icon(connection.status === 'verified' ? 'CheckCircle' : 'LockClosed')}<div><h3>${connection.configured ? 'Your saved connection' : 'Your account, your business.'}</h3><p>${esc(descriptions[connection.status] || descriptions.disconnected)}</p><p class="connection-time">Last checked: ${esc(displayDate(connection.checkedAt))}${connection.environment ? '<br>Selected environment: ' + esc(connection.environment) + ' · not verified by this check' : ''}</p></div></div><form id="connection-form" class="stack"><fieldset class="plain-fieldset stack" ${state.busy ? 'disabled' : ''}><div class="field"><label for="api-key">${connection.configured ? 'Replacement Nuitée API key' : 'Nuitée API key'}</label><div class="keyfield"><input id="api-key" name="apiKey" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" minlength="8" maxlength="512" required aria-describedby="key-note">${icon('LockClosed')}</div><small id="key-note">Encrypted at rest on this machine. The saved key is never returned to this page. The field is cleared when submitted.</small></div><div class="field"><label for="key-environment">Account environment</label><select id="key-environment" name="environment">${options(['sandbox', 'production'], state.connectionEnvironment || connection.environment || 'sandbox')}</select><small>You select this from your Nuitée account. A key check does not verify the environment or enable production checkout.</small></div><div class="setupfooter"><span class="small muted">Saving stores the key; it does not contact Nuitée or update the current traveler.</span><button class="pill primary" type="submit">${connection.configured ? 'Save replacement key' : 'Save key securely'}</button></div></fieldset></form>${connection.configured ? `<div class="setuprelated"><div class="row wrap">${button(state.busy ? 'Please wait…' : 'Check saved key', 'check-key', true, 'Signal')}${button('Remove saved key', 'remove-key')}${button('Continue to configuration', 'step:1', false, 'ArrowRight')}</div><p class="small muted">Check saved key sends one read-only request to Nuitée. It does not search, reserve, charge or issue a ticket.</p></div>` : ''}</div>`, connectionTag());
}
function setupConnect() {
  return connectionEditor() + modelEditor();
}
function modelEditor() {
  const connection = modelConnection();
  if (!runtime().enabled) return card('Model connection', empty('Connect the local traveler runtime first', 'Model configuration is available in the integrated workspace. This standalone portal has no model runtime connection.', 'Signal'), tag('Not connected'), 'sectionspace');
  const values = state.modelDraft || modelFields();
  return card('Connect your model', `<div class="cardbody stack"><p class="small muted">Use your business’s existing model account or compatible model server. A public Wayfare embed cannot supply the hidden model API key for this connection.</p>${connection.configured ? `<div class="connectionfeedback"><div>${icon('LockClosed')}</div><div><h3>Model connection saved</h3><p>${esc(connection.model)} · ${esc(connection.transport)}</p><p>${esc(connection.baseUrl)}</p><p>The key is stored server-side. This saved status is not a successful model check.</p></div></div>` : ''}<div id="model-draft-note" class="row wrap ${state.modelDraft ? '' : 'hidden'}"><span class="small muted">Unsaved model connection fields are kept in this tab.</span>${button('Discard model edits', 'discard-model-edits')}</div><form id="model-form" class="stack"><fieldset class="plain-fieldset stack" ${state.busy ? 'disabled' : ''}><div class="field"><label for="model-base-url">Model API base URL</label><input id="model-base-url" name="baseUrl" type="url" pattern="https://.*" data-model="baseUrl" maxlength="2048" value="${esc(values.baseUrl)}" required><small>Use your provider’s HTTPS API base URL. HTTP model endpoints are not supported by the connected SDK.</small></div><div class="formgrid"><div class="field"><label for="model-name">Model name</label><input id="model-name" name="model" data-model="model" maxlength="120" value="${esc(values.model)}" placeholder="Name from your provider" required></div><div class="field"><label for="model-transport">API transport</label><select id="model-transport" name="transport" data-model="transport"><option value="responses" ${values.transport === 'responses' ? 'selected' : ''}>Responses API</option><option value="chat-completions" ${values.transport === 'chat-completions' ? 'selected' : ''}>Chat Completions API</option></select></div></div><div class="field"><label for="model-api-key">${connection.configured ? 'Replacement model API key' : 'Model API key'}</label><div class="keyfield"><input id="model-api-key" name="apiKey" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" minlength="8" maxlength="2048" required aria-describedby="model-key-note">${icon('LockClosed')}</div><small id="model-key-note">Encrypted on this machine. The field is cleared when submitted; the saved key is never returned to this page or included in reviewed JSON.</small></div><div class="setupfooter"><span class="small muted">Saving does not call your model provider. A real private preview uses this connection.</span><button class="pill primary" type="submit">${connection.configured ? 'Save replacement model connection' : 'Save model connection'}</button></div></fieldset></form>${connection.configured ? `<div class="row wrap">${button('Remove model connection', 'remove-model')}${button('Continue to configuration', 'step:1', false, 'ArrowRight')}</div>` : ''}</div>`, tag(connection.configured ? 'Key stored' : 'Not configured'), 'sectionspace');
}
function connections() {
  return heading('Connected.<br>With a clear picture.', 'Your travel provider, model account and traveler experience.') + setupConnect() + card('Your experience and data', row('ChatBubbleLeftRight', 'Traveler runtime', runtime().message || 'Review runtime setup, private preview and publication.', tag(runtime().status === 'ready' ? 'Ready' : runtime().status === 'unavailable' ? 'Unavailable' : 'Not connected', runtime().status === 'ready' ? 'teal' : '') + iconButton('ChevronRight', 'Review traveler publication', 'step:3')) + row('CircleStack', 'Bookings and analytics', 'No booking ledger or analytics feed is connected.', tag('Not connected')) + row('PaperAirplane', 'Flight ticketing', 'Flight search does not issue tickets.', tag('Not enabled')), button('Refresh status', 'refresh-runtime', false, 'Signal'), 'sectionspace');
}
function appearance() {
  return heading('Your name.<br>Your welcome.', 'Make the visual experience feel like your business.', button('Review and save', 'review-settings', true)) + `<div class="formgrid appearance-columns">${card('Brand basics', `<form id="settings-form" class="cardbody stack">${settingsField('brand-name', 'Business name', 'name')}${settingsField('brand-initials', 'Logo initials', 'initials', { max: 3 })}${settingsField('brand-welcome', 'Welcome headline', 'welcome', { textarea: true, max: 90 })}<div class="field"><label>Selected-item accent</label><div class="colorbuttons">${['#66ccff', '#bde8db', '#ead9b5'].map((color, index) => `<button type="button" class="swatch ${draft().theme === color ? 'selected' : ''}" style="background:${color}" data-color="${color}" aria-label="${['Sky blue', 'Soft seafoam', 'Warm sand'][index]} accent" aria-pressed="${draft().theme === color}"></button>`).join('')}</div><small>Color marks a selection; default actions stay black and white.</small></div></form>`, tag('Editable preferences'))}<div><div id="appearance-preview">${visualCard(draft(), settingsDirty())}</div><p class="note">This visual follows your edits. Review and save to keep them; nothing is published to the traveler.</p></div></div>`;
}
function controls() {
  const caps = [
    ['flights', 'PaperAirplane', 'Flight search', 'Search and fare verification preferences. This does not enable ticketing.'],
    ['hotels', 'BuildingOffice2', 'Hotel planning', 'Include hotel planning in the proposed experience, subject to supported provider access.'],
    ['experiences', 'GlobeAlt', 'Experiences', 'Planning preference only. Only fictional planning examples are available; there is no live inventory.'],
    ['cars', 'GlobeAlt', 'Car rentals', 'Fictional planning examples only. No live car inventory or reservations.'],
    ['checkout', 'ShieldCheck', 'Hotel checkout', 'Unavailable in this runtime. This setting must stay off for preview and publication.']
  ];
  return heading('Helpful defaults.<br>Clear at the edges.', 'Set the preferences for your planned traveler assistant.', button('Review and save', 'review-settings', true)) + card('Conversation defaults', `<form id="settings-form" class="cardbody"><div class="formgrid">${settingsField('adults', 'Adults, when unspecified', 'adults', { values: ['1 adult', '2 adults'] })}${settingsField('nights', 'Stay length, when unspecified', 'nights', { values: ['1 night', '2 nights', '3 nights'] })}</div><p class="note">The connected assistant should disclose assumptions and use the traveler’s stated dates and party size.</p></form>`) + card('Experience preferences', `<div class="cardbody">${runtimeSettingsNotice()}<div class="capabilitygrid">${caps.map(([key, image, title, description]) => `<div class="capability"><div class="spread">${icon(image)}${tag(key === 'checkout' ? 'Unavailable' : key === 'cars' || key === 'experiences' ? 'Fictional only' : 'Preference only')}</div><h3>${title}</h3><p>${description}</p><div class="spread"><span class="small muted">Include in settings</span><button class="toggle ${draft().capabilities[key] ? 'on' : ''}" role="switch" data-capability="${key}" aria-label="Include ${title} in settings" aria-checked="${draft().capabilities[key]}" ${state.busy || (key === 'checkout' && !draft().capabilities[key]) ? 'disabled' : ''}></button></div></div>`).join('')}</div></div>`, '', 'sectionspace');
}

function knowledgeRows() {
  const query = state.knowledgeQuery.trim().toLowerCase();
  const sources = state.workspace.knowledge.filter(source => (state.knowledgeStatus === 'all' || source.status === state.knowledgeStatus) && [source.title, source.content].join(' ').toLowerCase().includes(query));
  if (!sources.length) return empty(state.workspace.knowledge.length ? 'No sources match' : 'Your knowledge starts here', state.workspace.knowledge.length ? 'Try another search or source status.' : 'Add your business facts, FAQs and policies. Each source begins as a draft.', 'BookOpen', !state.workspace.knowledge.length ? button('Add your first source', 'add-knowledge', true, 'Plus') : '');
  return sources.map(source => row('BookOpen', source.title, source.kind + ' · version ' + source.version + (source.sourceId ? ' · revision draft' : ''), tag(source.status === 'Published' ? 'Approved' : 'Draft', source.status === 'Draft' ? 'amber' : 'teal') + `<button class="textbutton" data-action="edit-source:${esc(source.id)}">${source.status === 'Published' ? 'Edit' : 'Review draft'}</button>`)).join('');
}
function knowledge() {
  const localDrafts = Object.entries(state.sourceDrafts).filter(([, source]) => source.dirty);
  const resume = localDrafts.length ? `<section class="source-draft-notice"><h3>Unsaved source edits in this tab</h3>${localDrafts.map(([key, source]) => `<div class="row wrap"><span class="small">${esc(source.title || 'Untitled source')}</span>${button('Resume editing', 'resume-source:' + key)}${button('Discard', 'discard-source:' + key)}</div>`).join('')}</section>` : '';
  return heading('The right knowledge.<br>A better next answer.', 'Keep business facts and policies ready for your assistant.', button('Add knowledge', 'add-knowledge', true, 'Plus')) + resume + card('Your sources', `<div class="toolbar"><label class="search" for="knowledge-search">${icon('MagnifyingGlass')}<input id="knowledge-search" type="search" aria-label="Search knowledge" placeholder="Search sources" maxlength="100" value="${esc(state.knowledgeQuery)}"></label><select id="knowledge-filter" aria-label="Filter knowledge status"><option value="all" ${state.knowledgeStatus === 'all' ? 'selected' : ''}>All sources</option><option value="Draft" ${state.knowledgeStatus === 'Draft' ? 'selected' : ''}>Drafts</option><option value="Published" ${state.knowledgeStatus === 'Published' ? 'selected' : ''}>Approved</option></select></div><div id="knowledge-list">${knowledgeRows()}</div>`, tag('Saved in your portal')) + banner('Approval stays distinct from publication', 'Approving a source saves its reviewed version here. Include approved knowledge in a reviewed version, try the private chat, then publish it to the traveler.', 'BookOpen', 'sectionspace');
}
function activity() {
  return heading('Every change.<br>A little more clarity.', 'Changes recorded by your authenticated portal account.') + card('Workspace history', state.workspace.history.length ? `<div class="timeline">${state.workspace.history.map(event => `<div class="timelineitem">${icon('Clock')}<div><h3>${esc(event.title)}</h3><p>${esc(event.detail)}</p><small>${esc(displayDate(event.time))}</small></div></div>`).join('')}</div>` : empty('No changes recorded yet', 'Saved changes will appear here with their server timestamp.', 'Clock'), tag('Recorded activity'));
}

async function loadOperations() {
  const page = state.page;
  if (!['bookings', 'analytics', 'conversations'].includes(page) || !state.session?.user) return;
  if (state.operations[page]?.loading || state.operations[page]?.loaded) return;
  state.operations[page] = { loading: true }; render();
  try { state.operations[page] = { loaded: true, data: await api('/api/' + page) }; }
  catch (error) { state.operations[page] = { error: error.message }; if (error.status === 401) handleError(error); }
  if (state.page === page) render();
}
function operationsView() {
  const page = state.page, status = state.operations[page];
  const copy = {
    bookings: ['Every booking.<br>A clearer picture.', 'Verified booking records will bring your reservations into one place.', 'Your bookings', 'Connect a booking source', 'No booking feed is connected. A saved Nuitée key and a flight selection are not confirmed bookings.', 'BookOpen'],
    analytics: ['See what is<br>moving your business.', 'Understand real activity once a supported event source is connected.', 'Business activity', 'Your analytics are not connected', 'Measured chats, booking value and conversion need verified events. No activity is inferred or presented as zero.', 'Signal'],
    conversations: ['Listen. Learn.<br>Make the next one better.', 'Review traveler conversations when a supported private feed is available.', 'Traveler conversations', 'Conversations are not connected', 'No traveler messages are loaded. A supported private conversation source is required before review can begin.', 'ChatBubbleLeftRight']
  }[page];
  const metrics = page === 'bookings' ? [['Hotel bookings', 'Booking source unavailable'], ['Flight bookings', 'Ticketing source unavailable'], ['Booking value', 'No verified amounts']] : page === 'analytics' ? [['Chat sessions', 'Event source unavailable'], ['Confirmed bookings', 'Booking source unavailable'], ['Business revenue', 'Financial source unavailable']] : [];
  return heading(copy[0], copy[1]) + (metrics.length ? `<div class="metrics working-metrics">${metrics.map(([label, text]) => metric(label, '—', text)).join('')}</div>` : '') + card(copy[2], status?.error ? empty('Source status could not be loaded', status.error, 'ExclamationTriangle', button('Try again', 'retry-operations', true)) : status?.loading ? empty('Checking source availability', 'Loading status from your portal…', 'Signal') : empty(copy[3], copy[4], copy[5], button('Review connections', 'page:connections')), tag(status?.error ? 'Unavailable' : status?.loading ? 'Loading' : 'Not connected'));
}

function openDialog(type, extra = {}) {
  state.dialogReturn = document.activeElement;
  state.dialog = { type, ...extra }; state.error = ''; renderDialog();
}
function closeDialog() {
  if (state.busy) return;
  const sourceEditor = state.dialog?.type === 'knowledge-edit';
  state.dialog = null; document.getElementById('modal').close();
  if (sourceEditor && state.page === 'knowledge') render();
  if (state.dialogReturn?.isConnected) state.dialogReturn.focus();
  else if (sourceEditor) document.querySelector('[data-action="add-knowledge"]')?.focus();
}
function settingsSummary(settings) {
  const fields = [['Business', settings.name], ['Welcome', settings.welcome], ['Logo initials', settings.initials], ['Language / currency', settings.language + ' / ' + settings.currency], ['Agent tone', settings.tone], ['Default party / stay', settings.adults + ' / ' + settings.nights], ['Included preferences', Object.entries(settings.capabilities).filter(([, value]) => value).map(([key]) => ({ flights: 'Flight search', hotels: 'Hotel planning', experiences: 'Experiences', cars: 'Car rentals', checkout: 'Hotel checkout' })[key]).join(', ') || 'None']];
  return `<dl class="ops-detail-facts">${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><div class="reviewmeta">Accent <span class="accent-dot" style="background:${esc(settings.theme)}"></span> ${esc(settings.theme)}. These are portal preferences; they do not grant provider permissions or publish to the traveler.</div>`;
}
function knowledgeForm() {
  const value = state.knowledgeDraft;
  return `<form id="knowledge-form" class="stack"><fieldset class="plain-fieldset stack" ${state.busy ? 'disabled' : ''}><div class="field"><label for="source-title">Source title</label><input id="source-title" data-source="title" maxlength="100" value="${esc(value.title)}" required></div><div class="field"><label for="source-kind">Type</label><select id="source-kind" data-source="kind">${options(['Business', 'FAQ', 'Policy'], value.kind)}</select></div><div class="field"><label for="source-content">Source content</label><textarea id="source-content" data-source="content" maxlength="4000" required>${esc(value.content)}</textarea><small>Write business facts and policies. Do not include credentials or private guest/payment details.</small></div></fieldset></form><p class="note">Saving a revision of an approved source keeps its current approved text intact.</p>`;
}
function dialogContent() {
  const dialog = state.dialog;
  if (dialog.type === 'runtime-publish') {
    const release = dialog.release;
    const exclusions = `${state.workspace.knowledge.filter(source => source.status === 'Draft').length} saved knowledge drafts are excluded.${sourceDraftsDirty() ? ' Unsaved source edits in this tab are also excluded.' : ''}`;
    return ['Publish this reviewed version?', `<p class="small muted">This publishes the exact version shown below to your local traveler storefront. It will use the saved server-side travel and model credentials for this version. The storefront switches only after the new version is healthy.</p><p class="note">${esc(exclusions)} Later saved changes require a new review and preview.</p>${runtime().active ? banner('Your current version stays active during startup', 'If publication fails, the previous version remains selected.', 'ShieldCheck', 'sectionspace') : ''}<div class="sectionspace">${releaseMetadata(release)}</div><div class="sectionspace">${releaseContents(release)}</div>`, button('Keep reviewing', 'close-dialog') + button('Publish reviewed version', 'publish-runtime', true, 'PaperAirplane', !publishReady(release))];
  }
  if (dialog.type === 'release-prepare') {
    const candidate = dialog.candidate;
    const exclusions = `${candidate.excludedDraftCount} saved ${candidate.excludedDraftCount === 1 ? 'draft is' : 'drafts are'} excluded.${candidate.hasUnsavedSources ? ' Unsaved source edits in this tab are also excluded.' : ''}`;
    return ['Review your saved version', `<p class="small muted">Review the exact saved content below before preparing it. This saves a fixed copy in your portal and does not activate the traveler.</p>${candidate.alreadyPrepared ? banner('This saved content is already prepared', 'Confirming again keeps the existing prepared version when the saved content is unchanged.', 'CheckCircle', 'sectionspace') : ''}<p class="note">Saved workspace revision ${esc(candidate.sourceRevision)}. ${exclusions}</p><div class="sectionspace">${releaseContents(candidate)}</div>`, button('Keep reviewing later', 'close-dialog') + button('Prepare reviewed version', 'prepare-release', true, 'Check', settingsDirty() || Boolean(state.modelDraft))];
  }
  if (dialog.type === 'release-details') {
    const release = dialog.release;
    return ['Review prepared version', `<p class="small muted">This is the fixed copy saved when the version was prepared. Later edits do not change its contents. ${exactVersion(runtime().active, release) ? 'This is the currently published version.' : 'This is not the currently published version.'}</p><div class="sectionspace">${releaseMetadata(release)}</div><div class="sectionspace">${releaseContents(release)}</div>`, button('Close review', 'close-dialog') + button('Download reviewed JSON', 'download-release:' + release.id, true, 'ArrowTopRightOnSquare')];
  }
  if (dialog.type === 'settings') return ['Review your settings', settingsSummary(dialog.settings), button('Keep editing', 'close-dialog') + button('Save portal settings', 'save-settings', true)];
  if (dialog.type === 'discard') return ['Discard unsaved settings?', '<p>Your last saved settings will remain. Unsaved brand, setup and agent preference edits in this tab will be removed.</p>', button('Keep editing', 'close-dialog') + button('Discard edits', 'confirm-discard', true)];
  if (dialog.type === 'discard-source') return ['Discard unsaved source edits?', '<p>This removes the edited source text kept in this tab. Saved and approved knowledge stays unchanged.</p>', button('Keep editing', 'close-dialog') + button('Discard source edits', 'confirm-discard-source', true)];
  if (dialog.type === 'logout') return ['Sign out of your studio?', '<p>' + (settingsDirty() || sourceDraftsDirty() || state.modelDraft ? 'Unsaved edits in this tab will be discarded. Saved records remain on this machine.' : 'Your saved settings, knowledge and connection will remain on this machine.') + '</p>', button('Stay signed in', 'close-dialog') + button('Sign out', 'confirm-logout', true)];
  if (dialog.type === 'remove-key') return ['Remove the saved Nuitée key?', '<p>This removes the encrypted travel key from this portal. In the connected local runtime it also stops the published traveler and private preview, and revokes preview access. Save a connection, prepare, preview and publish again to restart. It does not revoke the key in your Nuitée account.</p>', button('Keep key', 'close-dialog') + button('Remove key', 'confirm-remove-key', true)];
  if (dialog.type === 'remove-model') return ['Remove the saved model connection?', '<p>This removes the encrypted model key and connection from this portal. It also stops the published local traveler and private preview, and revokes preview access. Save a model connection, prepare, preview and publish again to restart. It does not revoke the key with your model provider.</p>', button('Keep model connection', 'close-dialog') + button('Remove model connection', 'confirm-remove-model', true)];
  if (dialog.type === 'knowledge-edit') return [state.knowledgeDraft.id ? 'Edit knowledge' : 'Add knowledge', knowledgeForm(), button('Keep editing later', 'close-dialog') + button('Save draft', 'save-knowledge', true, 'BookOpen')];
  if (dialog.type === 'knowledge-review') {
    const source = dialog.source;
    return ['Review knowledge for approval', `<p class="small muted">Read the saved draft below. Approval updates the portal’s reviewed knowledge only.</p><div class="reviewbox"><div class="chatlabel">${esc(source.kind)} · saved draft</div><h3 class="preserve-text">${esc(source.title)}</h3><p class="preserve-text">${esc(source.content)}</p></div><p class="note">The traveler assistant receives this content only after you prepare, preview and publish a version that includes it.</p>`, button('Edit draft', 'edit-source:' + source.id) + button('Approve in portal', 'publish-source:' + source.id, true, 'Check')];
  }
  return ['', '', ''];
}
function renderDialog() {
  const modal = document.getElementById('modal');
  if (!state.dialog || !state.session?.user) { if (modal.open) modal.close(); return; }
  const activeId = document.activeElement?.id;
  const [title, body, footer] = dialogContent();
  modal.innerHTML = `<div class="dialoghead"><h2 id="dialog-title">${esc(title)}</h2>${iconButton('XMark', 'Close dialog', 'close-dialog')}</div><div class="dialogbody">${messageArea()}${body}</div><div class="dialogfoot">${footer}</div>`;
  if (!modal.open) modal.showModal();
  else if (activeId) document.getElementById(activeId)?.focus();
}
function updateDraftUi() {
  const notice = document.getElementById('draft-notice');
  if (notice) notice.classList.toggle('hidden', !settingsDirty());
  const visual = document.getElementById('appearance-preview');
  if (visual) visual.innerHTML = visualCard(draft(), settingsDirty());
  const limitations = document.getElementById('runtime-settings-note');
  if (limitations) limitations.outerHTML = runtimeSettingsNotice();
}
function reviewSettings() {
  if (!draft().name.trim() || !draft().welcome.trim() || !draft().initials.trim()) {
    state.error = 'Complete the business name, logo initials and welcome message before saving.'; render(); return;
  }
  openDialog('settings', { settings: clone(draft()), revision: state.settingsDraft.revision });
}
function editKnowledge(id) {
  const source = id ? state.workspace.knowledge.find(item => item.id === id) : null;
  if (id && !source) { state.error = 'This source is no longer available. Load the latest workspace.'; state.conflict = true; render(); return; }
  const existingDraft = state.sourceDrafts[id || 'new'];
  if (existingDraft?.dirty) { state.knowledgeDraft = existingDraft; openDialog('knowledge-edit'); return; }
  if (source?.status === 'Draft') {
    openDialog('knowledge-review', { source: clone(source), revision: state.workspace.revision });
    return;
  }
  state.knowledgeDraft = source ? { id: source.id, title: source.title, kind: source.kind, content: source.content, revision: state.workspace.revision } : { title: '', kind: 'FAQ', content: '', revision: state.workspace.revision };
  state.sourceDrafts[id || 'new'] = state.knowledgeDraft;
  openDialog('knowledge-edit');
}

async function reloadWorkspace() {
  state.busy = true; render();
  try {
    const workspace = await api('/api/workspace');
    acceptWorkspace(workspace, { mergeEdits: true });
    let recoveredSource = false;
    Object.values(state.sourceDrafts).forEach(source => {
      source.revision = workspace.revision;
      if (source.id && !workspace.knowledge.some(item => item.id === source.id)) { delete source.id; recoveredSource = true; }
    });
    if (state.modelDraft) state.modelDraft.revision = workspace.revision;
    if (state.dialog?.type === 'settings') state.dialog = { type: 'settings', settings: clone(draft()), revision: state.settingsDraft.revision };
    if (state.dialog?.type === 'release-prepare') state.dialog = { type: 'release-prepare', candidate: releaseCandidate() };
    if (state.dialog?.type === 'runtime-publish') state.dialog = null;
    if (state.dialog?.type === 'knowledge-review') {
      const source = workspace.knowledge.find(item => item.id === state.dialog.source.id && item.status === 'Draft');
      state.dialog = source ? { type: 'knowledge-review', source: clone(source), revision: workspace.revision } : null;
    }
    state.conflict = false; state.error = ''; state.notice = 'Latest data loaded. Your edited settings and source text are kept. Review them before saving again.' + (recoveredSource ? ' A removed source’s text was recovered as a new draft.' : '');
  } catch (error) { handleError(error); }
  finally { state.busy = false; render(); }
}

async function handleAction(action) {
  if (state.busy) return;
  if (action.startsWith('view-release:')) return readPreparedRelease(action.slice(13));
  if (action.startsWith('download-release:')) return readPreparedRelease(action.slice(17), true);
  if (action.startsWith('page:')) return navigate(action.slice(5));
  if (action.startsWith('step:')) return navigate('setup', Math.max(0, Math.min(3, Number(action.slice(5)))));
  if (action.startsWith('resume-source:')) {
    const source = state.sourceDrafts[action.slice(14)];
    if (source) { state.knowledgeDraft = source; openDialog('knowledge-edit'); }
    return;
  }
  if (action.startsWith('discard-source:')) return openDialog('discard-source', { key: action.slice(15) });
  if (action.startsWith('edit-source:')) {
    const id = action.slice(12);
    if (state.dialog?.type === 'knowledge-review') {
      const source = state.dialog.source;
      state.knowledgeDraft = { id: source.id, title: source.title, kind: source.kind, content: source.content, revision: state.dialog.revision };
      state.sourceDrafts[source.id] = state.knowledgeDraft;
      return openDialog('knowledge-edit');
    }
    return editKnowledge(id);
  }
  if (action.startsWith('publish-source:')) {
    const id = action.slice(15);
    if (state.dialog?.type !== 'knowledge-review' || state.dialog.source.id !== id) return;
    return mutate('/api/knowledge/' + encodeURIComponent(id) + '/publish', 'POST', { revision: state.dialog.revision }, { notice: 'Knowledge approved inside this portal. No traveler publication was made.' });
  }
  switch (action) {
    case 'start-runtime-preview': await runtimeAction('preview'); break;
    case 'preview-link': await runtimeAction('link'); break;
    case 'refresh-runtime': await refreshRuntime(); break;
    case 'review-publication': reviewPublication(); break;
    case 'publish-runtime': await runtimeAction('publish'); break;
    case 'discard-model-edits': state.modelDraft = null; render(); break;
    case 'remove-model': openDialog('remove-model', { revision: state.workspace.revision }); break;
    case 'confirm-remove-model': {
      if (state.dialog?.type !== 'remove-model') break;
      await mutate('/api/model', 'DELETE', { revision: state.dialog.revision }, { savedModel: true, notice: 'The saved model connection was removed. Connected local runtimes and preview access have stopped.' });
      break;
    }
    case 'review-release': reviewRelease(); break;
    case 'prepare-release': {
      if (state.dialog?.type !== 'release-prepare') break;
      if (settingsDirty() || state.modelDraft) { state.error = 'Save or discard your unsaved settings and model connection fields before preparing this version.'; renderDialog(); break; }
      const revision = state.dialog.candidate.sourceRevision;
      await mutate('/api/releases', 'POST', { revision }, { notice: 'Your reviewed version is prepared in this portal. Preparing it did not change the published traveler.', nextStep: 3 });
      break;
    }
    case 'close-dialog': closeDialog(); break;
    case 'open-sidebar': state.panel = 'sidebar'; render(); document.querySelector('.sidebarclose')?.focus(); break;
    case 'open-helper': state.panel = 'helper'; render(); document.querySelector('.assistantclose')?.focus(); break;
    case 'close-panels': state.panel = null; render(); break;
    case 'review-settings': reviewSettings(); break;
    case 'save-settings': {
      if (state.dialog?.type !== 'settings') break;
      const settings = clone(state.dialog.settings); settings.name = settings.name.trim(); settings.welcome = settings.welcome.trim(); settings.initials = settings.initials.trim();
      await mutate('/api/settings', 'PUT', { revision: state.dialog.revision, settings }, { savedSettings: true, notice: 'Your preferences are saved in this portal. The current traveler is unchanged.', ...(state.page === 'setup' ? { nextStep: 2 } : {}) }); break;
    }
    case 'discard-settings': openDialog('discard'); break;
    case 'confirm-discard': state.settingsDraft = { base: clone(saved()), value: clone(saved()), revision: state.workspace.revision }; state.dialog = null; render(); break;
    case 'confirm-discard-source': {
      if (state.dialog?.type !== 'discard-source') break;
      const source = state.sourceDrafts[state.dialog.key];
      if (state.knowledgeDraft === source) state.knowledgeDraft = null;
      delete state.sourceDrafts[state.dialog.key]; state.dialog = null; render(); break;
    }
    case 'check-key': await mutate('/api/connection/check', 'POST', { revision: state.workspace.revision }, { notice: 'Provider check completed. Review the connection status and last-checked time.' }); break;
    case 'remove-key': openDialog('remove-key', { revision: state.workspace.revision }); break;
    case 'confirm-remove-key': {
      if (state.dialog?.type !== 'remove-key') break;
      await mutate('/api/connection', 'DELETE', { revision: state.dialog.revision }, { notice: 'The saved key was removed. Connected local runtimes and preview access have stopped.' }); break;
    }
    case 'add-knowledge': editKnowledge(); break;
    case 'resume-knowledge': openDialog('knowledge-edit'); break;
    case 'save-knowledge': {
      const value = state.knowledgeDraft;
      if (!value.title.trim() || !value.content.trim()) { state.error = 'Add a title and source content before saving.'; renderDialog(); break; }
      const body = { revision: value.revision, ...(value.id ? { id: value.id } : {}), title: value.title.trim(), kind: value.kind, content: value.content.trim() };
      if (await mutate('/api/knowledge', 'POST', body, { notice: 'Knowledge draft saved. Review and approve it when ready.' })) { Object.entries(state.sourceDrafts).forEach(([key, source]) => { if (source === value) delete state.sourceDrafts[key]; }); state.knowledgeDraft = null; render(); }
      break;
    }
    case 'reload-workspace': await reloadWorkspace(); break;
    case 'retry-operations': delete state.operations[state.page]; await loadOperations(); break;
    case 'retry-load': await initialize(); break;
    case 'logout': openDialog('logout'); break;
    case 'confirm-logout': {
      state.busy = true; render();
      try { await api('/api/logout', { method: 'POST', body: {} }); state.session = { setupRequired: false, user: null, csrfToken: null }; state.workspace = null; state.settingsDraft = null; state.knowledgeDraft = null; state.sourceDrafts = {}; state.connectionEnvironment = null; state.modelDraft = null; state.previewAccess = null; state.runtimeTask = ''; state.operations = {}; state.dialog = null; state.auth = { name: '', email: '', businessName: '' }; state.error = ''; state.notice = ''; }
      catch (error) { handleError(error); }
      finally { state.busy = false; render(); }
      break;
    }
  }
}

async function submitAuth(form) {
  const data = new FormData(form), first = state.session.setupRequired;
  state.auth.email = String(data.get('email')).trim();
  if (first) { state.auth.name = String(data.get('name')).trim(); state.auth.businessName = String(data.get('businessName')).trim(); }
  const body = { email: state.auth.email, password: String(data.get('password')), ...(first ? { name: state.auth.name, businessName: state.auth.businessName } : {}) };
  form.querySelector('[name="password"]').value = '';
  state.busy = true; state.error = ''; state.notice = ''; render();
  try {
    state.session = await api(first ? '/api/setup' : '/api/login', { method: 'POST', body });
    acceptWorkspace(await api('/api/workspace'), { mergeEdits: true });
    state.dialog = null; state.conflict = false;
  } catch (error) { handleError(error); }
  finally { body.password = ''; state.busy = false; render(); if (state.session?.user) loadOperations(); }
}
async function submitConnection(form) {
  const input = form.querySelector('[name="apiKey"]');
  const body = { revision: state.workspace.revision, apiKey: input.value.trim(), environment: form.querySelector('[name="environment"]').value };
  input.value = '';
  if (!body.apiKey) { state.error = 'Enter a Nuitée API key before saving.'; render(); return; }
  try { await mutate('/api/connection', 'PUT', body, { notice: 'The key is stored securely on this machine. Use Check saved key to validate it.' }); }
  finally { body.apiKey = ''; }
}
async function submitModel(form) {
  if (!runtime().enabled) return;
  const input = form.querySelector('[name="apiKey"]');
  const fields = {
    revision: state.modelDraft?.revision ?? state.workspace.revision,
    baseUrl: form.querySelector('[name="baseUrl"]').value.trim(),
    model: form.querySelector('[name="model"]').value.trim(),
    transport: form.querySelector('[name="transport"]').value
  };
  state.modelDraft = fields;
  const body = { ...fields, apiKey: input.value };
  input.value = '';
  try {
    if (!body.model || !body.baseUrl) throw new Error('Enter your model API base URL and model name before saving.');
    let endpoint;
    try { endpoint = new URL(body.baseUrl); } catch { /* Report a useful validation message below. */ }
    if (!endpoint || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error('Use an HTTPS model API base URL without embedded credentials, query parameters or a fragment.');
    if (!/^[\x21-\x7e]{8,2048}$/.test(body.apiKey)) throw new Error('Enter a model API key of 8–2048 characters, without whitespace. The key field has been cleared.');
    await mutate('/api/model', 'PUT', body, { savedModel: true, notice: 'Your model connection is saved securely on this machine. No model provider request was made. Prepare a reviewed version to use it in private chat.' });
  } catch (error) { handleError(error); render(); }
  finally { body.apiKey = ''; }
}

document.addEventListener('click', event => {
  const target = event.target.closest('button,[data-action]');
  if (!target || target.disabled || state.busy) return;
  if (target.dataset.page) return navigate(target.dataset.page);
  if (target.dataset.capability) {
    const key = target.dataset.capability;
    if (!Object.hasOwn(draft().capabilities, key) || (key === 'checkout' && !draft().capabilities.checkout)) return;
    draft().capabilities[key] = !draft().capabilities[key];
    if (key === 'checkout') target.disabled = true;
    target.classList.toggle('on', draft().capabilities[key]); target.setAttribute('aria-checked', String(draft().capabilities[key])); updateDraftUi(); return;
  }
  if (target.dataset.color) {
    draft().theme = target.dataset.color;
    document.querySelectorAll('[data-color]').forEach(element => { const selected = element.dataset.color === draft().theme; element.classList.toggle('selected', selected); element.setAttribute('aria-pressed', String(selected)); });
    updateDraftUi(); return;
  }
  if (target.dataset.action) handleAction(target.dataset.action).catch(error => { handleError(error); render(); });
});
function captureInput(event) {
  const target = event.target;
  if (target.dataset.setting && state.settingsDraft) { setPath(draft(), target.dataset.setting, target.value); updateDraftUi(); }
  if (target.dataset.model && ['baseUrl', 'model', 'transport'].includes(target.dataset.model)) {
    state.modelDraft ||= modelFields();
    state.modelDraft[target.dataset.model] = target.value;
    document.getElementById('model-draft-note')?.classList.remove('hidden');
  }
  if (target.dataset.source && state.knowledgeDraft) { state.knowledgeDraft[target.dataset.source] = target.value; state.knowledgeDraft.dirty = true; }
  if (target.id === 'key-environment') state.connectionEnvironment = target.value;
  if (target.id === 'knowledge-search') { state.knowledgeQuery = target.value; document.getElementById('knowledge-list').innerHTML = knowledgeRows(); }
  if (target.id === 'knowledge-filter') { state.knowledgeStatus = target.value; document.getElementById('knowledge-list').innerHTML = knowledgeRows(); }
}
document.addEventListener('input', captureInput);
document.addEventListener('change', captureInput);
document.addEventListener('submit', event => {
  if (!['auth-form', 'connection-form', 'model-form', 'settings-form', 'knowledge-form'].includes(event.target.id)) return;
  event.preventDefault(); if (state.busy) return;
  const promise = event.target.id === 'auth-form' ? submitAuth(event.target) : event.target.id === 'connection-form' ? submitConnection(event.target) : event.target.id === 'model-form' ? submitModel(event.target) : event.target.id === 'knowledge-form' ? handleAction('save-knowledge') : Promise.resolve(reviewSettings());
  promise.catch(error => { handleError(error); render(); });
});
document.getElementById('modal').addEventListener('cancel', event => { event.preventDefault(); if (!state.busy) closeDialog(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.panel) { state.panel = null; render(); }
  if (event.key !== 'Tab' || document.getElementById('modal').open || !state.panel) return;
  const panel = document.getElementById(state.panel === 'sidebar' ? 'sidebar' : 'helper');
  const fields = [...panel.querySelectorAll('button,a[href]')].filter(element => !element.disabled && element.getClientRects().length);
  if (event.shiftKey && document.activeElement === fields[0]) { event.preventDefault(); fields.at(-1)?.focus(); }
  else if (!event.shiftKey && document.activeElement === fields.at(-1)) { event.preventDefault(); fields[0]?.focus(); }
});
window.addEventListener('popstate', () => { routeFromUrl(); state.dialog = null; state.panel = null; render(); loadOperations(); });
window.addEventListener('beforeunload', event => { if (state.session?.user && (settingsDirty() || sourceDraftsDirty() || state.modelDraft)) { event.preventDefault(); event.returnValue = ''; } });

async function initialize() {
  state.loading = true; render();
  try {
    state.session = await api('/api/session');
    if (state.session.user) acceptWorkspace(await api('/api/workspace'), { mergeEdits: true });
    state.error = '';
  } catch (error) {
    handleError(error);
    state.session ||= { setupRequired: false, user: null, csrfToken: null };
  } finally { state.loading = false; render(); loadOperations(); }
}
routeFromUrl();
updateUrl(true);
initialize();

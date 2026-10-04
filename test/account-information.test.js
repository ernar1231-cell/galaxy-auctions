const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createAccountInformation, phoneCountries, formatPhone} = require('../account-information');

const fields = ['email', 'phone', 'full_name', 'residence_address', 'postal_code', 'mailing_address'];
const clone = value => JSON.parse(JSON.stringify(value));

class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = document; this.children = [];
    this.dataset = {}; this.attributes = {}; this.listeners = {}; this.style = {};
    this.id = ''; this.className = ''; this.value = ''; this.textContent = '';
    this.hidden = false; this.disabled = false; this.readOnly = false; this.checked = false;
    this.classList = {
      add: (...names) => {this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' ');},
      remove: (...names) => {this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' ');},
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, force) => {const add = force === undefined ? !this.classList.contains(name) : force; add ? this.classList.add(name) : this.classList.remove(name); return add;}
    };
  }
  appendChild(child) {child.parentNode = this; this.children.push(child); if (this.tagName === 'SELECT' && this.children.length === 1) this.value = child.value; return child;}
  append(...children) {for (const child of children) this.appendChild(child);}
  replaceChildren(...children) {this.children = []; this.append(...children);}
  setAttribute(name, value) {this.attributes[name] = String(value); if (name === 'id') this.id = String(value); if (name === 'disabled') this.disabled = true; if (name === 'readonly') this.readOnly = true;}
  removeAttribute(name) {delete this.attributes[name]; if (name === 'disabled') this.disabled = false; if (name === 'readonly') this.readOnly = false;}
  getAttribute(name) {return name === 'id' ? this.id : (this.attributes[name] ?? null);}
  addEventListener(type, handler) {(this.listeners[type] ||= []).push(handler);}
  removeEventListener(type, handler) {this.listeners[type] = (this.listeners[type] || []).filter(item => item !== handler);}
  focus() {this.ownerDocument.activeElement = this;}
  setSelectionRange() {}
  contains(node) {return node === this || this.children.some(child => child.contains(node));}
  querySelectorAll(selector) {
    const candidates = []; const walk = node => {for (const child of node.children) {candidates.push(child); walk(child);}}; walk(this);
    const matches = (node, rule) => {
      rule = rule.trim();
      if (rule.startsWith('#')) return node.id === rule.slice(1);
      const data = rule.match(/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/);
      if (data) {const key = data[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); return Object.hasOwn(node.dataset, key) && (data[2] === undefined || node.dataset[key] === data[2]);}
      return node.tagName.toLowerCase() === rule;
    };
    return candidates.filter(node => selector.split(',').some(rule => matches(node, rule)));
  }
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
  checkValidity() {
    return this.querySelectorAll('input,select,textarea').every(input => !input.required || !!input.value || input.type === 'checkbox');
  }
  reportValidity() {return this.checkValidity();}
  async dispatchEvent(event) {
    event.target ||= this; event.preventDefault ||= () => {};
    const callbacks = [...(this.listeners[event.type] || []), ...(typeof this['on' + event.type] === 'function' ? [this['on' + event.type]] : [])];
    for (const callback of callbacks) await callback(event);
    return true;
  }
  async click() {if (!this.disabled) await this.dispatchEvent({type: 'click'});}
}

function documentFixture() {
  const document = {
    activeElement: null,
    createElement(tag) {return new Element(tag, this);},
    getElementById(id) {const walk = node => node.id === id ? node : node.children.map(walk).find(Boolean); return walk(this.body) || null;},
    querySelectorAll(selector) {return this.body.querySelectorAll(selector);},
    querySelector(selector) {return this.body.querySelector(selector);}
  };
  document.body = new Element('body', document);
  const add = (id, tag = 'div', parent = document.body) => {const node = document.createElement(tag); node.id = id; parent.appendChild(node); return node;};
  const page = add('personalInformationPage');
  for (const suffix of ['Back', 'Avatar', 'Name', 'Username', 'Status', 'Message', 'Retry']) add('personalInformation' + suffix, suffix === 'Back' || suffix === 'Retry' ? 'button' : 'div', page);
  for (const field of fields) {
    const value = add('value_' + field, 'span', page); value.dataset.personalValue = field;
    const edit = add('edit_' + field, 'button', page); edit.dataset.personalEdit = field;
  }
  const editor = add('personalInformationEditor'); editor.hidden = true;
  add('personalInformationEditorTitle', 'h2', editor);
  const form = add('personalInformationForm', 'form', editor);
  add('personalInformationFields', 'div', form);
  add('personalInformationError', 'div', form);
  add('personalInformationCancel', 'button', form);
  add('personalInformationSave', 'button', form);
  return document;
}

function fixture(options = {}) {
  const document = documentFixture(), requests = [], syncs = [];
  const persisted = options.persisted || {email: null, phone: null, phone_country: null, full_name: null, residence_address: null, postal_code: null, mailing_address: null, mailing_same_as_residence: false};
  let account = {
    telegram_id: '987654321', first_name: 'Kolesa', username: 'dubai_kz', account_status: 'active',
    deposit_amount: 2000, bid_limit: 2000000, is_admin: true, ...clone(persisted)
  };
  let user = {id: 987654321, first_name: 'Kolesa', username: 'dubai_kz'};
  let failing = false, openCount = 0, closeCount = 0;
  const fetch = async (url, request) => {
    assert.equal(url, '/api/account-information');
    assert.equal(request.method, 'POST');
    const body = JSON.parse(request.body); requests.push(body);
    assert.equal(body.initData, 'signed-current-user');
    if (failing) return {ok: false, status: 502, json: async () => ({error: 'Save unavailable'})};
    if (options.fetch) return options.fetch(body, persisted);
    if (body.action === 'update') {
      if (body.field === 'phone') {
        persisted.phone_country = body.value.country;
        const digits = body.value.number.replace(/\D/g, '');
        persisted.phone = body.value.country === 'KZ' ? '+77011234567' : ('+' + (digits.startsWith('971') ? digits : '971' + digits.replace(/^0/, '')));
      } else if (body.field === 'mailing_address') {
        persisted.mailing_same_as_residence = body.value.same_as_residence;
        persisted.mailing_address = body.value.same_as_residence ? null : clone(body.value.address);
      } else persisted[body.field] = body.value || null;
    }
    const information = {...clone(persisted), mailing_address: clone(persisted.mailing_same_as_residence ? persisted.residence_address : persisted.mailing_address)};
    return {ok: true, status: 200, json: async () => ({information})};
  };
  const controller = createAccountInformation({
    document, fetch, getAccountData: () => account, setAccountData: value => {account = value;},
    getTelegramUser: () => user, getInitData: () => 'signed-current-user', ready: async () => {},
    onSync: () => {syncs.push(clone(account));}, onOpen: () => {openCount++; document.getElementById('personalInformationPage').classList.remove('open');}, onClose: () => {closeCount++;}
  });
  return {
    document, controller, persisted, requests, syncs, getAccount: () => account,
    setFailure: value => {failing = value;}, setUser: value => {user = value;},
    node: id => document.getElementById(id), value: field => document.getElementById('value_' + field),
    counts: () => ({openCount, closeCount})
  };
}

function setAddress(f, prefix, address) {
  for (const field of ['country', 'region', 'city', 'street']) f.node('personalInput_' + prefix + '_' + field).value = address[field] || '';
}
function assertProtected(f) {
  const account = f.getAccount();
  assert.equal(account.telegram_id, '987654321');
  assert.equal(account.username, 'dubai_kz');
  assert.equal(account.first_name, 'Kolesa');
  assert.equal(account.deposit_amount, 2000);
  assert.equal(account.bid_limit, 2000000);
  assert.equal(account.is_admin, true);
}
test('Account route opens the personal information page and preserves existing profile/admin entries', async () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /Личная информация/);
  for (const id of ['personalInformationPage', 'personalInformationForm', 'personalInformationBack', 'openAccountFromProfile', 'profileEdit', 'openAdminFromProfile']) assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(app, /function openProfileAccount\(\)\{closeModernScreens\(\);openAccount\(\)\}/);
  assert.match(app, /personalInformation\.open\(\)/);
  const f = fixture(); await f.controller.open();
  assert.equal(f.counts().openCount, 1);
  assert.equal(f.node('personalInformationPage').classList.contains('open'), true);
  assert.equal(f.node('personalInformationName').textContent, 'Kolesa');
  assert.equal(f.node('personalInformationUsername').textContent, '@dubai_kz');
  assert.match(f.node('personalInformationStatus').textContent, /Активный аккаунт/);
  for (const field of fields) {
    assert.match(f.value(field).textContent, /Не указан/);
    assert.equal(f.node('edit_' + field).textContent, 'Добавить');
  }
  f.controller.edit('full_name');
  assert.equal(f.node('personalInput_full_name').value, '');
  f.controller.cancel();
  await f.node('personalInformationBack').click();
  assert.equal(f.counts().closeCount, 1);
  assert.equal(f.node('personalInformationPage').classList.contains('open'), false);
  assertProtected(f);
});

test('Edit creates writable focused inputs; cancel discards an unsaved change', async () => {
  const f = fixture({persisted: {email: 'old@example.com', phone: null, phone_country: null, full_name: null, residence_address: null, postal_code: null, mailing_address: null, mailing_same_as_residence: false}});
  await f.controller.open();
  await f.node('edit_email').click();
  const input = f.node('personalInput_email');
  assert.ok(input);
  assert.equal(input.value, 'old@example.com');
  assert.equal(input.disabled, false);
  assert.equal(input.readOnly, false);
  assert.equal(f.document.activeElement, input);
  input.value = 'changed@example.com';
  await f.node('personalInformationCancel').click();
  assert.equal(f.getAccount().email, 'old@example.com');
  assert.equal(f.value('email').textContent, 'old@example.com');
  assert.equal(f.requests.filter(request => request.action === 'update').length, 0);
  f.controller.edit('email');
  assert.equal(f.node('personalInput_email').value, 'old@example.com');
});

test('email validation and save immediately synchronize the canonical upper-card account data', async () => {
  const f = fixture(); await f.controller.open(); f.controller.edit('email');
  f.node('personalInput_email').value = 'bad-email';
  assert.equal(await f.controller.save(), false);
  assert.equal(f.requests.filter(request => request.action === 'update').length, 0);
  assert.ok(f.node('personalInformationError').textContent);
  f.node('personalInput_email').value = 'user@example.com';
  assert.equal(await f.controller.save(), true);
  assert.equal(f.value('email').textContent, 'user@example.com');
  assert.equal(f.getAccount().email, 'user@example.com');
  assert.equal(f.node('edit_email').textContent, 'Редактировать');
  assert.equal(f.syncs.at(-1).email, 'user@example.com');
  assertProtected(f);
});

test('phone country selection sends the chosen region, shows readable phone, and syncs it to the upper card', async () => {
  const f = fixture(); await f.controller.open(); f.controller.edit('phone');
  const input = f.node('personalInput_phone'), country = f.node('personalInput_phone_country');
  assert.equal(input.disabled, false); assert.equal(input.readOnly, false);
  assert.ok(phoneCountries.some(item => item.country === 'AE' && item.code === '+971' && item.flag === '🇦🇪'));
  assert.ok(phoneCountries.some(item => item.country === 'KZ' && item.code === '+7' && item.flag === '🇰🇿'));
  country.value = 'KZ'; await country.dispatchEvent({type: 'change'});
  input.value = '+7 701 123 4567';
  assert.equal(await f.controller.save(), true);
  const request = f.requests.find(request => request.action === 'update');
  assert.deepEqual(request.value, {country: 'KZ', number: '+7 701 123 4567'});
  assert.equal(f.getAccount().phone, '+77011234567');
  assert.equal(f.getAccount().phone_country, 'KZ');
  assert.equal(f.syncs.at(-1).phone_country, 'KZ');
  assert.match(f.value('phone').textContent, /🇰🇿/);
  assert.match(f.value('phone').textContent, /701/);
  assert.notEqual(formatPhone('+77011234567', 'KZ'), '+77011234567');
  assertProtected(f);
});

test('full name, residence, alphanumeric postal code and separate mailing address persist after a fresh controller', async () => {
  const f = fixture(); await f.controller.open();
  f.controller.edit('full_name'); f.node('personalInput_full_name').value = 'Иван Иванов';
  assert.equal(await f.controller.save(), true);
  assert.equal(f.getAccount().full_name, 'Иван Иванов');
  assert.equal(f.node('personalInformationUsername').textContent, '@dubai_kz');
  const residence = {country: 'United Arab Emirates', region: 'Dubai', city: 'Dubai', street: 'Marina Street 14'};
  f.controller.edit('residence_address'); setAddress(f, 'residence', residence);
  assert.equal(await f.controller.save(), true);
  f.controller.edit('postal_code'); f.node('personalInput_postal_code').value = 'SW1A 1AA';
  assert.equal(f.node('personalInput_postal_code').type, 'text');
  assert.equal(await f.controller.save(), true);
  const mailing = {country: 'Kazakhstan', region: 'Almaty', city: 'Almaty', street: 'Abay Street 23'};
  f.controller.edit('mailing_address');
  f.node('personalInput_mailing_same').checked = false;
  await f.node('personalInput_mailing_same').dispatchEvent({type: 'change'});
  setAddress(f, 'mailing', mailing);
  assert.equal(await f.controller.save(), true);
  f.controller.close();
  const reopened = fixture({persisted: f.persisted}); await reopened.controller.open();
  assert.equal(reopened.getAccount().full_name, 'Иван Иванов');
  assert.deepEqual(reopened.getAccount().residence_address, residence);
  assert.equal(reopened.getAccount().postal_code, 'SW1A 1AA');
  assert.deepEqual(reopened.getAccount().mailing_address, mailing);
  assert.match(reopened.value('residence_address').textContent, /Marina Street 14/);
  assert.match(reopened.value('mailing_address').textContent, /Abay Street 23/);
  assert.equal(reopened.value('postal_code').textContent, 'SW1A 1AA');
  assertProtected(reopened);
});
test('mailing checkbox uses residence and follows later residence edits', async () => {
  const address = {country: 'United Arab Emirates', region: '', city: 'Dubai', street: 'Street 1'};
  const f = fixture({persisted: {email: null, phone: null, phone_country: null, full_name: null, residence_address: address, postal_code: null, mailing_address: null, mailing_same_as_residence: false}});
  await f.controller.open(); f.controller.edit('mailing_address');
  const same = f.node('personalInput_mailing_same'); same.checked = true;
  await same.dispatchEvent({type: 'change'});
  assert.equal(await f.controller.save(), true);
  assert.deepEqual(f.getAccount().mailing_address, address);
  f.controller.edit('residence_address'); setAddress(f, 'residence', {...address, city: 'Abu Dhabi', street: 'Street 2'});
  assert.equal(await f.controller.save(), true);
  assert.match(f.value('mailing_address').textContent, /Abu Dhabi/);
});

test('failed save keeps the form editable and does not replace previously saved data', async () => {
  const f = fixture({persisted: {email: 'old@example.com', phone: null, phone_country: null, full_name: null, residence_address: null, postal_code: null, mailing_address: null, mailing_same_as_residence: false}});
  await f.controller.open(); f.controller.edit('email'); f.node('personalInput_email').value = 'new@example.com';
  f.setFailure(true);
  assert.equal(await f.controller.save(), false);
  assert.equal(f.getAccount().email, 'old@example.com');
  assert.equal(f.value('email').textContent, 'old@example.com');
  assert.equal(f.node('personalInput_email').value, 'new@example.com');
  assert.equal(f.node('personalInput_email').disabled, false);
  assert.equal(f.node('personalInformationSave').disabled, false);
  assert.ok(f.node('personalInformationError').textContent);
  f.setFailure(false); assert.equal(await f.controller.save(), true);
  assert.equal(f.getAccount().email, 'new@example.com');
});

test('server response cannot overwrite identity, admin role, deposit or bid limit in the shared profile', async () => {
  const f = fixture({fetch: async () => ({ok: true, status: 200, json: async () => ({information: {email: 'safe@example.com', phone: null, phone_country: null, full_name: null, residence_address: null, postal_code: null, mailing_address: null, mailing_same_as_residence: false, telegram_id: 'attacker', username: 'attacker', first_name: 'attacker', is_admin: false, deposit_amount: 0, bid_limit: 0}})})});
  await f.controller.open();
  assert.equal(f.getAccount().email, 'safe@example.com');
  assertProtected(f);
});

test('a delayed read does not overwrite a saved value and changed Telegram identity rejects delayed responses', async () => {
  let resolveRead, readCount = 0;
  const f = fixture({fetch: async body => {
    if (body.action === 'read') {
      if (++readCount === 1) return {ok: true, status: 200, json: async () => ({information: {email: null}})};
      return new Promise(resolve => {resolveRead = resolve;});
    }
    return {ok: true, status: 200, json: async () => ({information: {email: body.value}})};
  }});
  await f.controller.open();
  const pending = f.controller.load();
  for (let turn = 0; turn < 12 && !resolveRead; turn++) await Promise.resolve();
  assert.ok(resolveRead);
  f.controller.edit('email'); f.node('personalInput_email').value = 'saved@example.com';
  assert.equal(await f.controller.save(), true);
  resolveRead({ok: true, status: 200, json: async () => ({information: {email: 'stale@example.com'}})});
  await pending;
  assert.equal(f.getAccount().email, 'saved@example.com');
  let resolveOther;
  const switched = fixture({fetch: async () => new Promise(resolve => {resolveOther = resolve;})});
  const waiting = switched.controller.load();
  for (let turn = 0; turn < 12 && !resolveOther; turn++) await Promise.resolve();
  switched.setUser({id: 111111, username: 'other'});
  resolveOther({ok: true, status: 200, json: async () => ({information: {email: 'wrong-user@example.com'}})});
  await waiting;
  assert.equal(switched.getAccount().email, null);
});

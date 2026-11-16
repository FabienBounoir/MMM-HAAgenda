// node test.js : vérifie le tri, le rangement par jour et le compte à rebours
const assert = require('assert');
global.Module = { register() {} };
const { HAA_events, HAA_countdown } = require('./MMM-HAAgenda.js');

const now = new Date(); now.setHours(12, 0, 0, 0);
const iso = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
const at = (n, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d.toISOString(); };

const list = HAA_events({
  'calendar.a': { events: [
    { start: at(1, 9), end: at(1, 10), summary: 'Demain 9h' },
    { start: iso(-1), end: iso(2), summary: 'Vacances' },  // a commencé hier : compte pour aujourd'hui
    { start: at(0, 9), end: at(0, 10), summary: 'Fini' }
  ] },
  'calendar.b': { events: [{ start: iso(0), end: iso(1), summary: 'Anniv' }, { start: at(0, 11), end: at(0, 13), summary: 'Réunion' }] }
}, now.getTime());
assert.deepStrictEqual(list.map((e) => e.summary), ['Vacances', 'Anniv', 'Réunion', 'Demain 9h']);
assert.deepStrictEqual(list.map((e) => e.day), ['Aujourd’hui', 'Aujourd’hui', 'Aujourd’hui', 'Demain']);
assert.strictEqual(list[2].calendar, 'calendar.b');
assert.strictEqual(HAA_events(undefined).length, 0);

const t = now.getTime(), min = 60000;
assert.strictEqual(HAA_countdown({ start: t + 25 * min }, t), 'dans 25 min');
assert.strictEqual(HAA_countdown({ start: t + 125 * min }, t), 'dans 2 h 05');
assert.strictEqual(HAA_countdown({ start: t + 120 * min }, t), 'dans 2 h');
assert.strictEqual(HAA_countdown({ start: t - min }, t), 'en cours');
assert.strictEqual(HAA_countdown({ start: t + 13 * 60 * min }, t), '');
assert.strictEqual(HAA_countdown({ allDay: true, start: t }, t), '');
console.log('ok');

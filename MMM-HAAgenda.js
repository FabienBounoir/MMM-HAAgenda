'use strict';

// Couleurs vives qui traversent le verre du miroir, une par calendrier (option colors pour choisir)
const HAA_PALETTE = ['#5ac8fa', '#ff9f0a', '#bf5af2', '#30d158', '#ff375f'];

Module.register('MMM-HAAgenda', {
  defaults: {
    maxEvents: 6,
    maxReminders: 6,
    colors: {},              // { 'calendar.travail': '#ff9f0a' }
    reminderColor: '#ffd60a'
  },

  start() {
    this.agenda = null;
    this.sendSocketNotification('HELLO');
    // Compte à rebours et Aujourd'hui / Demain : recalculés chaque minute
    setInterval(() => this.updateDom(), 60 * 1000);
  },

  getStyles() {
    return [this.file('MMM-HAAgenda.css')];
  },

  socketNotificationReceived(notification, payload) {
    if (notification !== 'AGENDA') return;
    // Animation d'entrée seulement quand l'agenda change, pas à chaque envoi de HA
    this.entering = JSON.stringify(payload) !== JSON.stringify(this.agenda);
    this.agenda = payload;
    if (this.entering) this.updateDom(600);
  },

  color(calendar) {
    if (this.config.colors[calendar]) return this.config.colors[calendar];
    const ids = Object.keys(this.agenda.events || {}).sort();
    return HAA_PALETTE[Math.max(0, ids.indexOf(calendar)) % HAA_PALETTE.length];
  },

  getDom() {
    const wrapper = HAA_el('div', 'HAA small');
    if (!this.agenda) return wrapper;
    if (this.entering) wrapper.classList.add('HAA_enter');
    this.entering = false;

    const now = Date.now();
    const events = HAA_events(this.agenda.events, now).slice(0, this.config.maxEvents);
    let day = null, i = 0;

    for (const e of events) {
      if (e.day !== day) {
        day = e.day;
        wrapper.appendChild(HAA_stagger(HAA_el('div', 'HAA_day', day), i++));
      }
      wrapper.appendChild(HAA_stagger(this.eventRow(e, now), i++));
    }

    const reminders = (this.agenda.reminders || []).slice(0, this.config.maxReminders);
    if (reminders.length) {
      wrapper.appendChild(HAA_stagger(HAA_el('div', 'HAA_day', 'Rappels'), i++));
      const chips = HAA_el('div', 'HAA_chips');
      chips.style.setProperty('--HAA-color', this.config.reminderColor);
      for (const r of reminders) chips.appendChild(HAA_stagger(HAA_el('span', 'HAA_chip', r.summary), i++));
      wrapper.appendChild(chips);
    }
    return wrapper;
  },

  // Une ligne par événement : barre de couleur, heure, titre, compte à rebours
  eventRow(e, now) {
    // Aujourd'hui : halo de la couleur du calendrier derrière la ligne, pour mieux la voir à travers le miroir
    const row = HAA_el('div', 'HAA_event' + (e.day === 'Aujourd’hui' ? ' HAA_today' : ''));
    row.style.setProperty('--HAA-color', this.color(e.calendar));
    row.appendChild(HAA_el('span', 'HAA_bar'));
    row.appendChild(HAA_el('span', 'HAA_time', e.allDay ? 'Journée' : e.time));
    row.appendChild(HAA_el('span', 'HAA_title', e.summary));
    const when = HAA_countdown(e, now);
    if (when) row.appendChild(HAA_el('span', 'HAA_when', when));
    return row;
  }
});


function HAA_el(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function HAA_stagger(el, i) {
  el.style.setProperty('--i', i);
  return el;
}

// Réponse de calendar.get_events ({ "calendar.x": { events: [...] } }) → liste triée, rangée par jour
function HAA_events(byCalendar, now = Date.now()) {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const hm = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const list = [];
  for (const [calendar, cal] of Object.entries(byCalendar || {})) {
    for (const e of cal.events || []) {
      const allDay = e.start.length === 10;                  // "2026-11-16" : journée entière
      const start = new Date(allDay ? e.start + 'T00:00' : e.start);
      const end = new Date(allDay ? e.end + 'T00:00' : e.end);
      if (end <= now) continue;
      const offset = Math.max(0, Math.round((new Date(start).setHours(0, 0, 0, 0) - today) / 86400000));
      list.push({
        calendar,
        allDay,
        start: start.getTime(),
        end: end.getTime(),
        sort: Math.max(start, today),
        day: offset === 0 ? 'Aujourd’hui' : offset === 1 ? 'Demain' : start.toLocaleDateString('fr-FR', { weekday: 'long' }),
        time: hm(start),
        endTime: hm(end),
        summary: e.summary || '(sans titre)'
      });
    }
  }
  return list.sort((a, b) => a.sort - b.sort);
}

// "dans 25 min", "dans 2 h 05", "en cours" ; rien au-delà de 12 h ou pour une journée entière
function HAA_countdown(e, now) {
  if (e.allDay) return '';
  if (e.start <= now) return 'en cours';
  const min = Math.ceil((e.start - now) / 60000);
  if (min < 60) return 'dans ' + min + ' min';
  if (min < 12 * 60) return 'dans ' + Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + String(min % 60).padStart(2, '0') : '');
  return '';
}

if (typeof module !== 'undefined') module.exports = { HAA_events, HAA_countdown };

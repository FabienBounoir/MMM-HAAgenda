'use strict';
// Home Assistant pousse l'agenda et les rappels ici (automation « Agenda et rappels → miroir »)
const NodeHelper = require('node_helper');
const express = require('express');

module.exports = NodeHelper.create({
  start() {
    this.expressApp.post('/MMM-HAAgenda', express.json({ limit: '200kb' }), (req, res) => {
      this.agenda = req.body;
      this.sendSocketNotification('AGENDA', this.agenda);
      res.json({ ok: true });
    });
  },

  // ponytail: gardé en mémoire seulement ; après un redémarrage du miroir, HA renvoie tout dans les 10 min
  socketNotificationReceived(notification) {
    if (notification === 'HELLO' && this.agenda) this.sendSocketNotification('AGENDA', this.agenda);
  }
});

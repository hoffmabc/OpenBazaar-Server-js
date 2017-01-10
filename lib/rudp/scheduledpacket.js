"use strict"

function ScheduledPacket(rudpPacket, timeout, timeout_cb, retries) {
  this.rudpPacket = rudpPacket;
  this.timeout = timeout;
  this.timeout_cb = timeout_cb;
  this.retries = retries;
}

module.exports = ScheduledPacket;

"use strict"

function ScheduledPacket(rudp_packet, timeout, timeout_cb, retries) {
  this.rudp_packet = rudp_packet;
  this.timeout = timeout;
  this.timeout_cb = timeout_cb;
  this.retries = retries || 0;
}

module.exports = ScheduledPacket;

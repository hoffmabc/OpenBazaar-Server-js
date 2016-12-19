"use strict"

function Constants() {

  // Constants governing operation of txrudp package.
  // [bytes]
  this.UDP_SAFE_SEGMENT_SIZE = 1000

  // [length]
  this.WINDOW_SIZE = 65535 // UDP_SAFE_SEGMENT_SIZE

  // [seconds]
  this.PACKET_TIMEOUT = 0.6

  // [seconds]
  this.BARE_ACK_TIMEOUT = 0.01

  // [seconds]
  this.MAX_PACKET_DELAY = 5

  // If a packet is retransmitted more than that many times,
  // the connection should be considered broken.
  this.MAX_RETRANSMISSIONS = this.MAX_PACKET_DELAY; // PACKET_TIMEOUT

}

module.exports = Constants;

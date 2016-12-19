
var Deque = require("double-ended-queue");
var OrderedDict = require("ordered-dict");
var Constants = require('./constants.js');
var Packet = require('./packet.js');
var ScheduledPacket = require('./scheduledpacket.js');

const constants = new Constants();

const State = {
  CONNECTING: 0,
  CONNECTED: 1,
  SHUTDOWN: 2
}

module.exports = class Connection {

  constructor(proto, handler, ownAddr, destAddr, relayAddr) {

    this._address = '';

    this.ownAddr = ownAddr || ['',0];
    this.destAddr = destAddr || ['',0];
    if(relayAddr !== undefined) {
      this.relayAddr = relayAddr || ['',0];
    }

    this.handler = handler;

    this._proto = proto;
    this._state = State.CONNECTING;

    var min = 0;
    var max = Math.pow(2, 16) - 2;
    this._nextSequenceNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    this._nextExpectedSeqnum = 0;
    this._nextDeliveredSeqnum = 0;

    this._segmentQueue = new Deque();
    this._sendingWindow = new OrderedDict();

    //this._receiveHeap = heap.Heap()

    //this._loopingSend = task.LoopingCall(self._dequeue_outbound_message);
    //this._loopingReceive = task.LoopingCall(self._pop_received_packet);

    // Initiate SYN sequence after receiving any pending SYN message.
    //REACTOR.callLater(0, self._send_syn);
    this._sendSyn();

    // this._ackHandle = () => {
    //   setTimeout(function() {
    //       this._sendAck();
    //     }, 1000
    //   );
    // }

  }

  _sendSyn() {
    /**
    Create and schedule the initial SYN packet.
    The current ACK number is included; if it is greater than
    0, then this actually is a SYNACK packet.
    **/
    var synPacket = new Packet(
        this._getNextSequenceNumber(),
        this.destAddr,
        this.ownAddr,
        '', 0,
        this._nextExpectedSeqnum, // ack
        false,  // fin
        true  // syn
    );
    
    this._scheduleSendInOrder(synPacket, constants.PACKET_TIMEOUT);
  }

  _getNextSequenceNumber() {
    // Return-then-increment the next available sequence number
    let cur = this._nextSequenceNumber;
    this._nextSequenceNumber += 1;
    return cur;
  }

  _finalizePacket(rudpPacket) {
       /**
       Convert a packet.Packet to bytes.
       NOTE: It is guaranteed that this method will be called
       exactly once for each outbound packet, so it is the ideal
       place to do pre- or post-processing of any Packet.
       Consider this when subclassing Connection.
       Args:
           rudpPacket: A packet.Packet
       Returns:
           The protobuf-encoded version of the packet, as bytes.
       **/
       return rudpPacket.toBytes();
  }

  _doSendPacket(seqnum) {
    /**
    Immediately dispatch packet with given sequence number.
    The packet must have been previously scheduled, that is, it
    should reside in the send window. Upon successful dispatch,
    the timeout timer for this packet is reset and the
    retransmission counter is incremented. If the retries exceed a
    given limit, the connection is considered broken and the
    shutdown sequence is initiated. Finally, the timeout for the
    looping ACK sender is reset.
    Args:
        seqnum: Sequence number of a ScheduledPacket, as an integer.
    Raises:
        KeyError: No such packet exists in the send window; some
            invariant has been violated.
    **/

    let schPacket = this._sendingWindow.get(seqnum);
    if(schPacket.retries >= constants.MAX_RETRANSMISSIONS) {
      this.shutdown();
    } else {
        this._proto.sendDatagram(sch_packet.rudp_packet, self.relay_addr);
        schPacket.timeout_cb = REACTOR.callLater(
            schPacket.timeout,
            this._doSendPacket,
            seqnum
        )
        sch_packet.retries += 1
        self._cancel_ack_timeout()
    }
  }

  _scheduleSendInOrder(rudpPacket, timeout) {
    /**
    Schedule a package to be sent and set the timeout timer.
    Args:
        rudp_packet: The packet.Packet to be sent.
        timeout: The timeout for this packet type.
    **/
    let finalPacket = this._finalizePacket(rudpPacket);
    let seqnum = rudpPacket.sequenceNumber;
    let timeoutCB = () => {
      this._doSendPacket(seqnum);
    };

    this._sendingWindow[seqnum] = new ScheduledPacket(
      finalPacket,
      timeout,
      timeoutCB,
      0
    );
  }

}

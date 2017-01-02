var Deque = require("double-ended-queue");
var OrderedDict = require("ordered-dict");
var constants = require('./constants.js');
var Packet = require('./packet.js');
var ScheduledPacket = require('./scheduledpacket.js');

const Constants = new constants();



module.exports = class Connection {

    constructor(proto, handler, ownAddr, destAddr, relayAddr) {

        this.State = {
            CONNECTING: 0,
            CONNECTED: 1,
            SHUTDOWN: 2
        };

        this._address = '';

        if (relayAddr !== undefined) {
            this.relayAddr = relayAddr || ['', 0];
        } else {
            this.relayAddr = destAddr;
        }
        this.ownAddr = ownAddr;
        this.destAddr = destAddr;

        this.handler = handler;

        this._proto = proto;
        this._state = this.State.CONNECTING;

        let min = 0;
        let max = Math.pow(2, 16) - 2;
        this._nextSequenceNumber = Math.floor(Math.random() * (max - min + 1)) + min;

        this._nextExpectedSeqnum = 0;
        this._nextDeliveredSeqnum = 0;

        this._segmentQueue = new Deque();
        this._sendingWindow = new OrderedDict();

        //this._receiveHeap = heap.Heap()

        this._loopingSendRunning = false;
        //this._loopingSend = task.LoopingCall(this._dequeueOutboundMessage);
        //this._loopingReceive = task.LoopingCall(this._popReceivedPacket);


        // this._ackHandle = () => {
        //   setTimeout(function() {
        //       this._sendAck();
        //     }, 1000
        //   );
        // }

    }

    _dequeueOutboundMessage() {
        /**
        Deque a message, wrap it into an RUDP packet and schedule it.

            Pause dequeueing if it would overflow the send window.
        **/
        if(this._segmentQueue) {
            console.log('Looping send active despite empty queue');
        }
        let segment = this._segmentQueue.shift();
        let moreFragments = segment[0];
        let message = segment[1];
        // more_fragments, message = this._segment_queue.popleft()

        let rudpPacket = packet.Packet.fromData(
            this._getNextSequenceNumber(),
            this.destAddr,
            this.ownAddr,
            message,
            moreFragments,
            this._nextExpectedSeqnum
        );
        this._scheduleSendInOrder(rudpPacket, Constants.PACKET_TIMEOUT)

        this._attemptDisablingLoopingSend();
    }


    _sendSyn() {
        /**
         Create and schedule the initial SYN packet.
         The current ACK number is included; if it is greater than
         0, then this actually is a SYNACK packet.
         **/
        let synPacket = new Packet(
            this._getNextSequenceNumber(),
            this.destAddr,
            this.ownAddr,
            '', 0,
            this._nextExpectedSeqnum, // ack
            false,  // fin
            true  // syn
        );

        this._scheduleSendInOrder(synPacket, Constants.PACKET_TIMEOUT);
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
        if (schPacket.retries >= Constants.MAX_RETRANSMISSIONS) {
            this.shutdown();
        } else {

            this._proto.sendDatagram(schPacket.rudpPacket, this.relayAddr);
            // schPacket.timeout_cb = REACTOR.callLater(
            //     schPacket.timeout,
            //     this._doSendPacket,
            //     seqnum
            // );
            schPacket.retries += 1;
            this._cancelAckTimeout()
        }
    }

    _cancelAckTimeout() {
        // Cancel timeout for next bare ACK packet
        // if(this._ackHandle.active()) {
        //     this._ackHandle.cancel();
        // }

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

        this._sendingWindow.append(seqnum, new ScheduledPacket(
            finalPacket,
            timeout,
            () => {
                console.log('Timed out.');
            },
            0
        ));

        let timeoutCB = this._doSendPacket(seqnum);


    }

    sendMessage(message) {
        /**
         Send a message to the connected remote host, asynchronously.

         If the message is too large for proper transmission over UDP,
         it is first segmented appropriately.

         Args:
         message: The message to be sent, as bytes.
         **/
        for (let segment in Connection._genSegments(message)) {
            this._segmentQueue.push(segment);
        }
        this._attemptEnablingLoopingSend();
    }

    _attemptEnablingLoopingSend() {
        /**
         Enable dequeuing if a packet can be scheduled immediately.
         **/
        if (!this._loopingSendRunning
            && this._state == this.State.CONNECTED
            && this._sendingWindow.size() < Constants.WINDOW_SIZE
            && this._segmentQueue.length) {
            // this._loopingSend.start(0, true);

        } else {
            console.log('Cannot enable looping send for this connection');
        }

    }

    static _genSegments(message) {
        /**
         Split a message into segments appropriate for transmission.

         Args:
         message: The message to sent, as a string.

         Yields:
         Tuples of two elements; the first element is the number
         of remaining segments, the second is the actual string
         segment.
         **/
        let maxSize = Constants.UDP_SAFE_SEGMENT_SIZE;
        let count = Math.ceil(message.length/maxSize);//(message.length + maxSize - 1) // max_size
        let segments = [];
        for (var i = 0; i < count; i++) {
            segments.push([count-i - 1, message.slice(i * maxSize, (i + 1) * maxSize)]);
        }

        return segments;
    }

    receivePacket(rudpPacket, fromAddr) {
        /**
        Process received packet and update connection state.

            Called by protocol when a packet arrives for this connection.

            NOTE: It is guaranteed that this method will be called
        exactly once for each inbound packet, so it is the ideal
        place to do pre- or post-processing of any Packet.
            Consider this when subclassing Connection.

            Args:
        rudp_packet: Received packet.Packet.
            fromAddr: Sender's address as Tuple (ip, port).
        **/
        if(this._state == this.State.SHUTDOWN) {
            // A SHUTDOWN connection shall not process any packet
            // whatsoever. In particular, it shall not be revived via a
            // SYN packet.
            return;
        }

        if(fromAddr != rudpPacket.sourceAddr && fromAddr != this.relayAddr) {
            this.setRelayAddress(fromAddr);
        }

        if(rudpPacket.fin) {
            this._processFinPacket(rudpPacket);
        } else if(rudpPacket.syn) {
            if(this._state == this.State.CONNECTING) {
                this._processSynPacket(rudpPacket);
            }
        } else {
            this._processCasualPacket(rudpPacket);
        }
    }

    setRelayAddress(relayAddr) {
        /**
        Change the relay address used on this connection.

            Args:
        relayAddr: Tuple of relay host address (ip, port).
        **/
        this.relayAddr = relayAddr;
    }

    _processSynPacket(rudpPacket) {
        /**
        Process received SYN packet.

            This method can only be called if the connection has not yet
        been established; thus ignore any payload.

            We use double handshake and consider the connection to the
        remote endpoint established upon receiving a SYN packet.

            Args:
        rudp_packet: A packet.Packet with SYN flag set.
        **/
        if(rudpPacket.ack > 0) {
            this._processAckPacket(rudpPacket);
        }
        this._updateNextDeliveredSeqnum(rudpPacket.sequenceNumber);
        this._updateNextExpectedSeqnum(rudpPacket.sequenceNumber);
        this._state = this.State.CONNECTED;
        this._attemptEnablingLoopingSend();
    }

    _processAckPacket(rudpPacket) {
        /**
        Process the ACK field on a received packet.

            Args:
        rudp_packet: A packet.Packet with positive ACK field.
        **/
        if(this._sendingWindow) {
            this._retirePacketsWithSeqnumUpTo(
                Math.min(rudpPacket.ack, this._nextSequenceNumber)
            );
        }
    }

    _retireScheduledPacketWithSeqnum(seqnum) {
        /**
         Retire ScheduledPacket with given seqnum.

         Args:
         seqnum: Sequence number of retired packet.
         **/
        let schPacket = this._sendingWindow.get(seqnum);
        //schPacket.timeout_cb.cancel()
    }

    _retirePacketsWithSeqnumUpTo(acknum) {
        /**
        Remove from send window any ACKed packets.

        Args:
            acknum: Acknowledgement number of next expected
        outbound packet.
        **/
        if(!this._sendingWindow.empty()) {
            return;
        }
        let lowestSeqnum = this._sendingWindow.next();
        if(acknum >= lowestSeqnum) {
            for(var i=lowestSeqnum; i<=acknum; i++) {
                this._retireScheduledPacketWithSeqnum(i);
            }
            this._attemptEnablingLoopingSend();
        }
    }

    _updateNextExpectedSeqnum(seqnum) {
        if(this._nextExpectedSeqnum <= seqnum) {
            this._nextExpectedSeqnum = seqnum+1;
        }
    }

    _updateNextDeliveredSeqnum(seqnum) {
        if(this._nextDeliveredSeqnum <= seqnum) {
            this._nextDeliveredSeqnum = seqnum+1;
        }
    }

    _processFinPacket(rudpPacket) {
        /**
         Process a received FIN packet.

         Terminate connection after possibly dispatching any
         last messages to handler.

         Args:
         rudpPacket: A packet.Packet with FIN flag set.
         **/
        this.shutdown();
    }

    shutdown() {
        /**
        Terminate connection with remote endpoint.

        1. Send a single FIN packet to remote host.
        2. Stop sending and acknowledging messages.
        3. Cancel all retransmission timers.
        4. Alert handler about connection shutdown.

            The handler should prevent the connection from receiving
        any future messages. The simplest way to do this is to
        remove the connection from the protocol.
        **/
        this._state = this.State.SHUTDOWN;

        this._sendFin();
        this._cancelAckTimeout();
        //this._attemptDisablingLoopingSend(force=True);
        //this._attemptDisablingLoopingReceive()
        this._clearSendingWindow();

        this.handler.handleShutdown();
    }

    unregister(){
        /**
        Remove this connection from the protocol.

            This should be called only after the connection is
        SHUTDOWN. Note that shutting down the connection will
        *not* automatically remove the connection from the
        protocol, to prevent a malicious remote node from
        creating and destroying connections endlessly.
        **/
        if(this._state != this.State.SHUTDOWN) {
            console.log('Connection is not shut down yet.');
            return;
        }
        delete this._proto[this.destAddr];
    }

    _clearSendingWindow() {
        /**
         Purge send window from scheduled packets.

         Cancel all retransmission timers.
         **/
        this._sendingWindow.forEach((value, key, index) => {
            // if sch_packet.timeout_cb.active():
            // sch_packet.timeout_cb.cancel()
        });
        this._sendingWindow = new OrderedDict();
    }

    _sendFin() {
        /**
        Create and schedule a FIN packet.

            No acknowledgement of this packet is normally expected.
            In addition, no retransmission of this packet is performed;
        if it is lost, the packet timeouts at the remote host will
        cause the connection to be broken. Since the packet is sent
        out-of-order, there is no meaningful sequence number.
        **/
        let finPacket = new Packet(
            0,
            this.destAddr,
            this.ownAddr,
            '', 0,
            this._nextExpectedSeqnum,
            true,
            false
        );
        this._scheduleSendOutOfOrder(finPacket);
    }

    _scheduleSendOutOfOrder(rudpPacket) {
        /**
         Schedule a package to be sent out of order.

         Current implementation sends the packet as soon as possible.

         Args:
         rudp_packet: The packet.Packet to be sent.
         **/
        let finalPacket = this._finalizePacket(rudpPacket);
        this._proto.sendDatagram(finalPacket, [this.relayAddr.address, this.relayAddr.port]);
    }
};

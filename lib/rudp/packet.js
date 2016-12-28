
"use strict"

/**
Specification of RUDP packet structure.

Classes:
    Packet: An RUDP packet implementing a total ordering and
        serializing to/from protobuf.
**/

// functools
//import re

//from txrudp import packet_pb2

// IP validation regexes from the Regular Expressions Cookbook.
// For now, only standard (non-compressed) IPv6 addresses are
// supported. This might change in the future.
let _IPV4_REGEX = RegExp('/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$');
let _IPV6_REGEX = RegExp('/^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$');

const packet = require('./packet_pb');

module.exports = class Packet {
  constructor(sequenceNumber, destAddr, sourceAddr, payload='', moreFragments=0, ack=0, fin=false, syn=false) {
    this.syn = syn;
    this.fin = fin;
    this.sequenceNumber = sequenceNumber;
    this.moreFragments = moreFragments;
    this.ack = ack;
    this.payload = payload;
    this.destAddr = destAddr || '';
    this.sourceAddr = sourceAddr || '';
  }

  toBytes() {
    // protobuf.load('packet.proto', function(err, root) {
    //   if(err) throw err;
    //
    //   //var p = protobuf.Class.create(root.nested.PacketPB2);
    //   let AwesomeMessage = root.lookup("openbazaar.PacketPB2");
    //   let message = AwesomeMessage.create({ destIp: "fdafs" });
    //   let encodedBuffer = AwesomeMessage.encode(message).finish();
    //   console.log(encodedBuffer);
    // });
    var p = new packet.Packet();
    p.setSyn(this.syn);
    p.setFin(this.fin);
    p.setSequenceNumber(this.sequenceNumber);
    p.setMoreFragments(this.moreFragments);
    p.setAck(this.ack);
    p.setPayload(this.payload);
    p.setDestIp(this.destAddr[0]);
    p.setDestPort(this.destAddr[1]);
    p.setSourceIp(this.sourceAddr[0]);
    p.setSourcePort(this.sourceAddr[1]);

    var encodedBytes = p.serializeBinary();

    return encodedBytes;
  }

  fromBytes(data) {
    // protobuf.load('packet.proto', function(err, root) {
    //   if(err) throw err;
    //
    //   //var p = protobuf.Class.create(root.nested.PacketPB2);
    //   let AwesomeMessage = root.lookup("openbazaar.PacketPB2");
    //   let message = AwesomeMessage.create({ destIp: "fdafs" });
    //   let encodedBuffer = AwesomeMessage.encode(message).finish();
    //   console.log(encodedBuffer);
    // });
    var p = new packet.Packet();
    var decodedPacket = packet.Packet.deserializeBinary(data);
    // validate packet
    return decodedPacket;

  }


}

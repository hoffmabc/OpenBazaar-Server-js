
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
const protobuf = require('protobufjs');
const root = protobuf.Root.fromJSON(require("./packet.json"));

module.exports = class Packet {
  constructor(sequenceNumber, destAddr, sourceAddr, payload, moreFragments, ack, fin, syn) {
    this.syn = syn || false;
    this.fin = fin || false;
    this.sequenceNumber = sequenceNumber;
    this.moreFragments = moreFragments;
    this.ack = ack;
    this.payload = payload || Buffer([]);
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
    // var p = new packet.Packet();
    // p.setSyn(this.syn);
    // p.setFin(this.fin);
    // p.setSequenceNumber(this.sequenceNumber);
    // p.setMoreFragments(this.moreFragments);
    // p.setAck(this.ack);
    // p.setPayload(this.payload);
    // p.setDestIp(this.destAddr[0]);
    // p.setDestPort(this.destAddr[1]);
    // p.setSourceIp(this.sourceAddr[0]);
    // p.setSourcePort(this.sourceAddr[1]);
    //
    // var encodedBytes = p.serializeBinary();

      let p = root.lookup('Packet');
      let encodedPacket = p.create({
          syn: this.syn,
          fin: this.fin,
          sequenceNumber: this.sequenceNumber,
          moreFragments: this.moreFragments,
          ack: this.ack,
          payload: this.payload,
          destIp: this.destAddr[0],
          destPort: this.destAddr[1],
          sourceIp: this.sourceAddr[0],
          sourcePort: this.sourceAddr[1]
      });
      encodedPacket = p.encode(encodedPacket).finish();

    return encodedPacket;
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
    //   function PacketDecodeException() {
    //     this.message = "Packet could not be decoded";
    //     this.name = "PacketDecodeException";
    //   }
    // var p = new packet.Packet();
    // var data = new Uint8Array(data).buffer;
    // try {
    //     var decodedPacket = packet.Packet.deserializeBinary(data);
    // } catch(err) {
    //   throw new PacketDecodeException();
    // }
      let p = root.lookup('Packet');
      let decodedPacket = p.decode(data);
    // validate packet

      this.syn = decodedPacket.syn;
      this.fin = decodedPacket.fin;
      this.sequenceNumber = decodedPacket.sequenceNumber;
      this.moreFragments = decodedPacket.moreFragments;
      this.ack = decodedPacket.ack;
      this.payload = decodedPacket.payload;
      this.destAddr = [decodedPacket.destIp, decodedPacket.destPort];
      this.sourceAddr = [decodedPacket.sourceIp, decodedPacket.sourcePort];

    return this;

  }


}

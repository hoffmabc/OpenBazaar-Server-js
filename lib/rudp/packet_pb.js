/**
 * @fileoverview
 * @enhanceable
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.Packet', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.Packet = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.Packet, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.Packet.displayName = 'proto.Packet';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.Packet.prototype.toObject = function(opt_includeInstance) {
  return proto.Packet.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.Packet} msg The msg instance to transform.
 * @return {!Object}
 */
proto.Packet.toObject = function(includeInstance, msg) {
  var f, obj = {
    syn: msg.getSyn(),
    fin: msg.getFin(),
    sequenceNumber: msg.getSequenceNumber(),
    moreFragments: msg.getMoreFragments(),
    ack: msg.getAck(),
    payload: msg.getPayload_asB64(),
    destIp: msg.getDestIp(),
    destPort: msg.getDestPort(),
    sourceIp: msg.getSourceIp(),
    sourcePort: msg.getSourcePort()
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.Packet}
 */
proto.Packet.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.Packet;
  return proto.Packet.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.Packet} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.Packet}
 */
proto.Packet.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setSyn(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setFin(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readUint64());
      msg.setSequenceNumber(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readUint64());
      msg.setMoreFragments(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readUint64());
      msg.setAck(value);
      break;
    case 6:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setPayload(value);
      break;
    case 7:
      var value = /** @type {string} */ (reader.readString());
      msg.setDestIp(value);
      break;
    case 8:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setDestPort(value);
      break;
    case 9:
      var value = /** @type {string} */ (reader.readString());
      msg.setSourceIp(value);
      break;
    case 10:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setSourcePort(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Class method variant: serializes the given message to binary data
 * (in protobuf wire format), writing to the given BinaryWriter.
 * @param {!proto.Packet} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.Packet.serializeBinaryToWriter = function(message, writer) {
  message.serializeBinaryToWriter(writer);
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.Packet.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  this.serializeBinaryToWriter(writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the message to binary data (in protobuf wire format),
 * writing to the given BinaryWriter.
 * @param {!jspb.BinaryWriter} writer
 */
proto.Packet.prototype.serializeBinaryToWriter = function (writer) {
  var f = undefined;
  f = this.getSyn();
  if (f) {
    writer.writeBool(
      1,
      f
    );
  }
  f = this.getFin();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
  f = this.getSequenceNumber();
  if (f !== 0) {
    writer.writeUint64(
      3,
      f
    );
  }
  f = this.getMoreFragments();
  if (f !== 0) {
    writer.writeUint64(
      4,
      f
    );
  }
  f = this.getAck();
  if (f !== 0) {
    writer.writeUint64(
      5,
      f
    );
  }
  f = this.getPayload_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      6,
      f
    );
  }
  f = this.getDestIp();
  if (f.length > 0) {
    writer.writeString(
      7,
      f
    );
  }
  f = this.getDestPort();
  if (f !== 0) {
    writer.writeUint32(
      8,
      f
    );
  }
  f = this.getSourceIp();
  if (f.length > 0) {
    writer.writeString(
      9,
      f
    );
  }
  f = this.getSourcePort();
  if (f !== 0) {
    writer.writeUint32(
      10,
      f
    );
  }
};


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.Packet} The clone.
 */
proto.Packet.prototype.cloneMessage = function() {
  return /** @type {!proto.Packet} */ (jspb.Message.cloneMessage(this));
};


/**
 * optional bool syn = 1;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.Packet.prototype.getSyn = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldProto3(this, 1, false));
};


/** @param {boolean} value  */
proto.Packet.prototype.setSyn = function(value) {
  jspb.Message.setField(this, 1, value);
};


/**
 * optional bool fin = 2;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.Packet.prototype.getFin = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldProto3(this, 2, false));
};


/** @param {boolean} value  */
proto.Packet.prototype.setFin = function(value) {
  jspb.Message.setField(this, 2, value);
};


/**
 * optional uint64 sequence_number = 3;
 * @return {number}
 */
proto.Packet.prototype.getSequenceNumber = function() {
  return /** @type {number} */ (jspb.Message.getFieldProto3(this, 3, 0));
};


/** @param {number} value  */
proto.Packet.prototype.setSequenceNumber = function(value) {
  jspb.Message.setField(this, 3, value);
};


/**
 * optional uint64 more_fragments = 4;
 * @return {number}
 */
proto.Packet.prototype.getMoreFragments = function() {
  return /** @type {number} */ (jspb.Message.getFieldProto3(this, 4, 0));
};


/** @param {number} value  */
proto.Packet.prototype.setMoreFragments = function(value) {
  jspb.Message.setField(this, 4, value);
};


/**
 * optional uint64 ack = 5;
 * @return {number}
 */
proto.Packet.prototype.getAck = function() {
  return /** @type {number} */ (jspb.Message.getFieldProto3(this, 5, 0));
};


/** @param {number} value  */
proto.Packet.prototype.setAck = function(value) {
  jspb.Message.setField(this, 5, value);
};


/**
 * optional bytes payload = 6;
 * @return {!(string|Uint8Array)}
 */
proto.Packet.prototype.getPayload = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldProto3(this, 6, ""));
};


/**
 * optional bytes payload = 6;
 * This is a type-conversion wrapper around `getPayload()`
 * @return {string}
 */
proto.Packet.prototype.getPayload_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getPayload()));
};


/**
 * optional bytes payload = 6;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getPayload()`
 * @return {!Uint8Array}
 */
proto.Packet.prototype.getPayload_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getPayload()));
};


/** @param {!(string|Uint8Array)} value  */
proto.Packet.prototype.setPayload = function(value) {
  jspb.Message.setField(this, 6, value);
};


/**
 * optional string dest_ip = 7;
 * @return {string}
 */
proto.Packet.prototype.getDestIp = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 7, ""));
};


/** @param {string} value  */
proto.Packet.prototype.setDestIp = function(value) {
  jspb.Message.setField(this, 7, value);
};


/**
 * optional uint32 dest_port = 8;
 * @return {number}
 */
proto.Packet.prototype.getDestPort = function() {
  return /** @type {number} */ (jspb.Message.getFieldProto3(this, 8, 0));
};


/** @param {number} value  */
proto.Packet.prototype.setDestPort = function(value) {
  jspb.Message.setField(this, 8, value);
};


/**
 * optional string source_ip = 9;
 * @return {string}
 */
proto.Packet.prototype.getSourceIp = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 9, ""));
};


/** @param {string} value  */
proto.Packet.prototype.setSourceIp = function(value) {
  jspb.Message.setField(this, 9, value);
};


/**
 * optional uint32 source_port = 10;
 * @return {number}
 */
proto.Packet.prototype.getSourcePort = function() {
  return /** @type {number} */ (jspb.Message.getFieldProto3(this, 10, 0));
};


/** @param {number} value  */
proto.Packet.prototype.setSourcePort = function(value) {
  jspb.Message.setField(this, 10, value);
};


goog.object.extend(exports, proto);
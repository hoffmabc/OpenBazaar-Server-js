/**
 Copyright (c) 2014 Brian Muller
 Copyright (c) 2015 OpenBazaar
 **/

const protobuf = require('protobufjs');
const root = protobuf.Root.fromJSON(require("../../protos/bundle.json"));
const sha1 = require('sha1');
const secrets = require('secrets.js');
const Config = require('../config.js');
const sodium = require('sodium').api;
const Utils = require('../dht/utils');

const CONFIG = new Config();
const COMMAND = root.lookup('Command').values;
const NATTYPE = root.lookup('NATType').values;

const message = require('../../protos/message_pb');

module.exports = class RPCProtocol {
    /**
     This is an abstract class for processing and sending rpc messages.
     A class that implements the `MessageProcessor` interface probably should
     extend this as it does most of the work of keeping track of messages.
     **/

    constructor(sourceNode, router, waitTimeout) {
        this.sourceNode = sourceNode;
        this.router = router;
        this._waitTimeout = waitTimeout || 30000;
        this._outstanding = {};

        this.State = {
          CONNECTING: 0,
          CONNECTED: 1,
          SHUTDOWN: 2
        };
    }

    receiveMessage(message, sender, connection, banScore) {
        var data;

        if (message.getTestnet() != this.multiplexer.testnet) {
            console.log('[RPC UDP] Received message from ', connection.destAddr, 'with incorrect network parameters.');
            connection.shutdown();
            return false;
        }

        if (sender.vendor) {
            this.multiplexer.vendors[Buffer(sender.id).toString('hex')] = sender;
        }

        var msgID = Buffer(message.getMessageid()).toString('base64');
        if (message.getCommand() != COMMAND['NOT_FOUND']) {
            data = message.getArgumentsList();
        }
        if (this._outstanding[msgID]) {
            this._acceptResponse(msgID, data, sender);
        } else if (message.getCommand() != 404) {
            //banScore.processMessage(connection.destAddr, message);
            let command = Utils.findPropertyName(COMMAND, message.getCommand());
            this._acceptRequest(msgID, command.toLowerCase(), data, sender, connection);
        }
    }

    _acceptResponse(msgID, data, sender) {
        if(data !== undefined) {
            console.log('[RPC UDP] Received response for message ID', msgID, 'from', sender.ip);
        } else {
            console.log('[RPC UDP] Received 404 error response from', sender);
        }

        let d = this._outstanding[msgID][0];
        let t = this._outstanding[msgID][2];
        clearTimeout(t);
        delete this._outstanding[msgID];
        d.resolve([sender, [true, data]]);


    }
    // if data is not None:
    //     msgargs = (b64encode(msgID), sender)
    // self.log.debug("received response for message id %s from %s" % msgargs)
    // else:
    //     self.log.warning("received 404 error response from %s" % sender)
    // d = self._outstanding[msgID][0]
    // if self._outstanding[msgID][2].active():
    // self._outstanding[msgID][2].cancel()
    // d.callback((True, data))
    // del self._outstanding[msgID]

    _acceptRequest(msgID, funcname, args, sender, connection) {
        console.log(`[RPC UDP] Received request from ${Buffer(sender.id).toString('hex')}, command ${funcname.toUpperCase()}`);
        let f = this['rpc_' + funcname];
        let p = new Promise((resolve, reject) => {
            let res = f(this, sender, args);
            if(res) {
                resolve(res);
            } else {
                reject('[RPC UDP] Could not find function to support this RPC call');
            }
        })
        .catch((err) => {
            console.log(err);
        })
        .then((result) => {
            // resolve
            this._sendResponse(result, funcname, msgID, sender, connection);
        }, (err) => {
            // reject
            console.log('Error',err);
            this._sendResponse(null, 'bad_request', msgID, sender, connection);
        })
    }

    _sendResponse(response, funcname, msgID, sender, connection) {
        console.log(`[RPC UDP] Sending response for Message ID ${msgID} to ${sender}`);
        let m = new message.Message();
        let finishedProto;

        m.setMessageid(msgID);
        m.setProtover(CONFIG.PROTOCOL_VERSION);
        m.setSender(this.sourceNode.getProto());
        m.setTestnet(this.multiplexer.testnet);

        if(response === undefined) {
            m.setCommand('NOT_FOUND');
        } else {
            m.setCommand(COMMAND[funcname.toUpperCase()]);
            m.setArgumentsList(response);
        }

        try {
            finishedProto = m.serializeBinary();
        } catch(err) {
            console.log('Error serializing binary', err);
        }

        // Sign the protobuf
        let sig = sodium.crypto_sign(
            new Buffer(finishedProto.toString().substring(0, 64), 'utf8'),
            new Buffer(this.signingKey)
        );

        m.setSignature(Buffer(sig).toString('base64'));

        connection.sendMessage(m.serializeBinary());
    }




    // f = getattr(self, "rpc_%s" % funcname, None)
    // if f is None or not callable(f):
    //     msgargs = (self.__class__.__name__, funcname)
    //     self.log.error("%s has no callable method rpc_%s; ignoring request" % msgargs)
    //     return False
    // if funcname == "hole_punch":
    //     f(sender, *args)
    // else:
    //     d = defer.maybeDeferred(f, sender, *args)
    //     d.addCallback(self._sendResponse, funcname, msgID, sender, connection)
    //     d.addErrback(self._sendResponse, "bad_request", msgID, sender, connection)

    _createWrappedMessage(commandName, msgID, args) {

        let m = new message.Message();
        args = args || [];

        m.setMessageid(msgID);
        m.setProtover(CONFIG.PROTOCOL_VERSION);
        m.setSender(this.sourceNode.getProto());
        m.setCommand(commandName);
        m.setTestnet(this.multiplexer.testnet);

        // Add optional args to the protobuf
        //let args = ;
        m.setArgumentsList(args);

        let finishedProto = m.serializeBinary();

        // Sign the protobuf
        let sig = sodium.crypto_sign(
            new Buffer(finishedProto.toString().substring(0, 64), 'utf8'),
            new Buffer(this.signingKey)
        );
        m.setSignature(Buffer(sig).toString('base64'));

        return m.serializeBinary();

    }

    rpcProxy(commandName, node, args) {
        //console.log('Calling proxy:', name, node, args);

        // if(this.handledCommands[name.toUpperCase()] !== undefined) {
        //     console.log('[RPC UDP] Handling command \'' + name.toUpperCase() + '\'');
        //     this['rpc_'+name](args);
        // }
        let relayAddr;
        let address = [node.ip, node.port];
        let msgID = sha1(secrets.random(255)); // Generate random message ID

        let commandNameValue = COMMAND[commandName.toUpperCase()];

        let wrappedData = this._createWrappedMessage(commandNameValue, msgID, args);

        if (node.natType == NATTYPE['SYMMETRIC'] ||
            (node.natType == NATTYPE['RESTRICTED'] && this.sourceNode.natType == NATTYPE['SYMMETRIC'])) {
            relayAddr = node.relayNode;
        }

        class Deferred {
            constructor() {
                this.promise = new Promise((resolve, reject) => {
                    this.reject = reject;
                    this.resolve = resolve;
                });
            }
        }

        let p = new Deferred();

        if (commandName != COMMAND['HOLE_PUNCH']) {

            let timeout = setTimeout(() => {
                this.timeout(node);
            }, this._waitTimeout);


            this._outstanding[msgID] = [p, address, timeout];
            console.log(`[RPC UDP] Calling remote function ${commandName} on ${address} (msgid ${new Buffer(msgID).toString('base64')})`);
        }

        this.multiplexer.sendMessage(wrappedData, address, relayAddr);

        let allConnections = this.multiplexer.getAllConnections();
        if(allConnections[address].state != this.State.CONNECTED
          && node.natType == NATTYPE['RESTRICTED']
          && this.sourceNode.natType != NATTYPE['SYMMETRIC']
          && node.relayNode !== undefined) {
            this.holePunch(
                Node(
                  digest("null"),
                  node.relay_node[0],
                  node.relay_node[1],
                  nat_type=FULL_CONE
                ),
                address[0], address[1], "True");
            console.log('[RPC UDP] Sending hole punch message to', address[0] + ':' + address[1]);
        }

        return p.promise;

    }

    timeout(node) {
        /**
         This timeout is called by the txrudp connection handler. We will run through the
         outstanding messages and callback false on any waiting on this IP address.
         **/
        let address = [node.ip, node.port];
        for (let msgID in this._outstanding) {
            let item = this._outstanding[msgID];
            let p = item[0];
            let addr = item[1];
            let timeout = item[2];

            if (address == addr) {
                p.resolve([false, null]);
                clearTimeout(timeout);
                delete this._outstanding[msgID];
            }

        }

        this.router.removeContact(node);
        try {
            this.multiplexer.getConnectionByAddress(address).shutdown();
        } catch (err) {
            console.log('[RPC UDP] Could not shutdown contact', err);
        }

    }


};


// def _acceptResponse(self, msgID, data, sender):
//     if data is not None:
//         msgargs = (b64encode(msgID), sender)
//         self.log.debug("received response for message id %s from %s" % msgargs)
//     else:
//         self.log.warning("received 404 error response from %s" % sender)
//     d = self._outstanding[msgID][0]
//     if self._outstanding[msgID][2].active():
//         self._outstanding[msgID][2].cancel()
//     d.callback((True, data))
//     del self._outstanding[msgID]
//
// def _acceptRequest(self, msgID, funcname, args, sender, connection):
//     self.log.debug("received request from %s, command %s" % (sender, funcname.upper()))
//     f = getattr(self, "rpc_%s" % funcname, None)
//     if f is None or not callable(f):
//         msgargs = (self.__class__.__name__, funcname)
//         self.log.error("%s has no callable method rpc_%s; ignoring request" % msgargs)
//         return False
//     if funcname == "hole_punch":
//         f(sender, *args)
//     else:
//         d = defer.maybeDeferred(f, sender, *args)
//         d.addCallback(self._sendResponse, funcname, msgID, sender, connection)
//         d.addErrback(self._sendResponse, "bad_request", msgID, sender, connection)
//
// def _sendResponse(self, response, funcname, msgID, sender, connection):
//     self.log.debug("sending response for msg id %s to %s" % (b64encode(msgID), sender))
//     m = Message()
//     m.messageID = msgID
//     m.sender.MergeFrom(self.sourceNode.getProto())
//     m.protoVer = PROTOCOL_VERSION
//     m.testnet = self.multiplexer.testnet
//     if response is None:
//         m.command = NOT_FOUND
//     else:
//         m.command = Command.Value(funcname.upper())
//         if not isinstance(response, list):
//             response = [response]
//         for arg in response:
//             m.arguments.append(str(arg))
//     m.signature = self.signing_key.sign(m.SerializeToString())[:64]
//     connection.send_message(m.SerializeToString())
//
// def timeout(self, node):
//     """
//     This timeout is called by the txrudp connection handler. We will run through the
//     outstanding messages and callback false on any waiting on this IP address.
//     """
//     address = (node.ip, node.port)
//     for msgID, val in self._outstanding.items():
//         if address == val[1]:
//             val[0].callback((False, None))
//             if self._outstanding[msgID][2].active():
//                 self._outstanding[msgID][2].cancel()
//             del self._outstanding[msgID]
//
//     self.router.removeContact(node)
//     try:
//         self.multiplexer[address].shutdown()
//     except Exception:
//         pass
//
// def rpc_hole_punch(self, sender, ip, port, relay="False"):
//     """
//     A method for handling an incoming HOLE_PUNCH message. Relay the message
//     to the correct node if it's not for us. Otherwise send a datagram to allow
//     the other node to punch through our NAT.
//     """
//     if relay == "True":
//         self.log.debug("relaying hole punch packet to %s:%s for %s:%s" %
//                        (ip, port, sender.ip, str(sender.port)))
//         self.hole_punch(Node(digest("null"), ip, int(port), nat_type=FULL_CONE), sender.ip, sender.port)
//     else:
//         self.log.debug("punching through NAT for %s:%s" % (ip, port))
//         # pylint: disable=W0612
//         for i in range(20):
//             self.multiplexer.send_datagram("", (ip, int(port)))
//
// def __getattr__(self, name):
//     if name.startswith("_") or name.startswith("rpc_"):
//         return object.__getattr__(self, name)
//
//     try:
//         return object.__getattr__(self, name)
//     except AttributeError:
//         pass
//
//     def func(node, *args):
//         address = (node.ip, node.port)
//
//         msgID = sha1(str(random.getrandbits(255))).digest()
//         m = Message()
//         m.messageID = msgID
//         m.sender.MergeFrom(self.sourceNode.getProto())
//         m.command = Command.Value(name.upper())
//         m.protoVer = PROTOCOL_VERSION
//         for arg in args:
//             m.arguments.append(str(arg))
//         m.testnet = self.multiplexer.testnet
//         m.signature = self.signing_key.sign(m.SerializeToString())[:64]
//         data = m.SerializeToString()
//
//         relay_addr = None
//         if node.nat_type == SYMMETRIC or \
//                 (node.nat_type == RESTRICTED and self.sourceNode.nat_type == SYMMETRIC):
//             relay_addr = node.relay_node
//
//         d = defer.Deferred()
//         if m.command != HOLE_PUNCH:
//             timeout = reactor.callLater(self._waitTimeout, self.timeout, node)
//             self._outstanding[msgID] = [d, address, timeout]
//             self.log.debug("calling remote function %s on %s (msgid %s)" % (name, address, b64encode(msgID)))
//
//         self.multiplexer.send_message(data, address, relay_addr)
//
//         if self.multiplexer[address].state != State.CONNECTED and \
//                         node.nat_type == RESTRICTED and \
//                         self.sourceNode.nat_type != SYMMETRIC and \
//                         node.relay_node is not None:
//             self.hole_punch(Node(digest("null"), node.relay_node[0], node.relay_node[1], nat_type=FULL_CONE),
//                             address[0], address[1], "True")
//             self.log.debug("sending hole punch message to %s" % address[0] + ":" + str(address[1]))
//
//         return d
//
//     return func

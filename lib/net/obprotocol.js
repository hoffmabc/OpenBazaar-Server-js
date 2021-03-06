"use strict"

const Connection = require('../rudp/connection.js');
const ConnectionMultiplexer = require('../rudp/rudp.js');
const Utils = require('../dht/utils.js');
const CryptoConnectionFactory = require('../rudp/cryptoconnectionfactory.js');
const Node = require('../dht/node.js');
const Guid = require('../keys/guid');
const sodium = require('sodium').api;
const Timer = require('clockmaker').Timer
const Timers = require('clockmaker').Timers;
const protobuf = require('protobufjs');
const root = protobuf.Root.fromJSON(require("../../protos/bundle.json"));
const message = require('../../protos/message_pb');
const NATTYPE = root.lookup('NATType').values;
const COMMANDS = root.lookup('Command').values;



module.exports = class OpenBazaarProtocol extends ConnectionMultiplexer {

    constructor(db, ip, port, natType, testnet, relaying) {
        /**
         Initialize the new protocol with the connection handler factory.
         Args:
         ip: a string of the IP address
         port: a number of the port
         **/
        super();

        this.publicIp = ip;
        this.testnet = testnet || false;
        this.port = port;
        this.blockchain = '';
        this.processors = [];
        this.ws = '';
        this.relayNode = '';
        this.natType = '';
        this.db = db;
        this.vendors = this.db.vendors.getVendors();
        //this.banScore = BanScore(this);
        //this.keepAliveLoop = LoopingCall(self.keep_alive)
        //this.keepAliveLoop.start(30, now=False)
        let that = this;

        this.keepAliveLoop = new Timer(function(timer) {
            that.keepAlive();
        }, 3000, {
            repeat: true
        }).start();

        this.factory = new ConnHandlerFactory(this.processors, this);
        this.connectionFactory = new CryptoConnectionFactory(this.factory);
        this.relaying = relaying;
    }

    keepAlive() {
        let ac = this.getAllConnections();
        let that = this;
        let c;
        Object.keys(ac).forEach((key) => {
            c = ac[key];
            if(c._state == c.State.CONNECTED) {
                c.handler.keepAlive();
            }
        });
    }

    registerProcessor(processor) {
        // Add a new class which implements the `MessageProcessor` interface.
        // if (deepEqual(MessageProcessor, processor)) {
        this.processors.push(processor);
        // }
    }

    unregisterProcessor(self, processor) {
        // Unregister the given processor."""
        if (processor == self.processors) {
            self.processors.remove(processor)
        }
    }

    sendMessage(datagram, address, relayAddr) {
        /**
        Sends a datagram over the wire to the given address. It will create a new rudp connection if one
            does not already exist for this peer.

            Args:
        datagram: the raw data to send over the wire
        address: a `tuple` of (ip address, port) of the recipient.
            relay_addr: a `tuple` of (ip address, port) of the relay address
        or `None` if no relaying is required.
        **/
        let con;
        let connections = this.getAllConnections();
        if(!connections[address]) {
            con = this.makeNewConnection([this.publicIp, this.port], address, relayAddr);
        } else {
            con = connections[address];
            if(relayAddr !== undefined && relayAddr != con.relayAddr && relayAddr != con.ownAddr) {
                con.relayAddr = relayAddr;
            }
        }

        con.sendMessage(datagram);
    }

    start() {
      this.startProtocol(this.port);
    }

}

class ConnHandler {
    constructor(processors, natType, relayNode, banScore, args) {
        this.processors = processors;
        this.relayNode = relayNode;
        this.banScore = banScore;
        this.isNewNode = true;

        let that = this;
        let retries = 10000;

        let t = new Promise((resolve, reject) => {
            setInterval(() => {
                if (that.connection !== undefined) {
                    if (that.connection._state == that.connection.State.CONNECTED) {
                        resolve();
                    }
                }
                if (retries == 0) {
                    reject('Connection to' + that.connection.destAddr + 'failed');
                }
                retries--;
            }, 100);

        })
            .then(() => {
            this.addr = this.connection.destAddr[0] + ":" + this.connection.destAddr[1];
            console.log(`[ConnHandler] Connected to ${this.addr}`);
        }, (message) => {
            console.log('Rejected', message)
        });

        this.timeLastMessage = 0;
        this.remoteNodeVersion = 1;
        this.pingInterval = (natType != NATTYPE['FULL_CONE']) ? 30 : 300;

    }

    keepAlive() {
        /**
         Let's check that this node has been active in the last 5 minutes. If not
         and if it's not in our routing table, we don't need to keep the connection
         open. Otherwise PING it to make sure the NAT doesn't drop the mapping.
         **/
        let t = new Date().getTime();
        let router = this.processors[0].router;
        if (this.node !== undefined
            && t - this.timeLastMessage >= 300*1000
            && router.isNewNode(this.node)
            && this.relayNode != [this.connection.destAddr[0], this.connection.destAddr[1]]) {
            this.connection.shutdown();
        }

        let p;

        if(t-this.timeLastMessage >= this.pingInterval*1000) {
            for(let pIndex in this.processors) {
                p = this.processors[pIndex];
                if(p.handledCommands['PING'] !== undefined && this.node !== undefined) {
                    p.callPing(this.node);
                }
            }
        }
    }

    handleShutdown() {
        this.connection.unregister();

        if(this.node === undefined) {
            let u = new Utils();
            let nullDigest = u.digest('null');
            this.node = new Node.DHTNode(nullDigest, this.connection.destAddr[0], this.connection.destAddr[1]);
            for (let index in this.processors) {
                let processor = this.processors[index];
                processor.timeout(this.node);
            }
        }

        if(this.publicIp) {
            console.log("[Connection] Shutdown: Connection with", this.addr, "terminated");
        }

        if(this.relayNode == [this.connection.destAddr[0], this.connection.destAddr[1]]) {
            console.log('[Connection] Disconnected from relay node, picking new one...');
            this.changeRelayNode();
        }
    }

    checkNewConnection() {
        if(this.isNewNode) {
            this.isNewNode = false;
            return true;
        } else {
            return false;
        }
    }
    receiveMessage(bufferedDatagram) {


        let datagram = new Uint8Array(bufferedDatagram);

        if(datagram.length < 166) {
            console.log('Datagram too small')
            return false;
        }

        let d, mSender, senderNode;

        try {

            d = message.Message.deserializeBinary(datagram);
            console.log('[OpenBazaarProtocol]', d.getCommand(),'command received');
            mSender = d.getSender();
            senderNode = mSender.getNodeaddress();

            //nodeId, ip, port, pubkey, relayNode, natType, vendor
            this.node = new Node.DHTNode(
                mSender.getGuid(),
                senderNode.getIp(),
                senderNode.getPort(),
                Buffer(mSender.getPublickey()).toString('hex'),
                (!mSender.getRelayaddress()) ? null : [mSender.getRelayaddress().getIp(), mSender.getRelayaddress().getPort()],
                mSender.getNattype(),
                mSender.getVendor()
            );

            this.remoteNodeVersion = d.getProtover();

            if(this.timeLastMessage == 0) {
                let h = sodium.crypto_hash_sha512(mSender.getPublickey());
                let hStr = h.toString('hex');
                //let hStr = this._toHexString(h);
                let powHash = hStr.substring(40, hStr.length-1);
                //console.log(powHash);
                let validPow = Guid._testpow(powHash.substring(0, 6));
                if(!validPow) {
                    throw('Invalid GUID');
                }

            }

            for(var i=0, len = this.processors.length; i<len; i++) {
                let processor = this.processors[i];
                let command;
                Object.keys(COMMANDS).forEach((key) => {
                    if(COMMANDS[key] == d.getCommand()) {
                        if(processor.handledCommands.includes(key)) {
                            command = key;
                        }
                    }
                });
                if(command !== undefined || d.getCommand() == 404) {
                    processor.receiveMessage(d, this.node, this.connection, this.banScore);
                }
            }

            if(COMMANDS[d.getCommand()] != 'PING') {
                this.timeLastMessage = new Date().getTime();
            }

        } catch(err) {
            console.log(err);
        }
    }

}



//     def receive_message(self, datagram):
//     if len(datagram) < 166:
//     self.log.warning("received datagram too small from %s, ignoring" % self.addr)
//     return False
//     try:
//         m = Message()
//     m.ParseFromString(datagram)
//     self.node = Node(m.sender.guid,
//     m.sender.nodeAddress.ip,
//     m.sender.nodeAddress.port,
//     m.sender.publicKey,
//     None if not m.sender.HasField("relayAddress") else
// (m.sender.relayAddress.ip, m.sender.relayAddress.port),
//     m.sender.natType,
//     m.sender.vendor)
//     self.remote_node_version = m.protoVer
//     if self.time_last_message == 0:
//     h = nacl.hash.sha512(m.sender.publicKey)
//     pow_hash = h[40:]
//     if int(pow_hash[:6], 16) >= 50 or m.sender.guid.encode("hex") != h[:40]:
//     raise Exception('Invalid GUID')
//     for processor in self.processors:
//     if m.command in processor or m.command == NOT_FOUND:
//     processor.receive_message(m, self.node, self.connection, self.ban_score)
//     if m.command != PING:
//     self.time_last_message = time.time()
//     except Exception:
//                 # If message isn't formatted property then ignore
//     self.log.warning("received an invalid message from %s, ignoring" % self.addr)
//     return False
//
//     def handle_shutdown(self):
//     try:
//         self.connection.unregister()
//     except Exception:
//     pass
//
//     if self.node is None:
//     self.node = Node(digest("null"), str(self.connection.dest_addr[0]),
//     int(self.connection.dest_addr[1]))
//     for processor in self.processors:
//     processor.timeout(self.node)
//
//     if self.addr:
//     self.log.info("connection with %s terminated" % self.addr)
//
//     if self.relay_node == (self.connection.dest_addr[0], self.connection.dest_addr[1]):
//     self.log.info("Disconnected from relay node. Picking new one...")
//     self.change_relay_node()
//
//     def keep_alive(self):
// """
//     Let's check that this node has been active in the last 5 minutes. If not
//     and if it's not in our routing table, we don't need to keep the connection
//     open. Otherwise PING it to make sure the NAT doesn't drop the mapping.
//     """
//     t = time.time()
//     router = self.processors[0].router
//     if (
//         self.node is not None and
//     t - self.time_last_message >= 300 and
//     router.isNewNode(self.node) and
//     self.relay_node != (self.connection.dest_addr[0], self.connection.dest_addr[1])
// ):
//     self.connection.shutdown()
//     return
//
//     if t - self.time_last_message >= self.ping_interval:
//     for processor in self.processors:
//     if PING in processor and self.node is not None:
//     processor.callPing(self.node)
//
//     def change_relay_node(self):
// potential_relay_nodes = []
//     for bucket in self.processors[0].router.buckets:
//     for node in bucket.nodes.values():
//     if node.nat_type == FULL_CONE:
//     potential_relay_nodes.append((node.ip, node.port))
//     if len(potential_relay_nodes) == 0:
//     for seed in SEEDS:
//     try:
//         potential_relay_nodes.append((socket.gethostbyname(seed[0].split(":")[0]),
//     28469 if self.processors[0].TESTNET else 18469))
//     except socket.gaierror:
//     pass
//     shuffle(potential_relay_nodes)
//     self.relay_node = potential_relay_nodes[0]
//     for processor in self.processors:
//     if PING in processor:
//     if (self.relay_node[0], self.relay_node[1]) in processor.multiplexer:
//     processor.multiplexer[(self.relay_node[0], self.relay_node[1])].shutdown()
//     processor.callPing(Node(digest("null"), self.relay_node[0], self.relay_node[1],
//     relay_node=None, nat_type=FULL_CONE))
//
//     def check_new_connection(self):
//     if self.is_new_node:
//     self.is_new_node = False
//     return True
//     else:
//     return False

class ConnHandlerFactory {
    constructor(processors, activeConnections) {
        //super(OpenBazaarProtocol.ConnHandlerFactory, self).__init__()
        this.processors = processors;
        this.activeConnections = activeConnections;
    }

    makeNewHandler(args, kwargs) {
        return new ConnHandler(this.processors, this.activeConnections);
    }
}

/**
 Copyright (c) 2014 Brian Muller
 Copyright (c) 2015 OpenBazaar
 **/

// import random
// from twisted.internet import reactor
// from zope.interface import implements
// import nacl.signing
//
// from dht.node import Node
// from dht.routing import RoutingTable
// from dht.utils import digest
// from log import Logger
// from net.rpcudp import RPCProtocol
// from interfaces import MessageProcessor
// from protos import objects
// from protos.message import PING, STUN, STORE, DELETE, FIND_NODE, FIND_VALUE, HOLE_PUNCH, INV, VALUES

const RPCProtocol = require('../net/rpcudp.js');
const Routing = require('./routing.js');
const Set = require('sorted-set');
const protos = require('../../protos/protos.js');

module.exports = class KademliaProtocol extends RPCProtocol {
    constructor(sourceNode, storage, ksize, database, signingKey) {
        super(sourceNode, new Routing.RoutingTable());
        this.ksize = ksize;
        this.storage = storage;
        this.sourceNode = sourceNode;
        this.multiplexer;
        this.db = database;
        this.signingKey = signingKey

        this.router.node = sourceNode;
        this.router.ksize = ksize;
        this.router.protocol = this;
        this.router.flush();

        //this.log = Logger(system=self)
        this.handledCommands = protos.nested.Command.values;
        this.recentTransfers = new Set();
    }

    connectMultiplexer(multiplexer) {
        this.multiplexer = multiplexer;
    }

    getRefreshIDs() {
        let ids = [];
        for (bucket in this.router.getLonelyBuckets()) {
            ids.push(Math.random(bucket.range));
        }
        return ids;
    }

    rpc_ping(sender) {
        this.addToRouter(sender);
        let proto = this.sourceNode.getProto();
        console.log('Pinging', sender.ip + ':' + sender.port);
        return [proto.toString()];
    }

    addToRouter(node) {
        /**
         Called by rpc_ functions when a node sends them a request.
         We add the node to our router and transfer our stored values
         if they are new and within our neighborhood.
         **/
        if(!this.isNewConnection(node) && !this.recentTransfers.includes(node.id)) {
            for(let i=0; i<=this.recentTransfers.length-10; i++) {
                this.recentTransfers.pop();
            }
            this.recentTransfers.add(node.id);
            console.log('Found a new node, transferring key/values...');
            //reactor.callLater(1, self.transferKeyValues, node);
        }
        this.router.addContact(node);
    }

    isNewConnection(node) {
        let mp = this.multiplexer.getAllConnections();
        if(mp.includes([node.ip, node.port])) {
            return this.multiplexer.getConnectionByAddress([node.ip, node.port]).handler.checkNewConnection();
        } else {
            return true;
        }
    }

};


// def getRefreshIDs(self):
//     """
//     Get ids to search for to keep old buckets up to date.
//     """
//     ids = []
//     for bucket in this.router.getLonelyBuckets():
//         ids.append(random.randint(*bucket.range))
//     return ids
//
// def rpc_stun(self, sender):
//     this.addToRouter(sender)
//     return [sender.ip, str(sender.port)]
//
// def rpc_ping(self, sender):
//     this.addToRouter(sender)
//     return [this.sourceNode.getProto().SerializeToString()]
//
// def rpc_store(self, sender, keyword, key, value, ttl):
//     this.addToRouter(sender)
//     this.log.debug("got a store request from %s, storing value" % str(sender))
//     if len(keyword) == 20 and len(key) <= 33 and len(value) <= 2100 and int(ttl) <= 604800:
//         this.storage[keyword] = (key, value, int(ttl))
//         return ["True"]
//     else:
//         return ["False"]
//
// def rpc_delete(self, sender, keyword, key, signature):
//     this.addToRouter(sender)
//     value = this.storage.getSpecific(keyword, key)
//     if value is not None:
//         # Try to delete a message from the dht
//         if keyword == digest(sender.id):
//             try:
//                 verify_key = nacl.signing.VerifyKey(sender.pubkey)
//                 verify_key.verify(key, signature)
//                 this.storage.delete(keyword, key)
//                 return ["True"]
//             except Exception:
//                 return ["False"]
//         # Or try to delete a pointer
//         else:
//             try:
//                 node = objects.Node()
//                 node.ParseFromString(value)
//                 pubkey = node.publicKey
//                 try:
//                     verify_key = nacl.signing.VerifyKey(pubkey)
//                     verify_key.verify(key, signature)
//                     this.storage.delete(keyword, key)
//                     return ["True"]
//                 except Exception:
//                     return ["False"]
//             except Exception:
//                 pass
//     return ["False"]
//
// def rpc_find_node(self, sender, key):
//     this.log.debug("finding neighbors of %s in local table" % key.encode('hex'))
//     this.addToRouter(sender)
//     node = Node(key)
//     nodeList = this.router.findNeighbors(node, exclude=sender)
//     ret = []
//     if this.sourceNode.id == key:
//         ret.append(this.sourceNode.getProto().SerializeToString())
//     for n in nodeList:
//         ret.append(n.getProto().SerializeToString())
//     return ret
//
// def rpc_find_value(self, sender, keyword):
//     this.addToRouter(sender)
//     ret = ["value"]
//     value = this.storage.get(keyword, None)
//     if value is None:
//         return this.rpc_find_node(sender, keyword)
//     ret.extend(value)
//     return ret
//
// def rpc_inv(self, sender, *serlialized_invs):
//     this.addToRouter(sender)
//     ret = []
//     for inv in serlialized_invs:
//         try:
//             i = objects.Inv()
//             i.ParseFromString(inv)
//             if this.storage.getSpecific(i.keyword, i.valueKey) is None:
//                 ret.append(inv)
//         except Exception:
//             pass
//     return ret
//
// def rpc_values(self, sender, *serialized_values):
//     this.addToRouter(sender)
//     for val in serialized_values[:100]:
//         try:
//             v = objects.Value()
//             v.ParseFromString(val)
//             this.storage[v.keyword] = (v.valueKey, v.serializedData, int(v.ttl))
//         except Exception:
//             pass
//     return ["True"]
//
// def callFindNode(self, nodeToAsk, nodeToFind):
//     d = this.find_node(nodeToAsk, nodeToFind.id)
//     return d.addCallback(this.handleCallResponse, nodeToAsk)
//
// def callFindValue(self, nodeToAsk, nodeToFind):
//     d = this.find_value(nodeToAsk, nodeToFind.id)
//     return d.addCallback(this.handleCallResponse, nodeToAsk)
//
// def callPing(self, nodeToAsk):
//     d = this.ping(nodeToAsk)
//     return d.addCallback(this.handleCallResponse, nodeToAsk)
//
// def callStore(self, nodeToAsk, keyword, key, value, ttl):
//     d = this.store(nodeToAsk, keyword, key, value, str(int(round(ttl))))
//     return d.addCallback(this.handleCallResponse, nodeToAsk)
//
// def callDelete(self, nodeToAsk, keyword, key, signature):
//     d = this.delete(nodeToAsk, keyword, key, signature)
//     return d.addCallback(this.handleCallResponse, nodeToAsk)
//
// def callInv(self, nodeToAsk, serlialized_inv_list):
//     d = this.inv(nodeToAsk, *serlialized_inv_list)
//     return d.addCallback(this.handleCallResponse, nodeToAsk)
//
// def callValues(self, nodeToAsk, serlialized_values_list):
//     d = this.values(nodeToAsk, *serlialized_values_list)
//     return d.addCallback(this.handleCallResponse, nodeToAsk)
//
// def transferKeyValues(self, node):
//     """
//     Given a new node, send it all the keys/values it should be storing.
//
//     @param node: A new node that just joined (or that we just found out
//     about).
//
//     Process:
//     For each key in storage, get k closest nodes.  If newnode is closer
//     than the furtherst in that list, and the node for this server
//     is closer than the closest in that list, then store the key/value
//     on the new node (per section 2.5 of the paper)
//     """
//     def send_values(inv_list):
//         values = []
//         if inv_list[0]:
//             for requested_inv in inv_list[1]:
//                 try:
//                     i = objects.Inv()
//                     i.ParseFromString(requested_inv)
//                     value = this.storage.getSpecific(i.keyword, i.valueKey)
//                     if value is not None:
//                         v = objects.Value()
//                         v.keyword = i.keyword
//                         v.valueKey = i.valueKey
//                         v.serializedData = value
//                         v.ttl = int(round(this.storage.get_ttl(i.keyword, i.valueKey)))
//                         values.append(v.SerializeToString())
//                 except Exception:
//                     pass
//             if len(values) > 0:
//                 this.callValues(node, values)
//
//     inv = []
//     for keyword in this.storage.iterkeys():
//         keyword = keyword[0].decode("hex")
//         keynode = Node(keyword)
//         neighbors = this.router.findNeighbors(keynode, exclude=node)
//         if len(neighbors) > 0:
//             newNodeClose = node.distanceTo(keynode) < neighbors[-1].distanceTo(keynode)
//             thisNodeClosest = this.sourceNode.distanceTo(keynode) < neighbors[0].distanceTo(keynode)
//         if len(neighbors) == 0 \
//                 or (newNodeClose and thisNodeClosest) \
//                 or (thisNodeClosest and len(neighbors) < this.ksize):
//             # pylint: disable=W0612
//             for k, v in this.storage.iteritems(keyword):
//                 i = objects.Inv()
//                 i.keyword = keyword
//                 i.valueKey = k
//                 inv.append(i.SerializeToString())
//     if len(inv) > 100:
//         random.shuffle(inv)
//     if len(inv) > 0:
//         this.callInv(node, inv[:100]).addCallback(send_values)
//
// def handleCallResponse(self, result, node):
//     """
//     If we get a response, add the node to the routing table.  If
//     we get no response, make sure it's removed from the routing table.
//     """
//     if result[0]:
//         if this.isNewConnection(node) and node.id not in this.recent_transfers:
//             # pylint: disable=W0612
//             for i in range(len(this.recent_transfers) - 10):
//                 this.recent_transfers.pop()
//             this.recent_transfers.add(node.id)
//             this.log.debug("call response from new node, transferring key/values")
//             reactor.callLater(1, this.transferKeyValues, node)
//         this.router.addContact(node)
//     else:
//         this.log.debug("no response from %s, removing from router" % node)
//         this.router.removeContact(node)
//     return result
//

//

//
// def __iter__(self):
//     return iter(this.handled_commands)

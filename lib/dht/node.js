"use strict"

/**
Copyright (c) 2014 Brian Muller
Copyright (c) 2015 OpenBazaar
**/
// import heapq

// from operator import itemgetter
// from protos import objects
const protos = require('../../protos/protos.js');
var root = protobuf.Root.fromJSON(require("../../protos/bundle.json"));


module.exports = class Node {
  constructor(nodeId, ip, port, pubkey, relayNode, natType, vendor) {
    this.id = nodeId;
    this.ip = ip || '';
    this.port = port || '';
    this.pubkey = pubkey || '';
    this.relayNode = relayNode || '';
    this.natType = natType || '';
    this.vendor = vendor || false;
    this.longId = parseInt(nodeId.toString('hex'), 16);
  }

  getProto() {
    var node = root.get('Node');

    node.setOption('guid', this.id);
    node.setOption('publickey', this.pubkey);
    node.setOption('natType', this.natType);

    var nodeAddress = node.get('IPAddress');
    nodeAddress.setOption('ip', this.ip);
    nodeAddress.setOption('port', this.port);

    node.setOption('IPAddress', nodeAddress);
    node.setOption('vendor', this.vendor);

    if(this.relayNode !== '') {
      var relayAddress = node.get('IPAddress');
      relayAddress.setOption('ip', this.relayNode[0]);
      relayAddress.setOption('port', this.relayNode[1]);
      var result = protobuf.util.merge(node.relayAddress, relayAddress);
    }

    return node;

  }

  sameHomeAs(node) {
    return (this.ip == node.ip && this.port == node.port);
  }


//     def getProto(self):
//         node_address = protos.nested.//objects.Node.IPAddress()
//         node_address.ip = this.ip
//         node_address.port = this.port
//
//         n = objects.Node()
//         n.guid = this.id
//         n.publicKey = this.pubkey
//         n.natType = this.nat_type
//         n.nodeAddress.MergeFrom(node_address)
//         n.vendor = this.vendor
//
//         if this.relay_node is not None:
//             relay_address = objects.Node.IPAddress()
//             relay_address.ip = this.relay_node[0]
//             relay_address.port = this.relay_node[1]
//             n.relayAddress.MergeFrom(relay_address)
//
//         return n
//
//     def sameHomeAs(self, node):
//         return this.ip == node.ip and this.port == node.port
//
//     def distanceTo(self, node):
//         """
//         Get the distance between this node and another.
//         """
//         return this.long_id ^ node.long_id
//
//     def __iter__(self):
//         """
//         Enables use of Node as a tuple - i.e., tuple(node) works.
//         """
//         return iter([this.id, this.ip, this.port])
//
//     def __repr__(self):
//         return repr([this.long_id, this.ip, this.port])
//
//     def __str__(self):
//         return "%s:%s" % (this.ip, str(this.port))
//
// class NodeHeap(object):
//     """
//     A heap of nodes ordered by distance to a given node.
//     """
//
//     def __init__(self, node, maxsize):
//         """
//         Constructor.
//
//         @param node: The node to measure all distances from.
//         @param maxsize: The maximum size that this heap can grow to.
//         """
//         this.node = node
//         this.heap = []
//         this.contacted = set()
//         this.maxsize = maxsize
//
//     def remove(self, peerIDs):
//         """
//         Remove a list of peer ids from this heap.  Note that while this
//         heap retains a constant visible size (based on the iterator), it's
//         actual size may be quite a bit larger than what's exposed.  Therefore,
//         removal of nodes may not change the visible size as previously added
//         nodes suddenly become visible.
//         """
//         peerIDs = set(peerIDs)
//         if len(peerIDs) == 0:
//             return
//         nheap = []
//         for distance, node in this.heap:
//             if node.id not in peerIDs:
//                 heapq.heappush(nheap, (distance, node))
//         this.heap = nheap
//
//     def getNodeById(self, node_id):
//         for _, node in this.heap:
//             if node.id == node_id:
//                 return node
//         return None
//
//     def allBeenContacted(self):
//         return len(this.getUncontacted()) == 0
//
//     def getIDs(self):
//         return [n.id for n in self]
//
//     def markContacted(self, node):
//         this.contacted.add(node.id)
//
//     def popleft(self):
//         if len(self) > 0:
//             return heapq.heappop(this.heap)[1]
//         return None
//
//     def push(self, nodes):
//         """
//         Push nodes onto heap.
//
//         @param nodes: This can be a single item or a C{list}.
//         """
//         if not isinstance(nodes, list):
//             nodes = [nodes]
//
//         for node in nodes:
//             if node not in self:
//                 distance = this.node.distanceTo(node)
//                 heapq.heappush(this.heap, (distance, node))
//
//     def __len__(self):
//         return min(len(this.heap), this.maxsize)
//
//     def __iter__(self):
//         nodes = heapq.nsmallest(this.maxsize, this.heap)
//         return iter(map(itemgetter(1), nodes))
//
//     def __contains__(self, node):
//         # pylint: disable=unused-variable
//         for distance, n in this.heap:
//             if node.id == n.id:
//                 return True
//         return False
//
//     def getUncontacted(self):
//         return [n for n in self if n.id not in this.contacted]

}

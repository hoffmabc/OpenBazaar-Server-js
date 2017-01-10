"use strict"

/**
 Copyright (c) 2014 Brian Muller
 Copyright (c) 2015 OpenBazaar
 **/
// import heapq

// from operator import itemgetter
// from protos import objects
const protobuf = require('protobufjs');
const root = protobuf.Root.fromJSON(require("../../protos/bundle.json"));
const Set = require('sorted-set');
const heapq = require('heapq');
const protos = protobuf.Root.fromJSON('./protos/openbazaar.json');

const objects = require('../../protos/objects_pb');


class DHTNode {
    constructor(nodeId, ip, port, pubkey, relayNode, natType, vendor) {
        this.id = nodeId;
        this.ip = ip;
        this.port = port;
        this.pubkey = pubkey;
        this.relayNode = relayNode;
        this.natType = natType;
        this.vendor = vendor || false;
        this.longId = parseInt(nodeId, 16);
    }

    distanceTo(node) {
        return this.longId ^ node.longId;
    }

    getProto() {

        let n = new objects.Node();
        n.setGuid(new Uint8Array(Buffer(this.id, 'hex')));
        n.setPublickey(new Uint8Array(Buffer(this.pubkey, 'hex')));
        n.setNattype(this.natType);

        let nodeAddress = new objects.Node.IPAddress();
        nodeAddress.setIp(this.ip);
        nodeAddress.setPort(this.port);

        n.setNodeaddress(nodeAddress);
        n.setVendor(this.vendor);

        // If acting as relay add the relay address into the protobuf
        if (this.relayNode !== '') {
            let relayAddress = new objects.Node.IPAddress();
            relayAddress.setIp(this.relayNode[0]);
            relayAddress.setPort(this.relayNode[1]);
            n.setRelayaddress(relayAddress);
        }

        return n;
    }

    sameHomeAs(node) {
        return (this.ip == node.ip && this.port == node.port);
    }

}

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

class NodeHeap {
    /**
     A heap of nodes ordered by distance to a given node.
     **/
    constructor(node, maxsize) {
        /**
         Constructor.

         @param node: The node to measure all distances from.
         @param maxsize: The maximum size that this heap can grow to.
         **/
        this.node = node;
        this.heap = [];
        this.contacted = new Set();
        this.maxsize = maxsize;
    }

    remove(peerIDs) {
        /**
         Remove a list of peer ids from this heap.  Note that while this
         heap retains a constant visible size (based on the iterator), it's
         actual size may be quite a bit larger than what's exposed.  Therefore,
         removal of nodes may not change the visible size as previously added
         nodes suddenly become visible.
         **/
        peerIDs = new Set(peerIDs);
        let node;
        if (peerIDs.length == 0) {
            return;
        }
        let nheap = [];
        for (var distance in this.heap) {
            node = this.heap[distance];
            if (peerIDs.includes(node)) {
                heapq.push(nheap, [distance, node]);
            }
        }
        this.heap = nheap;
    }

    getHeap() {
        let maxItems = [];
        for(let i=0; i<this.maxsize; i++) {
            if(!maxItems.includes(heapq.top(this.heap))) {
                maxItems.push(heapq.top(this.heap));
            }
        }
        return maxItems;
    }

    markContacted(node) {
        this.contacted.add(node.id);
    }

    allBeenContacted() {
        return this.getUncontacted().length == 0;
    }

    push(nodes) {
        /**
         Push nodes onto heap.

         @param nodes: This can be a single item or a C{list}.
         **/
        let node;
        for (var i in nodes) {
            node = nodes[i];
            if (nodes.includes(node)) {
                let distance = this.node.distanceTo(node);
                heapq.push(this.heap, [distance, node]);
            }
        }
    }

    getIDs() {
        let ids = [];
        for (var n in this.heap) {
            ids.push(this.heap[n].id);
        }
        return ids;
    }

    contains(node) {
        for (var i in this.heap) {
            if (node.id == this.heap[i].id) {
                return true;
            }
        }
        return false;
    }

    getUncontacted() {
        let uncontacted = [];
        let heap = this.getHeap();
        for (var n in heap) {
            if (!this.contacted.has(heap[n][1].id)) {
                uncontacted.push(this.heap[n][1]);
            }
        }
        return uncontacted;
    }
}


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


module.exports = {
    DHTNode: DHTNode,
    NodeHeap: NodeHeap
}

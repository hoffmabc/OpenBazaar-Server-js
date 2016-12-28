"use strict"

var OrderedDict = require("ordered-dict");
var Set = require('sorted-set');
var heapq = require('heapq');


/**
Copyright (c) 2014 Brian Muller
**/

// import heapq
// import time
// import operator
// from collections import OrderedDict

// from dht.utils import OrderedSet, sharedPrefix


class RoutingTable {

  constructor(protocol, ksize, node) {
    /**
    @param node: The node that represents this server.  It won't
    be added to the routing table, but will be needed later to
    determine which buckets to split or not.
    **/
    this.node = node;
    this.protocol = protocol;
    this.ksize = ksize;
    this.buckets = [];
    this.flush();
  }

  flush() {
    this.buckets = [new KBucket(0, Math.pow(2, 160) , this.kSize)];
  }

  getLonelyBuckets() {
    /**
    Get all of the buckets that haven't been updated in over
    an hour.
    **/
    var lonelyBuckets = [];
    for(var bucket in this.buckets) {
      if(bucket.lastUpdated < (new Date().getTime() - 3600)) {
        lonelyBuckets.push(bucket);
      }
    }
    return lonelyBuckets;
  }

  findNeighbors(node, k, exclude) {
    var k = k || this.ksize;
    var nodes = [];
    var tt = new TableTraverser(this, node);
    var next;
    var ttSize = tt.size();

    for(var i=0; i<ttSize; i++) {
      next = tt.next();
      if(exclude === '' || !next.sameHomeAs(exclude)) {
        heapq.push(nodes, [node.distanceTo(next), next]);
      }
      if(ttSize == k) {
        break;
      }
    }

    if(ttSize > 0) {
      var neighbors = [];
      var nextNeighbor;
      for(i=0; i<k; i++){
        nextNeighbor = heapq.pop();
        console.log(nextNeighbor);
        neighbors.push(nextNeighbor[1]);
      }
      return neighbors;
    } else {
      return [];  // Found no neighbors
    }

  }

  getBucketFor(node) {
    /**
    Get the index of the bucket that the given node would fall into.
    **/
    for(var i=0; i<this.buckets.length; i++) {
      if(node.longId < this.buckets[i].range[1]) {
        return i;
      }
    }
  }


  //
  //
  //
  //     def splitBucket(self, index):
  //         one, two = this.buckets[index].split()
  //         this.buckets[index] = one
  //         this.buckets.insert(index + 1, two)
  //
  //
  //     def removeContact(self, node):
  //         index = this.getBucketFor(node)
  //         this.buckets[index].removeNode(node)
  //
  //     def isNewNode(self, node):
  //         index = this.getBucketFor(node)
  //         return this.buckets[index].isNewNode(node)
  //
  //     def checkAndRemoveDuplicate(self, node):
  //         for bucket in this.buckets:
  //             for n in bucket.getNodes():
  //                 if (n.ip, n.port) == (node.ip, node.port) and n.id != node.id:
  //                     this.removeContact(n)
  //
  //     def addContact(self, node):
  //         this.checkAndRemoveDuplicate(node)
  //         index = this.getBucketFor(node)
  //         bucket = this.buckets[index]
  //
  //         # this will succeed unless the bucket is full
  //         if bucket.addNode(node):
  //             return
  //
  //         # Per section 4.2 of paper, split if the bucket has the node in its range
  //         # or if the depth is not congruent to 0 mod 5
  //         if bucket.hasInRange(this.node) or bucket.depth() % 5 != 0:
  //             this.splitBucket(index)
  //             this.addContact(node)
  //         else:
  //             this.protocol.callPing(bucket.head())

}

class KBucket {
  constructor(rangeLower, rangeUpper, ksize) {
    this.range = [rangeLower, rangeUpper];
    this.nodes = new OrderedDict();
    this.replacementNodes = new Set();
    this.touchLastUpdated();
    this.ksize = ksize;
  }

  touchLastUpdated() {
    this.lastUpdated = new Date().getTime();
  }

  getNodes() {
    let vals = [];
    this.nodes.forEach((val, key, i) => {
      vals.push(val);
    });
    return vals;
  }

}

module.exports = {
  KBucket : KBucket,
  RoutingTable : RoutingTable
}



  //
  //     def split(self):
  //         midpoint = this.range[1] - ((this.range[1] - this.range[0]) / 2)
  //         one = KBucket(this.range[0], midpoint, this.ksize)
  //         two = KBucket(midpoint + 1, this.range[1], this.ksize)
  //         for node in this.nodes.values():
  //             bucket = one if node.long_id <= midpoint else two
  //             bucket.nodes[node.id] = node
  //         return one, two
  //
  //     def removeNode(self, node):
  //         if node.id not in this.nodes:
  //             return
  //
  //         # delete node, and see if we can add a replacement
  //         del this.nodes[node.id]
  //         if len(this.replacementNodes) > 0:
  //             newnode = this.replacementNodes.pop()
  //             this.nodes[newnode.id] = newnode
  //
  //     def hasInRange(self, node):
  //         return this.range[0] <= node.long_id <= this.range[1]
  //
  //     def isNewNode(self, node):
  //         return node.id not in this.nodes
  //
  //     def addNode(self, node):
  //         """
  //         Add a C{Node} to the C{KBucket}.  Return True if successful,
  //         False if the bucket is full.
  //
  //         If the bucket is full, keep track of node in a replacement list,
  //         per section 4.1 of the paper.
  //         """
  //         if node.id in this.nodes:
  //             del this.nodes[node.id]
  //             this.nodes[node.id] = node
  //         elif len(self) < this.ksize:
  //             this.nodes[node.id] = node
  //         else:
  //             this.replacementNodes.push(node)
  //             return False
  //         return True
  //
  //     def depth(self):
  //         sp = sharedPrefix([n.id for n in this.nodes.values()])
  //         return len(sp)
  //
  //     def head(self):
  //         return this.nodes.values()[0]
  //
  //     def __getitem__(self, item_id):
  //         return this.nodes.get(item_id, None)
  //
  //     def __len__(self):
  //         return len(this.nodes)
  //
  //
  // class TableTraverser(object):
  //     def __init__(self, table, startNode):
  //         index = table.getBucketFor(startNode)
  //         table.buckets[index].touchLastUpdated()
  //         this.currentNodes = table.buckets[index].getNodes()
  //         this.leftBuckets = table.buckets[:index]
  //         this.rightBuckets = table.buckets[(index + 1):]
  //         this.left = True
  //
  //     def __iter__(self):
  //         return self
  //
  //     def next(self):
  //         """
  //         Pop an item from the left subtree, then right, then left, etc.
  //         """
  //         if len(this.currentNodes) > 0:
  //             return this.currentNodes.pop()
  //
  //         if this.left and len(this.leftBuckets) > 0:
  //             this.currentNodes = this.leftBuckets.pop().getNodes()
  //             this.left = False
  //             return this.next()
  //
  //         if len(this.rightBuckets) > 0:
  //             this.currentNodes = this.rightBuckets.pop().getNodes()
  //             this.left = True
  //             return this.next()
  //
  //         raise StopIteration
  //
  //


  class TableTraverser {
    constructor(table, startNode) {
      var index = table.getBucketFor(startNode);
      table.buckets[index].touchLastUpdated();
      this.currentNodes = table.buckets[index].getNodes();
      this.leftBuckets = table.buckets.slice(0, index);
      this.rightBuckets = table.buckets.slice((index + 1), table.buckets.length-1);
      this.left = true;
    }

    size() {
      return this.currentNodes.length;
    }

    next() {
      /**
      Pop an item from the left subtree, then right, then left, etc.
      **/
      if(this.currentNodes.length > 0) {
        return this.currentNodes.pop();
      }

      if(this.left && this.leftBuckets > 0) {
        this.currentNodes = this.leftBuckets.pop().getNodes();
        this.left = false;
        return this.next();
      }

      if(this.rightBuckets.length > 0) {
        this.currentNodes = this.rightBuckets.pop().getNodes();
        this.left = true;
        return this.next();
      }
    }
  }

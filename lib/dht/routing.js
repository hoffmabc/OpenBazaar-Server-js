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
    this.buckets = [new KBucket(0, Math.pow(2, 160), this.ksize)];
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

  addContact(node) {
    this.checkAndRemoveDuplicate(node);
    let index = this.getBucketFor(node);
    let bucket = this.buckets[index];

    // This will succeed unless the bucket is full
    if(bucket.addNode(node)) {
      return
    }

    // Per section 4.2 of whitepaper, split if the bucket has the node in it's range
    // or if the depth is not congruent to 0mod5
      if(bucket.hasInRange(this.node) || bucket.depth()%5 != 0) {
        this.splitBucket(index);
        this.addContact(node);
      } else {
        this.protocol.callPing(bucket.head());
      }
  }

  splitBucket(index) {
    let split = this.buckets[index].split();
    this.buckets[index] = split[0];
    this.buckets.splice(index+1, 0, split[1]);
  }

  removeContact(node) {
    let index = this.getBucketFor(node);
    this.buckets[index].removeNode(node);
  }

  isNewNode(node) {
    let index = this.getBucketFor(node);
    return this.buckets[index].isNewNode(node);
  }

  checkAndRemoveDuplicate(node) {
    for(let bucketIndex in this.buckets) {
      let bucket = this.buckets[bucketIndex];
      let bucketNodes = bucket.getNodes();
      for(let nodeIndex in bucketNodes) {
        let n = bucketNodes[nodeIndex];
        if([n.ip, n.port] == [node.ip, node.port] && n.id != node.id) {
          this.removeContact(n);
        }
      }
    }
  }

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

  addNode(node) {
      /**
      Add a C{Node} to the C{KBucket}.  Return True if successful,
          False if the bucket is full.

          If the bucket is full, keep track of node in a replacement list,
          per section 4.1 of the paper.
      **/
      if(this.nodes.has(node.id)) {
        delete this.nodes[node.id];
        this.nodes[node.id] = node;
      } else if(this.nodes.size() < this.ksize) {
        this.nodes[node.id] = node;
      } else {
        this.replacementNodes.add(node);
        return false;
      }
      return true;
  }

  hasInRange(node) {
    return this.range[0] <= node.longId <= this.range[1];
  }

  depth() {
    let nodeIDs = [];
    let nodeValues = this.nodes.values();
    for(var nodeIndex in nodeValues) {
      let n = nodeValues[nodeIndex];
      nodeIDs.push(n.id);
    }
    let sp = sharedPrefix(nodeIDs);
    return sp.length;
  }

  split() {
    let node;

    let midpoint = this.range[1] - ((this.range[1] - this.range[0])/2);
    let one = new KBucket(this.range[0], midpoint, this.ksize);
    let two = new KBucket(midpoint+1, this.range[1], this.ksize);

    //
    this.nodes.forEach((node, key, index) => {
      let bucket = (node.longId <= midpoint) ? one : two;
      bucket.nodes[node.id] = node;
    });
    return [one, two];
  }

}

module.exports = {
  KBucket : KBucket,
  RoutingTable : RoutingTable
};




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

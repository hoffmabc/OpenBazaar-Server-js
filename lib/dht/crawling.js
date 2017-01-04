"use strict"

// from collections import Counter, defaultdict
// from twisted.internet import defer
//
// from log import Logger
//
// from dht.utils import deferredDict
// from dht.node import Node, NodeHeap
//
// from protos import objects

const Node = require('./node.js');


class SpiderCrawl {
  /**
  Crawl the network and look for given 160-bit keys.
  **/

  constructor(protocol, node, peers, ksize, alpha) {
    /**
    Create a new C{SpiderCrawl}er.

    Args:
        protocol: A :class:`~kademlia.protocol.KademliaProtocol` instance.
        node: A :class:`~kademlia.node.Node` representing the key we're looking for
        peers: A list of :class:`~kademlia.node.Node` instances that provide the entry point for the network
        ksize: The value for k based on the paper
        alpha: The value for alpha based on the paper
    **/
    this.protocol = protocol;
    this.ksize = ksize;
    this.alpha = alpha;
    this.node = node;
    this.nearest = new Node.NodeHeap(this.node, this.ksize);
    this.lastIDsCrawled = [];
    //this.log = Logger(system=self);
    console.log('Creating spider with peers: ', peers);
    this.nearest.push(peers);
  }

  find(rpcmethod) {
    /**
    Get either a value or list of nodes.

    Args:
        rpcmethod: The protocol's callFindValue or callFindNode.

    The process:
      1. calls find_* to current ALPHA nearest not already queried nodes,
         adding results to current nearest list of k nodes.
      2. current nearest list needs to keep track of who has been queried already
         sort by nearest, keep KSIZE
      3. if list is same as last time, next call should be to everyone not
         yet queried
      4. repeat, unless nearest list has all been queried, then ur done
    **/
    console.log('Crawling with nearest: ', this.nearest.heap);

    let count = this.alpha;
    if(this.nearest.getIDs() == this.lastIDsCrawled) {
      console.log('Last iteration same as current - checking all in list now');
      let count = this.nearest.length;
    }
    this.lastIDsCrawled = this.nearest.getIDs();

    let ds = {};
    let uncontacted = this.nearest.getUncontacted().splice(0, count);

    if(uncontacted.length == 0) {
      return;
    }

    for(var peer in uncontacted) {
      ds[peer.id] = rpcmethod(peer, this.node);
      this.nearest.markContacted(peer);
    }
    return deferredDict(ds).addCallback(this._nodesFound)
  }
}



//class ValueSpiderCrawl(SpiderCrawl):
//     def __init__(self, protocol, node, peers, ksize, alpha, save_at_nearest=True):
//         SpiderCrawl.__init__(self, protocol, node, peers, ksize, alpha)
//         # keep track of the single nearest node without value - per
//         # section 2.3 so we can set the key there if found
//         this.nearestWithoutValue = NodeHeap(this.node, 1)
//         this.saveToNearestWitoutValue = save_at_nearest
//
//     def find(self):
//         """
//         Find either the closest nodes or the value requested.
//         """
//         return this._find(this.protocol.callFindValue)
//
//     def _nodesFound(self, responses):
//         """
//         Handle the result of an iteration in _find.
//         """
//         toremove = []
//         foundValues = []
//         for peerid, response in responses.items():
//             response = RPCFindResponse(response)
//             if not response.happened():
//                 toremove.append(peerid)
//             elif response.hasValue():
//                 # since we get back a list of values, we will just extend foundValues (excluding duplicates)
//                 foundValues = list(set(foundValues) | set(response.getValue()))
//             else:
//                 peer = this.nearest.getNodeById(peerid)
//                 this.nearestWithoutValue.push(peer)
//                 this.nearest.push(response.getNodeList())
//         this.nearest.remove(toremove)
//
//         if len(foundValues) > 0:
//             return this._handleFoundValues(foundValues)
//         if this.nearest.allBeenContacted():
//             # not found!
//             return None
//         return this.find()
//
//     def _handleFoundValues(self, values):
//         """
//         We got some values!  Exciting.  But let's make sure
//         they're all the same or freak out a little bit.  Also,
//         make sure we tell the nearest node that *didn't* have
//         the value to store it.
//         """
//
//         value_dict = defaultdict(list)
//         ttl_dict = defaultdict(list)
//         for v in values:
//             try:
//                 d = objects.Value()
//                 d.ParseFromString(v)
//                 value_dict[d.valueKey].append(d.serializedData)
//                 ttl_dict[d.valueKey].append(d.ttl)
//             except Exception:
//                 pass
//         value = []
//         for k, v in value_dict.items():
//             ttl = ttl_dict[k]
//             if len(v) > 1:
//                 valueCounts = Counter(v)
//                 v = [valueCounts.most_common(1)[0][0]]
//                 ttlCounts = Counter(ttl_dict[k])
//                 ttl = [ttlCounts.most_common(1)[0][0]]
//             val = objects.Value()
//             val.valueKey = k
//             val.serializedData = v[0]
//             val.ttl = ttl[0]
//             value.append(val.SerializeToString())
//
//         if this.saveToNearestWitoutValue:
//             ds = []
//             peerToSaveTo = this.nearestWithoutValue.popleft()
//             if peerToSaveTo is not None:
//                 for v in value:
//                     try:
//                         val = objects.Value()
//                         val.ParseFromString(v)
//                         ds.append(this.protocol.callStore(peerToSaveTo, this.node.id, val.valueKey,
//                                                           val.serializedData, val.ttl))
//                     except Exception:
//                         pass
//                 return defer.gatherResults(ds).addCallback(lambda _: value)
//         return value
//
//
class NodeSpiderCrawl extends SpiderCrawl {
  constructor(protocol, node, peers, ksize, alpha, findExact) {
    super(protocol, node, peers, ksize, alpha);
    this.findExact = findExact;
  }

  find() {
    /**
    Find the closest nodes.
    **/
    return this._find(this.protocol.callFindNode);
  }

  _nodesFound(responses) {
    /**
    Handle the result of an iteration in _find.
    **/
    let toRemove = [];
    for(var i=0, len=responses.items.length; i<len; i++) {
      let peer = responses.items[i];
      let response = RPCFindResponse(peer[1]);
      if(!response.happened()) {
        toRemove.push(peer[0]);
      } else {
        let nodeList = response.getNodeList();
        this.nearest.push(nodeList);
        if(this.findExact) {
          for(var nodeIndex in nodeList) {
            var node = nodeList[nodeIndex];
            if(node.id == this.node.id) {
              return [node];
            }
          }
        }
      }
    }

    for(var j=0, len=toRemove.length; j<len; j++) {
      delete this.nearest[toRemove[j]];
    }

    if(this.nearest.allBeenContacted()) {
      // Contacted all possible nodes for crawling
      return this.nearest;
    }

    return this.find();

  }


}





//
//
// class RPCFindResponse(object):
//     def __init__(self, response):
//         """
//         A wrapper for the result of a RPC find.
//
//         Args:
//             response: This will be a tuple of (<response received>, <value>)
//                       where <value> will be a list of tuples if not found or
//                       a dictionary of {'value': v} where v is the value desired
//         """
//         this.response = response
//
//     def happened(self):
//         """
//         Did the other host actually respond?
//         """
//         return this.response[0]
//
//     def hasValue(self):
//         if len(this.response) > 0 and len(this.response[1]) > 0:
//             if this.response[1][0] == "value":
//                 return True
//         return False
//
//     def getValue(self):
//         return this.response[1][1:]
//
//     def getNodeList(self):
//         """
//         Get the node list in the response.  If there's no value, this should
//         be set.
//         """
//         nodes = []
//         for node in this.response[1]:
//             try:
//                 n = objects.Node()
//                 n.ParseFromString(node)
//                 newNode = Node(n.guid, n.nodeAddress.ip, n.nodeAddress.port, n.publicKey,
//                                None if not n.HasField("relayAddress") else (n.relayAddress.ip, n.relayAddress.port),
//                                n.natType,
//                                n.vendor)
//                 nodes.append(newNode)
//             except Exception:
//                 pass
//         return nodes

module.exports = {
  SpiderCrawl : SpiderCrawl,
  NodeSpiderCrawl : NodeSpiderCrawl
}
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
const objects = require('../../protos/objects_pb');

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
        let peersList = [];
        peers.forEach((val) => {
            peersList.push(val.ip);
        });
        console.log('Creating spider with peers: ', peersList);
        this.nearest.push(peers);
    }

    _find(rpcmethod) {
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

        let findPromise = new Promise((resolve, reject) => {

            let nearestList = [];
            let ds = [];

            // Generate list of nearest nodes
            this.nearest.getHeap().forEach((val) => {
                console.log(val);
                nearestList.push(val[1].ip + ':' + val[1].port);
            });
            console.log('[SpiderCrawl] Crawling with nearest: ', nearestList);

            let count = this.alpha;
            if (this.nearest.getIDs() == this.lastIDsCrawled) {
                console.log('[SpiderCrawl] Last iteration same as current - checking all in list now');
                let count = this.nearest.length;
            }
            this.lastIDsCrawled = this.nearest.getIDs();

            let uncontacted = this.nearest.getUncontacted().splice(0, count);

            if (uncontacted.length == 0) {
                resolve([]);
                return;
            }

            // Send RPC call to each uncontacted peer
            for (let peerIndex in uncontacted) {
                let peer = uncontacted[peerIndex];

                // Push RPC call promise onto Promise list
                ds.push(rpcmethod(this.protocol, peer, this.node));

                this.nearest.markContacted(peer);
            }

            Promise.all(ds).then((results) => {
                console.log('[SpiderCrawl] Crawling iteration completed...');

                this._nodesFound(results)
                    .catch((err) => {
                        console.log('[SpiderCrawl]', err);
                    })
                    .then((result) => {
                        console.log('[SpiderCrawl] Done with another iteration...')
                        if(result !== undefined) {
                            resolve(result);
                        } else {
                            reject('Oops');
                        }

                    }, (result) => {
                        console.log('Rejected...', result);
                        reject(result);
                    });

            }).catch((err) => {
                console.log(err);
                reject('Here');
            });
        }).catch((err) => {
            console.log('Theres an error here');
        });

        return findPromise;

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

        for (let peerId = 0, len = responses.length; peerId < len; peerId++) {
            let response = responses[peerId];
            response = new RPCFindResponse(response[1]);

            if (!response.happened()) {
                toRemove.push(peer[0]);
            } else {
                let nodeList = response.getNodeList();
                this.nearest.push(nodeList);
                if (this.findExact) {
                    for (let nodeIndex in nodeList) {
                        let node = nodeList[nodeIndex];
                        if (Buffer(node.id).toString('hex') == this.node.id) {
                            return Promise.resolve(node);
                        }
                    }
                }
            }
        }

        for (let j = 0, len = toRemove.length; j < len; j++) {
            delete this.nearest[toRemove[j]];
        }

        if (this.nearest.allBeenContacted()) {
            // Contacted all possible nodes for crawling
            return Promise.resolve([]);
        }

        return this.find();

    }


}

class RPCFindResponse {
    constructor(response) {
        /**
        A wrapper for the result of a RPC find.

            Args:
        response: This will be a tuple of (<response received>, <value>)
        where <value> will be a list of tuples if not found or
        a dictionary of {'value': v} where v is the value desired
        **/
        this.response = response;
    }

    happened() {
        return this.response[0];
    }

    hasValue() {
        if(this.response.length >0 && this.response[1].length > 0) {
            if(this.response[1][0] == 'value') {
                return true;
            }
        }
        return false;
    }

    getValue() {
        return this.response[1].slice(1);
    }

    getNodeList() {
        let nodes = [];
        for(var nodeId in this.response[1]) {
            let n = this.response[1][nodeId];
            let sNode = objects.Node.deserializeBinary(n);
            let sNodeAddress = sNode.getNodeaddress();

            let sNodeRelayAddress = sNode.getRelayaddress();
            let dhtNodeRelayAddress = null;
            if(sNodeRelayAddress !== undefined) {
                dhtNodeRelayAddress = [sNodeRelayAddress.getIp(), sNodeRelayAddress.getPort()];
            }

            let dhtNode = new Node.DHTNode(
                sNode.getGuid_asU8(),
                sNodeAddress.getIp(),
                sNodeAddress.getPort(),
                sNode.getPublickey(),
                dhtNodeRelayAddress,
                parseInt(sNode.getNattype()),
                sNode.getVendor()
            );

            nodes.push(dhtNode);
        }
        return nodes;
    }
}

module.exports = {
    SpiderCrawl: SpiderCrawl,
    NodeSpiderCrawl: NodeSpiderCrawl,
    RPCFindResponse: RPCFindResponse
}
"use strict"
/**
Package for interacting on the network at a high level.

Copyright (c) 2014 Brian Muller
Copyright (c) 2015 OpenBazaar
**/

const ForgetfulStorage = require('./storage.js');
const KademliaProtocol = require('./protocol.js');
const Node = require('./node.js');
const Utils = require('./utils.js');
const Peers = require('../seed/peers.js');
const crypto = require('crypto');
const secrets = require('secrets.js');
const Crawling = require('./crawling.js');
const http = require('http');
const zlib = require('zlib');
const sodium = require('sodium').api;
const protos = require('../../protos/protos.js');

module.exports = class Server {
  /**
  High level view of a node instance.  This is the object that should be created
  to start listening as an active node on the network.
  **/

  constructor(node, db, signingKey, ksize, alpha, storage) {
    /**
    Create a server instance.  This will start listening on the given port.

    Args:
        node: The node instance for this peer. It must contain (at minimum) an ID,
            public key, ip address, and port.
        ksize (int): The k parameter from the paper
        alpha (int): The alpha parameter from the paper
        storage: An instance that implements :interface:`~dht.storage.IStorage`
    **/
    this.ksize = ksize || 20;
    this.alpha = alpha || 3;
    this.storage = storage || new ForgetfulStorage();
    this.node = node;
    this.protocol = new KademliaProtocol(this.node, this.storage, this.ksize, db, signingKey);

    var that = this;
    setTimeout(() => {
      setInterval(() => { this.refreshTable(that) }, 3600*1000);
    }, 1800*1000
    );
  }

  refreshTable(server) {
    /**
    Refresh buckets that haven't had any lookups in the last hour
    (per section 2.3 of the paper).
    **/
    console.log('Refreshing DHT table...');

    var ds = [];
    var refreshIds = server.protocol.getRefreshIDs();

    var u = new Utils();
    refreshIds.push(u.digest(secrets.random(256)));  // random node so we get more diversity

    for(var rid in refreshIds) {
      var node = new Node.DHTNode(refreshIds[rid]);
      var nearest = server.protocol.router.findNeighbors(node, server.alpha);
      var spider = new Crawling.SpiderCrawl(server.protocol, node, nearest, server.ksize, server.alpha);
      ds.push(spider.find());
    }

    function republishKeys(_) {
      console.log('Republishing key/values...');
      var neighbors = server.protocol.router.findNeighbors(server.node, server.node);
      for(node in neighbors) {
        server.protocol.transferKeyValues(node);
      }
    }

    //return defer.gatherResults(ds).addCallback(republishKeys)
  }

  querySeed(listSeedPubkey, callback) {
    /**
    Query an HTTP seed and return a `list` if (ip, port) `tuple` pairs.

    Args:
        Receives a list of one or more tuples Example [(seed, pubkey)]
        seed: A `string` consisting of "ip:port" or "hostname:port"
        pubkey: The hex encoded public key to verify the signature on the response
    **/
    let nodes = [];
    if(listSeedPubkey === undefined) {
        console.log('Failed to query seed ', listSeedPubkey, ' from configuration file (ob.cfg).');
        return nodes;
    } else {
        for(let sp in listSeedPubkey) {
            let seed = listSeedPubkey[sp][0];
            let pubkey = listSeedPubkey[sp][1];
            try {
                console.log('Querying http://' + seed, 'for peers');

                let address = seed.split(':');
                http.get({
                    host: address[0],
                    port: address[1],
                    path: '?format=json'
                }, (res) => {
                    const statusCode = res.statusCode;
                    const contentType = res.headers['content-type'];
                    const encoding = res.headers['content-encoding'];

                    let error;
                    if (statusCode !== 200) {
                        error = new Error(`Request Failed.\n` +
                            `Status Code: ${statusCode}`);
                    }
                    if (error) {
                        console.log(error.message);
                        // consume response data to free up memory
                        res.resume();
                        return;
                    }

                    let rawData = '';
                    res.on('data', (chunk) => rawData += chunk);
                    res.on('end', () => {
                        var rawJSON = JSON.parse(rawData);
                        var peers = rawJSON.peers;
                        var signature = rawJSON.signature;

                        for(var p in peers) {
                            nodes.push([peers[p].ip, peers[p].port]);
                        }

                        // let verifyKey = sodium.crypto_sign_open(Buffer.from(peers.toString()), Buffer.from(pubkey, 'hex'));
                        // console.log(verifyKey);
                        console.log(seed, 'returned', nodes.length, 'addresses');
                        callback(nodes);
                    });
                });

            } catch(err) {
              console.log(err);
            }
            // except Exception, e:
            //     this.log.error("failed to query seed: %s" % str(e))
        return nodes;
      }
    }
  }

  bootstrap(addrs, callback, retries) {
      /**
       Bootstrap the server by connecting to other known nodes in the network.

       Args:
       addrs: A `list` of (ip, port) `tuple` pairs.  Note that only IP addresses
       are acceptable - hostnames will cause an error.
       **/

      // If the transport hasn't been initialized yet, wait a second
        let ds = [];
        for(var addrIndex in addrs) {
            if(addrs[addrIndex] != [this.node.ip, this.node.port]) {
                let addr = addrs[addrIndex];
                let u = new Utils();
                let nullDigest = u.digest('null');
                let NATTYPE = protos.nested.NATType.values;
                ds.push(new Promise((resolve, reject) => {
                    let value = this.protocol.rpcProxy('ping', new Node.DHTNode(nullDigest, addr[0], addr[1], NATTYPE['FULL_CONE']));
                    resolve([addr, value]);
                }));
            }
        }


        return Promise.all(ds).then(function(result) {



            // let response = false;
            // let potentialRelayNodes = [];
            // for(var index in results) {
            //     let addr = results[index][0];
            //     let result = results[index][1];
            //     if(result[0]) {
            //         response = true;
            //         let n = new Node.DHTNode();
            //         try {
            //
            //         }
            //     }
            // }




            // if result[0]:
            // response = True
            // n = objects.Node()
            // try:
            // n.ParseFromString(result[1][0])
            // h = nacl.hash.sha512(n.publicKey)
            // hash_pow = h[40:]
            // if int(hash_pow[:6], 16) >= 50 or hexlify(n.guid) != h[:40]:
            // raise Exception('Invalid GUID')
            // node = Node(n.guid, addr[0], addr[1], n.publicKey,
            //     None if not n.HasField("relayAddress") else
            //     (n.relayAddress.ip, n.relayAddress.port),
            //         n.natType,
            //         n.vendor)
            // self.protocol.router.addContact(node)
            // if n.natType == objects.FULL_CONE:
            // potential_relay_nodes.append((addr[0], addr[1]))
            // except Exception:
            //     self.log.warning("bootstrap node returned invalid GUID")
            // if not response:
            //     if self.protocol.multiplexer.testnet:
            // self.bootstrap(self.querySeed(SEEDS_TESTNET), d)
            // else:
            // self.bootstrap(self.querySeed(SEEDS), d)
            // return
            // if len(potential_relay_nodes) > 0 and self.node.nat_type != objects.FULL_CONE:
            // shuffle(potential_relay_nodes)
            // self.node.relay_node = potential_relay_nodes[0]
            //
            // d.callback(True)
            console.log('All done...');

        });





      // if (this.protocol.multiplexer.transport === undefined) {
      //     return task.deferLater(reactor, 1, this.bootstrap, addrs)
      // }
      // this.log.info("bootstrapping with %s addresses, finding neighbors..." % len(addrs))

      // if deferred is None:
      //     d = defer.Deferred()
      // else:
      //     d = deferred
      //
      // def initTable(results):
      //     response = False
      //     potential_relay_nodes = []
      //     for addr, result in results.items():
      //         if result[0]:
      //             response = True
      //             n = objects.Node()
      //             try:
      //                 n.ParseFromString(result[1][0])
      //                 h = nacl.hash.sha512(n.publicKey)
      //                 hash_pow = h[40:]
      //                 if int(hash_pow[:6], 16) >= 50 or hexlify(n.guid) != h[:40]:
      //                     raise Exception('Invalid GUID')
      //                 node = Node(n.guid, addr[0], addr[1], n.publicKey,
      //                             None if not n.HasField("relayAddress") else
      //                             (n.relayAddress.ip, n.relayAddress.port),
      //                             n.natType,
      //                             n.vendor)
      //                 this.protocol.router.addContact(node)
      //                 if n.natType == objects.FULL_CONE:
      //                     potential_relay_nodes.append((addr[0], addr[1]))
      //             except Exception:
      //                 this.log.warning("bootstrap node returned invalid GUID")
      //     if not response:
      //         if this.protocol.multiplexer.testnet:
      //             this.bootstrap(this.querySeed(SEEDS_TESTNET), d)
      //         else:
      //             this.bootstrap(this.querySeed(SEEDS), d)
      //         return
      //     if len(potential_relay_nodes) > 0 and this.node.nat_type != objects.FULL_CONE:
      //         shuffle(potential_relay_nodes)
      //         this.node.relay_node = potential_relay_nodes[0]
      //
      //     d.callback(True)
      // ds = {}
      // for addr in addrs:
      //     if addr != (this.node.ip, this.node.port):
      //         ds[addr] = this.protocol.ping(Node(digest("null"), addr[0], addr[1], nat_type=objects.FULL_CONE))
      // deferredDict(ds).addCallback(initTable)
      // return d
  }
};

// def _anyRespondSuccess(responses):
//     """
//     Given the result of a DeferredList of calls to peers, ensure that at least
//     one of them was contacted and responded with a Truthy result.
//     """
//     for deferSuccess, result in responses:
//         peerReached, peerResponse = result
//         if deferSuccess and peerReached and peerResponse:
//             return True
//     return False
//
//
// class Server(object):
//
//
//     def listen(self, port):
//         """
//         Start listening on the given port.
//
//         This is the same as calling::
//
//             reactor.listenUDP(port, server.protocol)
//         """
//         return reactor.listenUDP(port, this.protocol)
//
//     def refreshTable(self):
//         """
//         Refresh buckets that haven't had any lookups in the last hour
//         (per section 2.3 of the paper).
//         """
//         ds = []
//         refresh_ids = this.protocol.getRefreshIDs()
//         refresh_ids.append(digest(random.getrandbits(255)))  # random node so we get more diversity
//         for rid in refresh_ids:
//             node = Node(rid)
//             nearest = this.protocol.router.findNeighbors(node, this.alpha)
//             spider = NodeSpiderCrawl(this.protocol, node, nearest, this.ksize, this.alpha)
//             ds.append(spider.find())
//
//         def republishKeys(_):
//             this.log.debug("Republishing key/values...")
//             neighbors = this.protocol.router.findNeighbors(this.node, exclude=this.node)
//             for node in neighbors:
//                 this.protocol.transferKeyValues(node)
//
//         return defer.gatherResults(ds).addCallback(republishKeys)
//
//     def querySeed(self, list_seed_pubkey):
//         """
//         Query an HTTP seed and return a `list` if (ip, port) `tuple` pairs.
//
//         Args:
//             Receives a list of one or more tuples Example [(seed, pubkey)]
//             seed: A `string` consisting of "ip:port" or "hostname:port"
//             pubkey: The hex encoded public key to verify the signature on the response
//         """
//
//         nodes = []
//         if not list_seed_pubkey:
//             this.log.error('failed to query seed {0} from ob.cfg'.format(list_seed_pubkey))
//             return nodes
//         else:
//             for sp in list_seed_pubkey:
//                 seed, pubkey = sp
//                 try:
//                     this.log.info("querying %s for peers" % seed)
//                     c = httplib.HTTPConnection(seed)
//                     c.request("GET", "/")
//                     response = c.getresponse()
//                     this.log.debug("Http response from %s: %s, %s" % (seed, response.status, response.reason))
//                     data = response.read()
//                     reread_data = data.decode("zlib")
//                     proto = peers.PeerSeeds()
//                     proto.ParseFromString(reread_data)
//                     for peer in proto.serializedNode:
//                         n = objects.Node()
//                         n.ParseFromString(peer)
//                         tup = (str(n.nodeAddress.ip), n.nodeAddress.port)
//                         nodes.append(tup)
//                     verify_key = nacl.signing.VerifyKey(pubkey, encoder=nacl.encoding.HexEncoder)
//                     verify_key.verify("".join(proto.serializedNode), proto.signature)
//                     this.log.info("%s returned %s addresses" % (seed, len(nodes)))
//                 except Exception, e:
//                     this.log.error("failed to query seed: %s" % str(e))
//             return nodes
//
//     def bootstrappableNeighbors(self):
//         """
//         Get a :class:`list` of (ip, port) :class:`tuple` pairs suitable for use as an argument
//         to the bootstrap method.
//
//         The server should have been bootstrapped
//         already - this is just a utility for getting some neighbors and then
//         storing them if this server is going down for a while.  When it comes
//         back up, the list of nodes can be used to bootstrap.
//         """
//         neighbors = this.protocol.router.findNeighbors(this.node)
//         return [tuple(n)[-2:] for n in neighbors]
//
//     def bootstrap(self, addrs, deferred=None):
//         """
//         Bootstrap the server by connecting to other known nodes in the network.
//
//         Args:
//             addrs: A `list` of (ip, port) `tuple` pairs.  Note that only IP addresses
//                    are acceptable - hostnames will cause an error.
//         """
//
//         # if the transport hasn't been initialized yet, wait a second
//         if this.protocol.multiplexer.transport is None:
//             return task.deferLater(reactor, 1, this.bootstrap, addrs)
//         this.log.info("bootstrapping with %s addresses, finding neighbors..." % len(addrs))
//
//         if deferred is None:
//             d = defer.Deferred()
//         else:
//             d = deferred
//
//         def initTable(results):
//             response = False
//             potential_relay_nodes = []
//             for addr, result in results.items():
//                 if result[0]:
//                     response = True
//                     n = objects.Node()
//                     try:
//                         n.ParseFromString(result[1][0])
//                         h = nacl.hash.sha512(n.publicKey)
//                         hash_pow = h[40:]
//                         if int(hash_pow[:6], 16) >= 50 or hexlify(n.guid) != h[:40]:
//                             raise Exception('Invalid GUID')
//                         node = Node(n.guid, addr[0], addr[1], n.publicKey,
//                                     None if not n.HasField("relayAddress") else
//                                     (n.relayAddress.ip, n.relayAddress.port),
//                                     n.natType,
//                                     n.vendor)
//                         this.protocol.router.addContact(node)
//                         if n.natType == objects.FULL_CONE:
//                             potential_relay_nodes.append((addr[0], addr[1]))
//                     except Exception:
//                         this.log.warning("bootstrap node returned invalid GUID")
//             if not response:
//                 if this.protocol.multiplexer.testnet:
//                     this.bootstrap(this.querySeed(SEEDS_TESTNET), d)
//                 else:
//                     this.bootstrap(this.querySeed(SEEDS), d)
//                 return
//             if len(potential_relay_nodes) > 0 and this.node.nat_type != objects.FULL_CONE:
//                 shuffle(potential_relay_nodes)
//                 this.node.relay_node = potential_relay_nodes[0]
//
//             d.callback(True)
//         ds = {}
//         for addr in addrs:
//             if addr != (this.node.ip, this.node.port):
//                 ds[addr] = this.protocol.ping(Node(digest("null"), addr[0], addr[1], nat_type=objects.FULL_CONE))
//         deferredDict(ds).addCallback(initTable)
//         return d
//
//     def inetVisibleIP(self):
//         """
//         Get the internet visible IP's of this node as other nodes see it.
//
//         Returns:
//             A `list` of IP's.  If no one can be contacted, then the `list` will be empty.
//         """
//
//         def handle(results):
//             ips = []
//             for result in results:
//                 if result[0]:
//                     ips.append((result[1][0], int(result[1][1])))
//             this.log.debug("other nodes think our ip is %s" % str(ips))
//             return ips
//
//         ds = []
//         for neighbor in this.bootstrappableNeighbors():
//             ds.append(this.protocol.stun(neighbor))
//         return defer.gatherResults(ds).addCallback(handle)
//
//     def get(self, keyword, save_at_nearest=True):
//         """
//         Get a key if the network has it.
//
//         Args:
//             keyword = the keyword to save to
//             save_at_nearest = save value at the nearest without value
//
//         Returns:
//             :class:`None` if not found, the value otherwise.
//         """
//         dkey = digest(keyword)
//         node = Node(dkey)
//         nearest = this.protocol.router.findNeighbors(node)
//         if len(nearest) == 0:
//             this.log.warning("there are no known neighbors to get key %s" % dkey.encode('hex'))
//             return defer.succeed(None)
//         spider = ValueSpiderCrawl(this.protocol, node, nearest, this.ksize, this.alpha, save_at_nearest)
//         return spider.find()
//
//     def set(self, keyword, key, value, ttl=604800):
//         """
//         Set the given key/value tuple at the hash of the given keyword.
//         All values stored in the DHT are stored as dictionaries of key/value
//         pairs. If a value already exists for a given keyword, the new key/value
//         pair will be appended to the dictionary.
//
//         Args:
//             keyword: The keyword to use. Should be hashed with hash160 before
//                 passing it in here.
//             key: the 20 byte hash of the data.
//             value: a serialized `protos.objects.Node` object which serves as a
//                 pointer to the node storing the data.
//
//         Return: True if at least one peer responded. False if the store rpc
//             completely failed.
//         """
//         if len(keyword) != 20:
//             return defer.succeed(False)
//
//         this.log.debug("setting '%s' on network" % keyword.encode("hex"))
//
//         def store(nodes):
//             this.log.debug("setting '%s' on %s" % (keyword.encode("hex"), [str(i) for i in nodes]))
//             ds = [this.protocol.callStore(node, keyword, key, value, ttl) for node in nodes]
//
//             keynode = Node(keyword)
//             if this.node.distanceTo(keynode) < max([n.distanceTo(keynode) for n in nodes]):
//                 this.storage[keyword] = (key, value, ttl)
//                 this.log.debug("got a store request from %s, storing value" % str(this.node))
//
//             return defer.DeferredList(ds).addCallback(_anyRespondSuccess)
//
//         node = Node(keyword)
//         nearest = this.protocol.router.findNeighbors(node)
//         if len(nearest) == 0:
//             this.log.warning("there are no known neighbors to set keyword %s" % keyword.encode("hex"))
//             return defer.succeed(False)
//         spider = NodeSpiderCrawl(this.protocol, node, nearest, this.ksize, this.alpha)
//         return spider.find().addCallback(store)
//
//     def delete(self, keyword, key, signature):
//         """
//         Delete the given key/value pair from the keyword dictionary on the network.
//         To delete you must provide a signature covering the key that you wish to
//         delete. It will be verified against the public key stored in the value. We
//         use our ksize as alpha to make sure we reach as many nodes storing our value
//         as possible.
//
//         Args:
//             keyword: the `string` keyword where the data being deleted is stored.
//             key: the 20 byte hash of the data.
//             signature: a signature covering the key.
//
//         """
//         this.log.debug("deleting '%s':'%s' from the network" % (keyword.encode("hex"), key.encode("hex")))
//         dkey = digest(keyword)
//
//         def delete(nodes):
//             this.log.debug("deleting '%s' on %s" % (key.encode("hex"), [str(i) for i in nodes]))
//             ds = [this.protocol.callDelete(node, dkey, key, signature) for node in nodes]
//
//             if this.storage.getSpecific(dkey, key) is not None:
//                 this.storage.delete(dkey, key)
//
//             return defer.DeferredList(ds).addCallback(_anyRespondSuccess)
//
//         node = Node(dkey)
//         nearest = this.protocol.router.findNeighbors(node)
//         if len(nearest) == 0:
//             this.log.warning("there are no known neighbors to delete key %s" % key.encode("hex"))
//             return defer.succeed(False)
//         spider = NodeSpiderCrawl(this.protocol, node, nearest, this.ksize, this.ksize)
//         return spider.find().addCallback(delete)
//
//     def resolve(self, guid):
//         """
//         Given a guid return a `Node` object containing its ip and port or none if it's
//         not found.
//
//         Args:
//             guid: the 20 raw bytes representing the guid.
//         """
//         this.log.debug("crawling dht to find IP for %s" % guid.encode("hex"))
//
//         node_to_find = Node(guid)
//         for connection in this.protocol.multiplexer.values():
//             if connection.handler.node is not None and connection.handler.node.id == node_to_find.id:
//                 this.log.debug("%s successfully resolved as %s" % (guid.encode("hex"), connection.handler.node))
//                 return defer.succeed(connection.handler.node)
//
//         def check_for_node(nodes):
//             for node in nodes:
//                 if node.id == node_to_find.id:
//                     this.log.debug("%s successfully resolved as %s" % (guid.encode("hex"), node))
//                     return node
//             this.log.debug("%s was not found in the dht" % guid.encode("hex"))
//             return None
//
//         index = this.protocol.router.getBucketFor(node_to_find)
//         nodes = this.protocol.router.buckets[index].getNodes()
//         for node in nodes:
//             if node.id == node_to_find.id:
//                 this.log.debug("%s successfully resolved as %s" % (guid.encode("hex"), node))
//                 return defer.succeed(node)
//
//         nearest = this.protocol.router.findNeighbors(node_to_find)
//         if len(nearest) == 0:
//             this.log.warning("there are no known neighbors to find node %s" % node_to_find.id.encode("hex"))
//             return defer.succeed(None)
//
//         spider = NodeSpiderCrawl(this.protocol, node_to_find, nearest, this.ksize, this.alpha, True)
//         return spider.find().addCallback(check_for_node)
//
//     def saveState(self, fname):
//         """
//         Save the state of this node (the alpha/ksize/id/immediate neighbors)
//         to a cache file with the given fname.
//         """
//         data = {'ksize': this.ksize,
//                 'alpha': this.alpha,
//                 'id': this.node.id,
//                 'vendor': this.node.vendor,
//                 'pubkey': this.node.pubkey,
//                 'signing_key': this.protocol.signing_key,
//                 'neighbors': this.bootstrappableNeighbors(),
//                 'testnet': this.protocol.multiplexer.testnet}
//         if len(data['neighbors']) == 0:
//             this.log.warning("no known neighbors, so not writing to cache.")
//             return
//         with open(fname, 'w') as f:
//             pickle.dump(data, f)
//
//     @classmethod
//     def loadState(cls, fname, ip_address, port, multiplexer, db, nat_type, relay_node, callback=None, storage=None):
//         """
//         Load the state of this node (the alpha/ksize/id/immediate neighbors)
//         from a cache file with the given fname.
//         """
//         with open(fname, 'r') as f:
//             data = pickle.load(f)
//         if data['testnet'] != multiplexer.testnet:
//             raise Exception('Cache uses wrong network parameters')
//
//         n = Node(data['id'], ip_address, port, data['pubkey'], relay_node, nat_type, data['vendor'])
//         s = Server(n, db, data['signing_key'], data['ksize'], data['alpha'], storage=storage)
//         s.protocol.connect_multiplexer(multiplexer)
//         if len(data['neighbors']) > 0:
//             d = s.bootstrap(data['neighbors'])
//         else:
//             if multiplexer.testnet:
//                 d = s.bootstrap(s.querySeed(SEEDS_TESTNET))
//             else:
//                 d = s.bootstrap(s.querySeed(SEEDS))
//         if callback is not None:
//             d.addCallback(callback)
//         return s
//
//     def saveStateRegularly(self, fname, frequency=600):
//         """
//         Save the state of node with a given regularity to the given
//         filename.
//
//         Args:
//             fname: File name to save retularly to
//             frequency: Frequency in seconds that the state should be saved.
//                         By default, 10 minutes.
//         """
//         loop = LoopingCall(this.saveState, fname)
//         loop.start(frequency)
//         return loop

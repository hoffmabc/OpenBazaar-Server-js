"use strict"

var Connection = require('../rudp/connection.js');
var ConnectionMultiplexer = require('../rudp/rudp.js');
var CryptoConnectionFactory = require('../rudp/cryptoconnectionfactory.js');


module.exports = class OpenBazaarProtocol extends ConnectionMultiplexer {

    constructor(db, ip, port, natType, testnet, relaying) {
        /**
         Initialize the new protocol with the connection handler factory.
         Args:
         ip: a string of the IP address
         port: a number of the port
         **/
        super();

        this.publicIP = ip;
        this.testnet = testnet || false;
        this.port = port;
        this.blockchain = '';
        this.processors = [];
        this.ws = '';
        this.relayNode = '';
        this.natType = '';
        //this.vendors = this.db.vendors.getVendors();
        //this.banScore = BanScore(this);
        //this.keepAliveLoop = LoopingCall(self.keep_alive)
        //this.keepAliveLoop.start(30, now=False)

        this.factory = new ConnHandlerFactory(this.processors, this);
        this.connectionFactory = new CryptoConnectionFactory(this.factory);
        this.relaying = relaying;
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

    send_message(self, datagram, address) {
        /**
         Sends a datagram over the wire to the given address. It will create a new rudp connection if one
         does not already exist for this peer.
         Args:
         datagram: the raw data to send over the wire
         address: a `tuple` of (ip address, port) of the recipient.
         **/
        if (address != self) {
            con = this.makeNewConnection((self.ip_address[0], self.ip_address[1]), address)
        } else {
            con = self[address]
        }
        con.send_message(datagram)
    }

    start() {
      this.startProtocol(this.port);
    }

}

class ConnHandlerFactory {
    constructor(processors, activeConnections) {
        //super(OpenBazaarProtocol.ConnHandlerFactory, self).__init__()
        this.processors = processors;
        this.activeConnections = activeConnections;
    }

    makeNewHandler(args, kwargs) {
        return OpenBazaarProtocol.ConnHandler(this.processors, this.activeConnections);
    }
}

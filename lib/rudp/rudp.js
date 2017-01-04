/**Reliable UDP implementation using Node.js.**/

// import collections
//
// from google.protobuf import message
// from twisted.internet import protocol
//
// from txrudp import packet
const Set = require('sorted-set');
const dgram = require('dgram');
const Packet = require('./packet.js');

module.exports = class ConnectionMultiplexer {

    /**
     Multiplexes many virtual connections over single UDP socket.

     Handles graceful shutdown of active connections.
     **/

    constructor(connectionFactory,
                publicIp,
                relaying) {
        /**
         Initialize a new multiplexer.

         Args:
         connectionFactory: The connection factory used to
         instantiate new connections, as a
         connection.ConnectionFactory.
         publicIp: The external IPv4/IPv6 this node publishes as its
         reception address.
         relaying: If True, the multiplexer will silently forward
         packets that are not targeting this node (i.e. messages
         that have a destination IP different than `public_ip`.)
         If False, this node will drop such messages.
         logger: A logging.Logger instance to dump invalid received
         packets into; if None, dumping is disabled.
         **/
        //super(ConnectionMultiplexer, self).__init__()
        this.relaying = relaying || false;
        this.connectionFactory = connectionFactory
        this.publicIp = publicIp
        this.port;
        this._activeConnections = [];
        this._bannedIPs = []
        this.transport;
        this.udpServer = dgram.createSocket('udp4');
    }

    startProtocol(port) {
        /**Start the protocol and cache listening port.**/
            // super(ConnectionMultiplexer, self).startProtocol()
        let that = this;

        this.udpServer.on('listening', function () {
            var address = this.address();
            console.log('UDP Server listening on ' + address.address + ":" + address.port);
        });

        this.udpServer.on('message', function (message, remote) {
            console.log('Received mesage from:', remote.address + ':' + remote.port, ', message:', message);
            that.datagramReceived(message, remote);
        });

        this.udpServer.on('error', function (err) {
            console.log(err);
        });

        this.udpServer.bind(port);
    }

    liveConnectionCount() {
        /**Return the number of live connections.**/
        return this._activeConnections.length;
    }

    getConnectionByAddress(addr) {
        /**
         Return the handling connection of the given address.

         Args:
         addr: Tuple of destination address [ip, port].

         Raises:
         KeyError: No connection is handling the given address.
         **/
        return this._activeConnections[addr];
    }

    setConnectionByAddress(addr, con) {
        /**
         Register a handling connection for a given remote address.

         If a previous connection is already bound to that address,
         it is shutdown and then replaced.

         Args:
         key: Tuple of destination address (ip, port).
         value: The connection to register, as a Connection.
         **/
        prevCon = this._activeConnections.getConnectionByAddress(addr);
        if (prevCon !== undefined) {
            prevCon.shutdown();
        }
        this._activeConnections[addr] = con;
    }

    removeConnectionByAddress(addr) {
        /**
         Unregister a handling connection for a given remote address.

         Args:
         addr: Tuple of destination address (ip, port).

         Raises:
         KeyError: No connection is handling the given address.
         **/
        delete this._activeConnections[addr];
    }

    getAllConnections() {
        /**Return iterator over the active contacts.**/
        return this._activeConnections;
    }

    // def ban_ip(self, ip_address):
    //     """
    //     Add an IP address to the ban list. No connections will be
    //     made to this IP and packets will be dropped.
    //
    //     Args:
    //         ip_address: a `String` IP address (without port).
    //     """
    //     this._banned_ips.add(ip_address)
    //
    // def remove_ip_ban(self, ip_address):
    //     """
    //     Remove an IP address from the ban list.
    //
    //     Args:
    //         ip_address: a `String` IP address (without port).
    //     """
    //     this._banned_ips.discard(ip_address)

    datagramReceived(datagram, addr) {
        /**
         Called when a datagram is received.

         If the datagram isn't meant for us, immediately relay it.
         Otherwise, delegate handling to the appropriate connection.
         If no such connection exists, create one. Always take care
         to avoid mistaking a relay address for the original sender's
         address.

         Args:
         datagram: Datagram string received from transport layer.
         addr: Sender address, as a tuple of an IPv4/IPv6 address
         and a port, in that order. If this address is
         different from the packet's source address, the packet
         is being relayed; future outbound packets should also
         be relayed through the specified relay address.
         **/
        let rudpPacket = new Packet();
        try {
            rudpPacket.fromBytes(datagram);
            console.log('[RUDP] Received datagram:', rudpPacket);
            if(rudpPacket.syn) {
                console.log('Public Key: ', rudpPacket.payload.toString('hex'));
            }
            if(!rudpPacket.syn && !rudpPacket.fin) {
                console.log('Special message');
            }
        } catch (err) {
            console.log('Bad Packet:', err.message);
            return;
        }

        if (this._bannedIPs.includes(addr.address) || this._bannedIPs.includes(rudpPacket.sourceAddr[0])) {
            return;
        }
        if (rudpPacket.destAddr[0] != this.publicIp) {
            if (this.relaying) {
                this.transport.write(datagram, rudpPacket.destAddr);
            }
        } else {
            let con = this._activeConnections[rudpPacket.sourceAddr];
            if (con === undefined && rudpPacket.syn) {
                con = this.makeNewConnection(
                    [this.publicIP, this.port],
                    rudpPacket.sourceAddr,
                    [addr.address, addr.port]
                )
            }
            if (con !== undefined) {
                con.receivePacket(rudpPacket, addr);
            }
        }
        // catch(message.DecodeError, TypeError, ValueError) {
        //     if this._logger is not None:
        //         this._logger.info(
        //             'Bad packet (bad protobuf format): {0}'.format(datagram)
        //         )
        // }
        // catch(packet.ValidationError) {
        //     if this._logger is not None:
        //         this._logger.info(
        //             'Bad packet (invalid RUDP packet): {0}'.format(datagram)
        //         )
        // }


    }

    makeNewConnection(ownAddr, remoteAddr, relayAddr) {
        /**
         Create a new connection to handle the given address.

         Args:
         ownAddr: Local host address, as a (ip, port) tuple.
         remoteAddr: Remote host address, as a (ip, port) tuple.
         relayAddr: Relay host address, as a (ip, port) tuple.

         Returns:
         A new connection.Connection
         **/
        let con = this.connectionFactory.makeNewConnection(
            this,
            ownAddr,
            remoteAddr,
            relayAddr
        );
        this._activeConnections[remoteAddr] = con;
        return con;
    }

    sendDatagram(datagram, addr) {
        /**
         Send RUDP datagram to the given address.

         Args:
         datagram: Prepared RUDP datagram, as a string.
         addr: Tuple of destination address (ip, port).

         This is essentially a wrapper so that the transport layer is
         not exposed to the connections.
         **/
        //this.transport.write(datagram, addr)

        // this.udpServer.send(datagram, 0, datagram.length, 23432, '127.0.0.1', function(err, bytes) {
        //     if (err) throw err;
        //     console.log('UDP message sent to 173.79.163.18:23432', bytes);
        // });
        this.udpServer.send(datagram, 0, datagram.length, addr[1], addr[0], function(err, bytes) {
            if (err) throw err;
            console.log('UDP message sent to ' + addr[0] +':'+ addr[1]);
        })
    }

    shutdown() {
        /**Shutdown all active connections and then terminate protocol.**/
        for (connection in this._activeConnections.values()) {
            connection.shutdown();
        }

        // if hasattr(this.transport, 'loseConnection') {
        //   this.transport.loseConnection();
        // }
    }
}

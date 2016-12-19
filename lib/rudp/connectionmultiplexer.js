"use strict"

const dgram = require('dgram');
const server = dgram.createSocket('udp4');
var Packet = require('./packet.js');

/**
Multiplexes many virtual connections over single UDP socket.

Handles graceful shutdown of active connections.
**/
function ConnectionMultiplexer(
  connectionFactory,
  publicIP,
  relaying,
  logger
) {
  /**
  Initialize a new multiplexer.

  Args:
      connection_factory: The connection factory used to
          instantiate new connections, as a
          connection.ConnectionFactory.
      public_ip: The external IPv4/IPv6 this node publishes as its
          reception address.
      relaying: If True, the multiplexer will silently forward
          packets that are not targeting this node (i.e. messages
          that have a destination IP different than `public_ip`.)
          If False, this node will drop such messages.
      logger: A logging.Logger instance to dump invalid received
          packets into; if None, dumping is disabled.
  **/
  //super(ConnectionMultiplexer, self).__init__()
  this.connectionFactory = connectionFactory;
  this.publicIP = publicIP;
  this.port = 0;
  this.relaying = relaying || false;
  this._activeConnections = {};
  this._bannedIPs = [];
  this._logger = logger;

}

ConnectionMultiplexer.prototype.startProtocol = function() {
  // Start the protocol and cache listening port.
  //super(ConnectionMultiplexer, this).startProtocol();
  server.bind();

  server.on('listening', () => {
    this.port = server.address().port;
    console.log(`Listening UDP4 on port: ${this.port}`);
    //server.close();
  });

  server.on('message', (datagram, addressInfo) => {

    let rudpPacket = new Packet();
    rudpPacket.sourceAddr = ['127.0.0.1', 1233];
    rudpPacket.syn = true;
    let b = rudpPacket.toBytes();

    //let rudpPacket = p.fromBytes(datagram);

    // check for decode Error
    // check for validation error

    // if no errors
    //if (addressInfo.address in self._banned_ips or rudp_packet.source_addr[0] in self._banned_ips) {
    if(1==0) {
      return;
    } else if(rudpPacket.getDestIp != this.publicIP) {
      if(this.relaying) {
        // this.transport.write(datagram, rudp_packet.dest_addr);
        // send this as a relayed message
      }
    } else {
      let con = this._activeConnections[`${rudpPacket.sourceAddr[0]}:${rudpPacket.sourceAddr[1]}`];
      if(con === undefined && rudpPacket.syn) {
        con = this.makeNewConnection(
          (this.publicIP, this.port),
          rudpPacket.sourceAddr,
          [addressInfo.address, addressInfo.port]
        );
      }

      if(con !== undefined) {
        con.receivePacket(rudpPacket, addr);
      }
    }
  });

}

ConnectionMultiplexer.prototype.makeNewConnection = function(protoHandle, ownAddr, sourceAddr, relayAddr) {
  /**
  Create a new Connection.
  In addition, create a handler and attach the connection to it.
  **/
  let handler = this.handlerFactory.makeNewHandler(
      ownAddr,
      sourceAddr,
      relayAddr
  );
  let connection = Connection(
      protoHandle,
      handler,
      ownAddr,
      sourceAddr,
      relayAddr
  );
  handler.connection = connection;
  return connection;
}

module.exports = ConnectionMultiplexer;
    //
    // def __len__(self):
    //     """Return the number of live connections."""
    //     return len(self._active_connections)
    //
    // def __getitem__(self, addr):
    //     """
    //     Return the handling connection of the given address.
    //
    //     Args:
    //         addr: Tuple of destination address (ip, port).
    //
    //     Raises:
    //         KeyError: No connection is handling the given address.
    //     """
    //     return self._active_connections[addr]
    //
    // def __setitem__(self, addr, con):
    //     """
    //     Register a handling connection for a given remote address.
    //
    //     If a previous connection is already bound to that address,
    //     it is shutdown and then replaced.
    //
    //     Args:
    //         key: Tuple of destination address (ip, port).
    //         value: The connection to register, as a Connection.
    //     """
    //     prev_con = self._active_connections.get(addr)
    //     if prev_con is not None:
    //         prev_con.shutdown()
    //     self._active_connections[addr] = con
    //
    // def __delitem__(self, addr):
    //     """
    //     Unregister a handling connection for a given remote address.
    //
    //     Args:
    //         addr: Tuple of destination address (ip, port).
    //
    //     Raises:
    //         KeyError: No connection is handling the given address.
    //     """
    //     del self._active_connections[addr]
    //
    // def __iter__(self):
    //     """Return iterator over the active contacts."""
    //     return iter(self._active_connections)
    //
    // def ban_ip(self, ip_address):
    //     """
    //     Add an IP address to the ban list. No connections will be
    //     made to this IP and packets will be dropped.
    //
    //     Args:
    //         ip_address: a `String` IP address (without port).
    //     """
    //     self._banned_ips.add(ip_address)
    //
    // def remove_ip_ban(self, ip_address):
    //     """
    //     Remove an IP address from the ban list.
    //
    //     Args:
    //         ip_address: a `String` IP address (without port).
    //     """
    //     self._banned_ips.discard(ip_address)
    //
    // def datagramReceived(self, datagram, addr):
    //     """
    //     Called when a datagram is received.
    //
    //     If the datagram isn't meant for us, immediately relay it.
    //     Otherwise, delegate handling to the appropriate connection.
    //     If no such connection exists, create one. Always take care
    //     to avoid mistaking a relay address for the original sender's
    //     address.
    //
    //     Args:
    //         datagram: Datagram string received from transport layer.
    //         addr: Sender address, as a tuple of an IPv4/IPv6 address
    //             and a port, in that order. If this address is
    //             different from the packet's source address, the packet
    //             is being relayed; future outbound packets should also
    //             be relayed through the specified relay address.
    //     """
    //     try:
    //         rudp_packet = packet.Packet.from_bytes(datagram)
    //     except (message.DecodeError, TypeError, ValueError):
    //         if self._logger is not None:
    //             self._logger.info(
    //                 'Bad packet (bad protobuf format): {0}'.format(datagram)
    //             )
    //     except packet.ValidationError:
    //         if self._logger is not None:
    //             self._logger.info(
    //                 'Bad packet (invalid RUDP packet): {0}'.format(datagram)
    //             )
    //     else:
    //         if (addr[0] in self._banned_ips or
    //            rudp_packet.source_addr[0] in self._banned_ips):
    //             return
    //         if rudp_packet.dest_addr[0] != self.public_ip:
    //             if self.relaying:
    //                 self.transport.write(datagram, rudp_packet.dest_addr)
    //         else:
    //             con = self._active_connections.get(rudp_packet.source_addr)
    //             if con is None and rudp_packet.get_syn():
    //                 con = self.make_new_connection(
    //                     (self.public_ip, self.port),
    //                     rudp_packet.source_addr,
    //                     addr
    //                 )
    //             if con is not None:
    //                 con.receive_packet(rudp_packet, addr)
    //
    // def make_new_connection(self, own_addr, source_addr, relay_addr=None):
    //     """
    //     Create a new connection to handle the given address.
    //
    //     Args:
    //         own_addr: Local host address, as a (ip, port) tuple.
    //         source_addr: Remote host address, as a (ip, port) tuple.
    //         relay_addr: Remote host address, as a (ip, port) tuple.
    //
    //     Returns:
    //         A new connection.Connection
    //     """
    //     con = self.connection_factory.make_new_connection(
    //         self,
    //         own_addr,
    //         source_addr,
    //         relay_addr
    //     )
    //     self._active_connections[source_addr] = con
    //     return con
    //
    // def send_datagram(self, datagram, addr):
    //     """
    //     Send RUDP datagram to the given address.
    //
    //     Args:
    //         datagram: Prepared RUDP datagram, as a string.
    //         addr: Tuple of destination address (ip, port).
    //
    //     This is essentially a wrapper so that the transport layer is
    //     not exposed to the connections.
    //     """
    //     self.transport.write(datagram, addr)
    //
    // def shutdown(self):
    //     """Shutdown all active connections and then terminate protocol."""
    //     for connection in self._active_connections.values():
    //         connection.shutdown()
    //
    //     if hasattr(self.transport, 'loseConnection'):
    //         self.transport.loseConnection()

"use strict"

const connection = require('./connection.js');

function ConnectionFactory(handlerFactory) {
  /**
  A factory for Connections.
  Subclass according to need.
  **/
  this.handlerFactory = handlerFactory;
}

ConnectionFactory.prototype.makeNewConnection = function(
  protoHandle,
  ownAddr,
  sourceAddr,
  relayAddr) {
    /**
    Create a new Connection.
    In addition, create a handler and attach the connection to it.
    **/
    let handler = this.handlerFactory.makeNewHandler(
        ownAddr,
        sourceAddr,
        relayAddr
    );
    let c = new Connection(
        protoHandle,
        handler,
        ownAddr,
        sourceAddr,
        relayAddr
    );
    handler.connection = c;
    return c;
};

module.exports = ConnectionFactory;

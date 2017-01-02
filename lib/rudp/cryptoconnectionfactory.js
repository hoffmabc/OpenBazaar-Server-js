"use strict"

const CryptoConnection = require('./cryptoconnection.js');
const ConnectionFactory = require('./connectionfactory');

class CryptoConnectionFactory extends ConnectionFactory {

  constructor(handlerFactory) {
    /**
    A factory for Connections.
    Subclass according to need.
    **/
    super();
    this.handlerFactory = handlerFactory;
  }

  makeNewConnection(
    protocol,
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
      let c = new CryptoConnection(
          protocol,
          handler,
          ownAddr,
          sourceAddr,
          relayAddr
      );
      handler.connection = c;
      return c;
    };
  }

module.exports = CryptoConnectionFactory;

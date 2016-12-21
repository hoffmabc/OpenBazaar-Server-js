// const Packet = require('./packet.js');
//
// let p = new Packet(23, ['127.0.0.1', 33], ['127.0.0.1', 33]);
// console.log(p);
const ConnectionFactory = require('./connectionfactory.js');
const ConnectionMultiplexer = require('./connectionmultiplexer.js');
const CryptoConnection = require('./cryptoconnection.js');
const Packet = require('./packet.js');


var synPacket = new Packet(
    3,
    '127.0.0.1',
    '127.0.0.1',
    '', 0,
    234243, // ack
    false,  // fin
    true  // syn
);

//let c = new Connection('', '', ['127.0.0.1', 123], ['127.0.0.1', 124], ['127.0.0.1', 125]);

let cc = new CryptoConnection();
let fp = cc._finalizePacket(synPacket);
console.log(fp);

cc._makeNonceFromNum('test');

let cf = new ConnectionFactory();
let protoHandle ='';
let ownAddr = ['127.0.0.1', 123];
let sourceAddr = ['127.0.0.1', 123];
let relayAddr = ['127.0.0.1', 123];



cf.makeNewConnection(protoHandle,
ownAddr,
sourceAddr,
relayAddr);

let cm = new ConnectionMultiplexer();

cm.startProtocol();

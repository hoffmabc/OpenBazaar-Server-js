const SERVER_VERSION = '0.1.0';

const Logger = require('js-logger');
const stun = require('vs-stun');
const path = require('path');
const fs = require('fs');
const c2p = require('callback2promise');
const protobuf = require('protobufjs');
const protos = require('../protos/protos.js');
const OpenBazaarProtocol = require('./net/obprotocol.js');
const Datastore = require('./db/datastore.js');
const ForgetfulStorage = require('./dht/storage.js');
const Server = require('./dht/network.js');
const BTCPrice = require('./market/btcprice.js');
const KeyChain = require('./keys/keychain.js');
const natUPNP = require('nat-upnp');
const Config = require('./config.js');
const url = require('url');
const Node = require('./dht/node.js');
const minimist = require('minimist');
const dnsSync = require('dns-sync');
//const protos = protobuf.Root.fromJSON('./protos/openbazaar.json');


// Set up Logger
Logger.useDefaults();

let args = minimist(process.argv.slice(2));
let command = args._[0];

Logger.info(`OpenBazaar: ${command}`);

switch (command) {
    case "start":

        const TESTNET = (args.testnet || args.t) ? true : false;
        const LOGLEVEL = (args.loglevel || args.l) ? (args.loglevel || args.t) : 'warn';
        const RESTAPIPORT = (args.restapiport || args.r) ? (args.restapiport || args.r) : 18469;
        const PORT = (args.port || args.p) ? (args.port || args.p) : (!args.testnet) ? 18467 : 28467;
        const NATTYPE = protos.nested.NATType.values;
        const ALLOWIP = (args.allowip || args.a) ? (args.allowip || args.a) : ['127.0.0.1'];
        const SSL = false; // TODO: wire up to config
        const SEED_NODE = ("162.213.253.147", 18467);

        let CONFIG = new Config();
        let storage = new ForgetfulStorage();

        print_splash_screen();

        Logger.info(`Check for default folders...`);
        makeDefaultFolders(CONFIG.DATA_FOLDER);

        let serverPort = getPort();
        Logger.info(`Starting OpenBazaar-Server on Port ${serverPort}`);

        // Check for database and create if new server
        let db = new Datastore(TESTNET);

        db._initializeDatabase(() => {

            // Heartbeat server
            let heartbeatServer = '';
            // let heartbeatServer = new HeartbeatFactory(ALLOWIP);
            // if(SSL) {
            //   reactor.listenSSL(HEARTBEATPORT, WebSocketFactory(heartbeat_server), ChainedOpenSSLContextFactory(SSL_KEY, SSL_CERT), interface=interface)
            // } else {
            //   //reactor.listenTCP(HEARTBEATPORT, WebSocketFactory(heartbeat_server), interface=interface)
            // }

            // BTC Price Checker
            let btcPrice = new BTCPrice();

            new KeyChain(db, startServer, heartbeatServer);
            // reactor.run()

            // btcPrice.closethread()
            // btcPrice.join(1)

        });

        // Check for daemon mode
        if (args.daemon || args.d) {
            Logger.info('Starting daemon');
        } else {
            //startServer(serverPort);
        }

    function startServer(keys, firstStartup) {

        // Set up logging

        let timeout = 5000;
        var firstTime = firstStartup || false;

        var client = natUPNP.createClient();
        
        console.log('Mapping UPnP port...');
        natUPNP.searchGateway(timeout, function(err, gateway) {
          if (err) throw err;

          sys.puts("Found Gateway!");
          sys.print("Fetching External IP ... ");

          client.externalIp((err, ip) => {
            if (err) {
                Logger.warn('Could not obtain public IP address');
                return callback(err);
            }

            client.portMapping({
                public: PORT,
                private: PORT,
                ttl: 0
            }, function (err) {
                if (!err) {
                  Logger.info('Successfully traversed NAT');
                  Logger.info(`Listening on ${ip}:${PORT}`);

                  Logger.info("Finding NAT Type...")
                  let socket, server = {host: 'stun.l.google.com', port: 19302};

                  checkNat(socket, server, (natType, ip, port) => {
                    Logger.info(`STUN Info: ${natType} ${ip} ${port}`);

                    // Set up Protocol
                    let obProtocol = new OpenBazaarProtocol(this.db, ip, port, TESTNET, (natType == NATTYPE['FULL_CONE']), false);

                    // Kademlia DHT
                    const SEED_URLS = (TESTNET) ? CONFIG.SEEDS_TESTNET : CONFIG.SEEDS;

                    let relayNode;

                    if (natType != NATTYPE['FULL_CONE']) {
                        let hostname, relayHostIP;
                        console.log('Looking for viable relay server...');
                        for (seed in SEED_URLS) {
                            console.log('Trying: ', SEED_URLS[seed]);
                            hostname = url.parse(SEED_URLS[seed][0]).hostname;
                            relayHostIP = dnsSync.resolve(hostname);
                            if (relayHostIP != null) {
                                console.log('Success.');
                                relayNode = [relayHostIP, (TESTNET) ? 28469 : 18469];
                                break;
                            }
                        }
                    }

                    let node = new Node.DHTNode(keys.guid, ip, port, keys.verifyKey, relayNode, natType, '');//Profile(db).get().vendor
                    obProtocol.relayNode = node.relayNode;
                    let kserver = new Server(node, db, keys.signingKey, Config.KSIZE, Config.ALPHA, storage);
                    kserver.protocol.connectMultiplexer(obProtocol);
                    let bs = kserver.bootstrap(kserver.querySeed(SEED_URLS))
                        .then((addrs) => {
                            console.log(addrs);
                        })
                        .catch(msg => {
                            console.log('Failed', msg);
                        });
                    //kserver.saveStateRegularly(Config.DATA_FOLDER, 'cache.pickle', 10);
                    obProtocol.registerProcessor(kserver.protocol);

                    obProtocol.start();

                    let iface = (ALLOWIP != ['127.0.0.1']) ? '0.0.0.0' : '127.0.0.1';

                  });
                }
            });
          });
        });
    }

    function checkNat(socket, server, callback) {
        stun.connect(server, (e, v) => {
            if (!e) {
                socket = v;
                socket.close();

                let natType = get_nat_type(v.stun.type); // Get NAT code
                let ipAddress = v.stun.public.host;
                let port = v.stun.public.port;

                callback(natType, ipAddress, port);

            }
            else console.log('Something went wrong: ' + e);
        });
    }

    function get_nat_type(stunType) {
        var nat_type = NATTYPE['SYMMETRIC'];
        switch (stunType) {
            case 'Full Cone NAT':
                nat_type = NATTYPE['FULL_CONE'];
            case 'Restricted Cone NAT':
                nat_type = NATTYPE['RESTRICTED'];
        }
        console.log(`NAT Status: ${stunType} (${nat_type})`);
        return nat_type;
    }

    function getPort() {
        var port = (args.port || args.p);
        if (port === undefined) {
            port = (!args.testnet) ? 18467 : 28467;
        }
        return port;
    }

}

function makeDefaultFolders(dataFolder) {
    console.log('Making default folders...');
    if (!fs.existsSync(dataFolder)) {
        console.log('Default folders do not exist yet...');
        fs.mkdirSync(dataFolder, (err, folder) => {
            if (err) throw err;
            // Prints: /tmp/foo-itXde2
        });
        fs.mkdirSync(dataFolder + "/cache/");
        fs.mkdirSync(dataFolder + "/store/");
        fs.mkdirSync(dataFolder + "/store/listings");
        fs.mkdirSync(dataFolder + "/store/listings/contracts/");
        fs.mkdirSync(dataFolder + "/store/listings/in progress/");
        fs.mkdirSync(dataFolder + "/store/listings/trade receipts/");
        fs.mkdirSync(dataFolder + "/store/media/");
    }
}

function print_splash_screen() {
    const OKBLUE = '\033[94m';
    const ENDC = '\033[0m';
    Logger.info("________             ", OKBLUE, "         __________", ENDC);
    Logger.info("\\_____  \\ ______   ____   ____" + OKBLUE +
        "\\______   \\_____  _____________  _____ _______" + ENDC)
    Logger.info(" /   |   \\\\____ \\_/ __ \\ /    " + OKBLUE +
        "\\|    |  _/\\__   ___   /\\__    \\ \\__ \\\\\_  __ \ " + ENDC)
    Logger.info("/    |    \  |_> >  ___/|   |  \    " + OKBLUE
        + "|   \ / __ \_/    /  / __ \_/ __ \|  | \/" + ENDC)
    Logger.info("\_______  /   __/ \___  >___|  /" + OKBLUE + "______  /(____  /_____ \(____  (____  /__|" + ENDC)
    Logger.info("        \/|__|        \/     \/  " + OKBLUE + "     \/      \/      \/     \/     \/" + ENDC)
    Logger.info("OpenBazaar Server " + SERVER_VERSION + " starting...")
}

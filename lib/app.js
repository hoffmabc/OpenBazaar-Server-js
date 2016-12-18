
const SERVER_VERSION='0.1.0';

const Logger = require('js-logger');
const stun = require('vs-stun');
const c2p = require('callback2promise');
const protobuf = require('protobufjs');
const protos = require('../protos/protos.js');

let args = require('minimist')(process.argv.slice(2));
let command = args._[0];
const TESTNET = (args.testnet || args.t) ? true : false;
const LOGLEVEL = (args.loglevel || args.l) ? (args.loglevel || args.t) : 'warn';
const RESTAPIPORT = (args.restapiport || args.r) ? (args.restapiport || args.r) : 18469;

const NATTYPE = protos.nested.NATType.values;

// Set up Logger
Logger.useDefaults();
Logger.info(args);
Logger.info(`OpenBazaar: ${command}`);

Logger.info();

switch(command) {
  case "start":
    print_splash_screen();

    let server_port = get_port();

    // Check for daemon mode
    if(args.daemon || args.d) {
      Logger.info('Starting daemon');

    } else {
      Logger.info('Starting Server');
      start_server(server_port);
    }

}

function start_server(server_port) {
  let socket, server = { host: 'stun.l.google.com', port: 19302 };



  check_nat(socket, server);


}

function check_nat(socket, server) {
  stun.connect(server, (e, v) => {
    if(!e) {
      socket = v;
      socket.close();

      let nat_type = get_nat_type(v.stun.type); // Get NAT code

      

    }
    else console.log('Something went wrong: ' + e);
  });
}

function get_nat_type(stunType) {
  var nat_type = NATTYPE['SYMMETRIC'];
  switch(stunType) {
      case 'Full Cone NAT':
        nat_type = NATTYPE['FULL_CONE'];
      case 'Restricted Cone NAT':
        nat_type = NATTYPE['RESTRICTED'];
  }
  console.log(`NAT Status: ${stunType} (${nat_type})`);
  return nat_type;
}

function get_port() {
  var port = (args.port || args.p);
  if(port === undefined) {
    port = (!args.testnet) ? 18467 : 28467;
  }
  Logger.info(port);
  return port;
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

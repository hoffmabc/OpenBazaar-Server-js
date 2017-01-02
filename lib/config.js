"use strict"

/**
Parses configuration file and sets project wide constants.
This file has intrinsic naming difficulties because it is trying to be platform
agnostic but naming variables is inherently platform specific (i.e directory vs
folder)
**/

const path = require('path');
const process = require('process');

// import os
// from random import shuffle
// from platform import platform
// from os.path import expanduser, join, isfile
// from ConfigParser import ConfigParser
// from urlparse import urlparse
const validUrl = require('valid-url');
const ini = require('node-ini');

const PROTOCOL_VERSION = 2;
const CONFIG_FILE = process.cwd() + `${path.sep}ob.cfg`;

// FIXME probably a better way to do this. This curretly checks two levels deep.
// for i in range(2):
//     if not isfile(CONFIG_FILE):
//         paths = CONFIG_FILE.rsplit('/', 2)
//         CONFIG_FILE = join(paths[0], paths[2])

let DEFAULTS = {
    // Default project config file may now remove these items
    'data_folder': '',
    'ksize': '20',
    'alpha': '3',
    'transaction_fee': '10000',
    'libbitcoin_servers': 'tcp://libbitcoin1.openbazaar.org:9091',
    'libbitcoin_servers_testnet': 'tcp://libbitcoin2.openbazaar.org:9091, <Z&{.=LJSPySefIKgCu99w.L%b^6VvuVp0+pbnOM',
    'resolver': 'http://resolver.onename.com/',
    'ssl_cert': '',
    'ssl_key': '',
    'ssl': false,
    'username': '',
    'password': '',
    'mainnet_seeds': 'seed2.openbazaar.org:8080,8b17082a57d648894a5181cb6e1b8a6f5b3b7e1c347c0671abfcd7deb6f105fe',
    'testnet_seeds': 'seed.openbazaar.org:8080,5b44be5c18ced1bc9400fe5e79c8ab90204f06bebacc04dd9c70a95eaca6e117',
}

module.exports = class Config {

  constructor() {
    var cfg = ini.parseSync(CONFIG_FILE);

    this.DATA_FOLDER = this._platformAgnosticDataPath(cfg.CONSTANTS.DATA_FOLDER);
    this.KSIZE = cfg.CONSTANTS.KSIZE;
    this.ALPHA = cfg.CONSTANTS.ALPHA;
    this.TRANSACTION_FEE = cfg.CONSTANTS.TRANSACTION_FEE;
    this.RESOLVER = cfg.CONSTANTS.RESOLVER;
    this.SSL = this.str_to_bool(cfg.AUTHENTICATION.SSL || 'false');
    this.SSLCERT = cfg.SSL_CERT;
    this.SSLKEY = cfg.SSL_KEY;
    this.USERNAME = cfg.USERNAME;
    this.PASSWORD = cfg.PASSWORD;
    this.LIBBITCOIN_SERVERS = [];
    this.LIBBITCOIN_SERVERS_TESTNET = [];
    this.SEEDS = [];
    this.SEEDS_TESTNET = [];
    this.PROTOCOL_VERSION = PROTOCOL_VERSION;

    for(var mseed in cfg.MAINNET_SEEDS) {
      if(this._isWellFormedSeedString(cfg.MAINNET_SEEDS[mseed])) {
        this.SEEDS.push(cfg.MAINNET_SEEDS[mseed].split(','));
      }
    }

    for(var mseed in cfg.TESTNET_SEEDS) {
      if(this._isWellFormedSeedString(cfg.TESTNET_SEEDS[mseed])) {
        this.SEEDS_TESTNET.push(cfg.TESTNET_SEEDS[mseed].split(','));
      }
    }

    for(var mseed in cfg.LIBBITCOIN_SERVERS) {
      this.LIBBITCOIN_SERVERS.push(cfg.LIBBITCOIN_SERVERS[mseed].split(','));
    }
    this.LIBBITCOIN_SERVERS.sort(function(a, b){return 0.5 - Math.random()});

    for(var mseed in cfg.LIBBITCOIN_SERVERS_TESTNET) {
      this.LIBBITCOIN_SERVERS_TESTNET.push(cfg.LIBBITCOIN_SERVERS_TESTNET[mseed].split(','));
    }
    this.LIBBITCOIN_SERVERS_TESTNET.sort(function(a, b){return 0.5 - Math.random()});

    //
    // def set_value(section, name, value):
    //     config = ConfigParser()
    //     if isfile(CONFIG_FILE):
    //         config.read(CONFIG_FILE)
    //     config.set(section, name, value)
    //     with open(CONFIG_FILE, 'wb') as configfile:
    //         config.write(configfile)
    //
    //
    // def get_value(section, name):
    //     config = ConfigParser()
    //     if isfile(CONFIG_FILE):
    //         config.read(CONFIG_FILE)
    //         try:
    //             return config.get(section, name)
    //         except Exception:
    //             return None
    //
    //
    // def delete_value(section, name):
    //     config = ConfigParser()
    //     if isfile(CONFIG_FILE):
    //         config.read(CONFIG_FILE)
    //         config.remove_option(section, name)
    //         with open(CONFIG_FILE, 'wb') as configfile:
    //             config.write(configfile)
  }

  str_to_bool(s) {
    return (s.toLowerCase() === 'true' || s.toLowerCase() === 'false') ? true : false;
  }

  _platformAgnosticDataPath(dataFolder) {
      /**
      Create absolute path name, exported as DATA_FOLDER.
      User may configure using relative path, absolute path or use default.
        Relative path puts named folder in users home directory.
        Absolute path uses (obviously) the named absolute path.
        Default is currently to use 'OpenBazaar' in home directory.
      See issue #163
      **/
      var dataPath;
      if(dataFolder) {
        if(path.resolve(dataFolder) === dataFolder) {
          return dataFolder;
        }
      }
      var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
      if(process.platform == 'darwin') {
        dataPath = process.env['HOME'] + path.sep + 'Library' + path.sep + 'Application Support' + path.sep + 'OpenBazaar-js';
      } else if(process.platform == 'linux') {
        dataPath = process.env['HOME'] + path.sep + '.openbazaar-js';
      } else {
        dataPath = process.env['APPDATA'] + path.sep + 'OpenBazaar-js';
      }      
      return dataPath;
  }

  _isWellFormedSeedString(seedString) {
    /**
    Parse string url:port,key
    **/
    if(seedString.indexOf(',') > -1) {
      var seedArray = seedString.split(',');
      if(validUrl.isUri(seedArray[0])) {
        return true;
      } else {
        return false;
      }
    }
  }

}

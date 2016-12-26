"use strict"

const punch = require('holepunch');


module.exports = class UPNP {

  constructor() {
    this.OPEN_BAZAAR_DESCRIPTION = 'OpenBazaar Server JS';
    this.upnp_device_available = false;

    //this.upnp = miniupnpc.UPnP()

    //self.debug('inital(default) values :')
    //self.debug_upnp_values()
    //this.upnp.discoverdelay = 200
    //self.debug('Discovering... delay=%ums' % self.upnp.discoverdelay)
    //self.debug(self.upnp.discover(), 'device(s) detected')

    //this.upnp.selectigd()
    //this.upnp_device_available = True
    //
    // # display information about the IGD and the internet connection
    // self.debug_addresses()
    // self.debug("Status Info:", self.get_status_info())
    // self.debug("Connection Type:", self.get_connection_type())
    // self.debug_upnp_values()
  }

  addPortMapping(externalPort, internalPort, protocol='TCP', ipToBind) {
    /**
    Valid protocol values are: 'TCP', 'UDP'
    Usually you'll pass external_port and internal_port as the same number.
    **/
    let result = false

    if(ipToBind === undefined) {
      console.log('test');
    }

    // NAT traversal
    var client = natUpnp.createClient();

    client.portMapping({
      public: externalPort,
      private: internalPort,
      protocol: protocol,
      description: this.OPEN_BAZAAR_DESCRIPTION
    }, function(err) {
      // Will be called once finished
      console.log(err['s:Body']);
      console.log('Tried to map port: ' + externalPort, internalPort);
    });

    client.getMappings({description: this.OPEN_BAZAAR_DESCRIPTION}, function(err, results) {
      //console.log(results);
    });


  }

}

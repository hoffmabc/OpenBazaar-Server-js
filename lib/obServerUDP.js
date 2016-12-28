"use strict"

const dgram = require('dgram');

module.exports = class obServerUDP {
    constructor(port, protocol) {
        this.udpServer = dgram.createSocket('udp4');
        let that = this;

        this.udpServer.on('listening', function () {
            var address = that.udpServer.address();
            console.log('UDP Server listening on ' + address.address + ":" + address.port);
        });

        this.udpServer.on('message', function (message, remote) {
            console.log(remote.address + ':' + remote.port + ' - ' + message);

        });

        this.udpServer.on('error', function (err) {
            console.log(err);
        });

        this.udpServer.bind(port);

    }

    
};

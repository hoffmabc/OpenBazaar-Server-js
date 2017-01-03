const WebSocketServer = require('websocket').server;
const http = require('http');
const https = require('https');
const fs = require('fs');
const Utils = require('./utils');


class HeartbeatServer {

    constructor(port, allowIP, iface, sslKey, sslCert) {

        let server;
        this.status = "starting up";
        //this.libbitcoin = None

        let that = this;
        setInterval(function() {
            that._heartbeat(that);
        }, 10000);

        /**
         * Starting up http/https servers for websocket
         */
        if(sslKey !== undefined && sslCert !== undefined) {
            let options = {
                key: fs.readFileSync(sslKey),
                cert: fs.readFileSync(sslCert)
            };
            server = http.createServer(options, (request, response) => {

                // Check for allowed IPs
                if(!Utils.isAllowedIP(request, allowIP)) {
                    response.end();
                }

                console.log((new Date()) + ' Received request for ' + request.url);
                response.writeHead(404);
                response.end();
            })

        } else {
            server = http.createServer(function(request, response) {

                // Check for allowed IPs
                if(!Utils.isAllowedIP(request, allowIP)) {
                    response.end();
                }

                console.log((new Date()) + ' Received request for ' + request.url);
                response.writeHead(404);
                response.end();
            });

            server.listen(port, function() {
                console.log((new Date()) + ' Websocket server is listening on port', port);
            });
        }

        /**
         * Create new websocket server
         */
        this.wsServer = new WebSocketServer({
            httpServer: server,
            // You should not use autoAcceptConnections for production
            // applications, as it defeats all standard cross-origin protection
            // facilities built into the protocol and the browser.  You should
            // *always* verify the connection's origin and decide whether or not
            // to accept it.
            autoAcceptConnections: false,

        });

        function originIsAllowed(origin) {
            // put logic here to detect whether the specified origin is allowed.
            return true;
        }

        /**
         * Websocket server handlers
         */
        this.wsServer.on('request', function(request) {

            if (!originIsAllowed(request.origin)) {
                // Make sure we only accept requests from an allowed origin
                request.reject();
                console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
                return;
            }

            let connection = request.accept(null, request.origin);



            console.log((new Date()) + ' Connection accepted.');

            connection.on('message', function(message) {

                let quantity = 30; // Default amount of items to return
                let requestJSON, messageID, command;


                try {
                    // Parse incoming websocket JSON
                    requestJSON = JSON.parse(message.utf8Data);
                    console.log(requestJSON);
                } catch(err) {
                    console.log('Incoming websocket message is not valid JSON', err);
                }

                try {
                    messageID = requestJSON['request']['id'];

                    // Override default quantity of results if defined
                    if(requestJSON['request'].hasOwnProperty('quantity')) {
                        quantity = parseInt(requestJSON['request']['quantity']);
                    }

                    command = requestJSON['request']['command'];
                    let request = requestJSON['request'];
                    let response;

                    switch(command) {
                        case 'get_vendors':
                            response = getVendors(messageID, quantity);
                            break;
                        case 'get_moderators':
                            response = self.getModerators(messageID);
                            break;
                        case 'get_homepage_listings':
                            let onlyFollowingSet = request.hasOwnProperty('only_following');
                            let onlyFollowing = (onlyFollowingSet && request['only_following']);
                            response = self.getHomepageListings(messageID, onlyFollowing);
                            break;
                        case 'search':
                            response = self.search(messageID, request['keyword'].toLowerCase());
                            break;
                        case 'send_message':
                            response = self.sendMessage(messageID, request['guid'], request['handle'], request['message'],
                                request['subject'], request['message_type'], request['public_key']);
                            break;
                    }

                    connection.send(response);

                } catch(err) {
                    console.log('Error occurred after receiving websocket message:', err);
                }

                /**
                 * Websocket API Methods
                 */

                function getVendors(messageID, quantity) {

                    let queried = [];
                    let vendors = [];

                    // Check for invalid amount of results
                    if(quantity <= 0) {
                        console.log('[Websocket API] Requested 0 vendor results so returning none.');
                        return;
                    }

                    if(self.outstandingVendors.includes(messageID)) {
                        queried = self.outstandingVendors[messageID];
                    } else {
                        self.outstandingVendors = [];
                        self.outstandingVendors[messageID] = queried;

                        for(let i=0, len=self.mserver.protocol.multiplexer.vendors.length; i<len; i++ ){
                            vendors.push(self.mserver.protocol.multiplexer.vendors[i]);
                        }

                        function shuffle(a) {
                            for (let i = a.length; i; i--) {
                                let j = Math.floor(Math.random() * i);
                                [a[i - 1], a[j]] = [a[j], a[i - 1]];
                            }
                        }

                        shuffle(vendors);

                        let toQuery = [];
                        let vendor;
                        for(let vendorIndex in vendors) {
                            vendor = vendors[vendorIndex];
                            if(!queried.includes(vendor.id)) {
                                toQuery.push(vendor);
                            }
                        }

                        let toQuerySlice = toQuery.slice(0, quantity);
                        for(let nodeIndex in toQuerySlice) {
                            this.mserver.getUserMetadata(node, (metadata) => {
                                delete toQuery[node];
                                if (metadata !== undefined) {
                                    vendor = {
                                        "id": messageID,
                                        "vendor": {
                                            "guid": node.id,
                                            "name": metadata.name,
                                            "short_description": metadata.shortDescription,
                                            "handle": metadata.handle,
                                            "avatar_hash": metadata.avatarHash,
                                            "nsfw": metadata.nsfw
                                        }
                                    };

                                    // Send to websocket
                                    connection.sendUTF(Utils.sanitizeDirtyHTML(vendor));

                                    queried.push(node.id);
                                    return true;
                                } else {
                                    if(this.mserver.protocol.multiplexer.vendors.includes(node.id)) {
                                        delete this.mserver.protocol.multiplexer.vendors[node.id];
                                    }
                                    this.db.vendors.deleteVendor(node.id);
                                    return false;
                                }
                            });
                        };

                    }
                }

            });

            // Websocket connection closed
            connection.on('close', function(reasonCode, description) {
                console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
            });
        });



    }
    
    setStatus(status) {
        this.status = status;
    }

    _broadcast(message) {
        for(var c in this.wsServer.connections) {
            let connection = this.wsServer.connections[c];
            connection.sendUTF(message);
        }
    }

    _heartbeat(hServer) {
        let libbitcoinStatus;
        if(hServer.libbitcoin !== undefined) {
            libbitcoinStatus = (hServer.libbitcoin.connected) ? 'online' : 'offline';
        } else {
            libbitcoinStatus = 'NA';
        }

        // Send to socket connections
        hServer._broadcast(JSON.stringify({
            status: hServer.status,
            libbitcoin: libbitcoinStatus
        }))
    }
}

module.exports = {
    HeartbeatServer : HeartbeatServer
}
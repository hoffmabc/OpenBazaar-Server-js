const http = require('http');
const https = require('https');
const fs = require('fs');
const Utils = require('./utils');
const KeyChain = require('../keys/keychain');
const url = require('url');
const NodeSession = require('node-session');
const Profile = require('../market/profile');

const DEFAULT_RECORDS_COUNT = 20;
const DEFAULT_RECORDS_OFFSET = 0;
const API_VERSION = 'v1';

class RestAPIServer {

    /**
     This RESTful API allows clients to pull relevant data from the
     OpenBazaar daemon for use in a GUI or other application.
     **/

    constructor(keychain, mserver, db, kserver, port, username, password, authenticatedSessions, allowIP, iface, sslKey, sslCert) {

        this.mserver = mserver;
        this.kserver = kserver;
        this.db = mserver.db;
        this.keychain = keychain;
        this.username = username;
        this.password = password;
        this.authenticatedSessions = authenticatedSessions || [];
        this.sessionManager = new NodeSession({
            secret: 'Q3UBzdH9GEfiRCTKbi5MTPyChpzXLsTD'
        });
        this.failedLoginAttempts = [];

        //task.LoopingCall(self._keep_sessions_alive).start(890, False)
        //APIResource.__init__(self)


        /**
         * Starting up http/https servers for REST API
         */
        let server;
        let that = this;

        if (sslKey !== undefined && sslCert !== undefined) {
            let options = {
                key: fs.readFileSync(sslKey),
                cert: fs.readFileSync(sslCert)
            };
            server = http.createServer(options, (request, response) => {

                // Check for allowed IPs
                if (!Utils.isAllowedIP(request, allowIP)) {
                    response.end();
                }

                console.log((new Date()) + '[REST API] Received request for ' + request.url);

                that.routeRequest(request, response);


            })

        } else {
            server = http.createServer(function (request, response) {

                // Check for allowed IPs
                if (!Utils.isAllowedIP(request, allowIP)) {
                    response.end();
                }

                console.log((new Date()) + '[REST API] Received request for ' + request.url);
                that.routeRequest(request, response);


            });

            server.listen(port, function () {
                console.log((new Date()) + '[REST API] REST API server is listening on port', port);
            });
        }

    }

    routeRequest(request, response) {
        console.log('[REST API]', request.url);

        let requestURL = url.parse(request.url, true);
        let requestParts = requestURL.pathname.split('/');

        if (requestParts[1] == 'api') {
            let version = requestParts[2];

            if (version == API_VERSION) {

                let result = false;

                let existingSession = this.sessionManager.getSession(request, (test, test2) => {
                    this.sessionManager.startSession(request, response, () => {
                        console.log('[REST API] Processing request for method:', requestParts[3]);

                        switch (requestParts[3]) {
                            case 'login':
                                console.log('[REST API] Login attempt initiated');
                                result = this.login(request, response);
                                break;
                            case 'profile':
                                console.log('[REST API] Retrieving profile');
                                this.getProfile(request, response);
                                break;
                            default:
                                break;
                        }
                    });
                });

            } else {
                console.log('[REST API] This server is not compatible with this API version.')
                console.log('[REST API] Current REST API is', API_VERSION);
                response.writeHead(404);
                response.end();
            }

            return;
        } else {
            console.log('[REST API] No endpoint found for this request', requestURL.pathname);
            response.writeHead(404);
            response.end();
        }
        return;

    };

    login(request, response) {
        // request.setHeader('content-type', "application/json")
        if (request.method == 'POST') {
            let formData = '';
            let host = request.headers.host;

            if (this.failedLoginAttempts.includes(host) && this.failedLoginAttempts[host] >= 7) {
                return {
                    success: false,
                    reason: 'too many attempts'
                }
            }

            let resp, that;
            request
                .on('data', (data) => {
                    formData += data;
                    resp = request;
                    that = this;
                });

            request
                .on('end', () => {
                    let formFields = Utils.explodeForm(formData);

                    try {
                        if (formFields['username'] == this.username && formFields['password'] == this.password) {
                            console.log('[REST API] User authenticated successfully');

                            this.sessionManager.getSession(request, (store) => {
                                console.log(this);
                            });

                            response.writeHead(200, {"Content-Type": "application/json"});
                            response.write(JSON.stringify({
                                success: true
                            }));
                            response.end();
                            return true;
                        }
                        //     self.authenticated_sessions.append(request.getSession())
                        //     if request.getHost().host in self.failed_login_attempts:
                        //     del self.failed_login_attempts[request.getHost().host]
                        //     return json.dumps({"success": True})
                        // else:
                        //     raise Exception("Invalid credentials")
                    } catch (err) {
                        console.log(err);
                    }

                });


        }


    }

    getProfile(request, response) {
        function parseProfile(profile, tempHandle) {
            if (profile !== undefined) {
                let profileJSON = {
                    profile: {
                        name: profile.name,
                        location: str(CountryCode.Name(profile.location)),
                        public_key: profile.guid_key.public_key.encode(hex),
                        nsfw: profile.nsfw,
                        vendor: profile.vendor,
                        moderator: profile.moderator,
                        moderation_fee: round(profile.moderation_fee, 2),
                        handle: profile.handle,
                        about: profile.about,
                        short_description: profile.short_description.substring(0, 160),
                        website: profile.website,
                        email: profile.email,
                        primary_color: profile.primary_color,
                        secondary_color: profile.secondary_color,
                        background_color: profile.background_color,
                        text_color: profile.text_color,
                        pgp_key: profile.pgp_key.public_key,
                        avatar_hash: profile.avatar_hash.encode(hex),
                        header_hash: profile.header_hash.encode(hex),
                        social_accounts: {},
                        last_modified: profile.last_modified
                    }
                };
                if (temp_handle) {
                    profileJSON['profile']['temp_handle'] = temp_handle;
                }

                // Check if this profile request is for yourself
                if (request.args.includes('guid')) {
                    profileJSON['profile']['guid'] = request.args['guid'][0];
                } else {
                    profileJSON['profile']['guid'] = this.keychain.guid.encode('hex')
                }

                for (var accountIndex in profile.social) {
                    profileJSON['profile']['social_accounts'][str(objects.Profile.SocialAccount.SocialType.Name(account.type)).lower()] = {
                        'username': account.username,
                        'proof_url': account.proof_url
                    }
                }

                // if (profile.handle is not "" and "(unconfirmed)" not in profile.handle and
                //         not blockchainid.validate(profile.handle, profile_json["profile"]["guid"])):
                //     profile_json["profile"]["handle"] = ""
                // request.setHeader('content-type', "application/json")
                // request.write(json.dumps(sanitize_html(profile_json), indent=4))
                // request.finish()
            } else {
                response.writeHead(200, {"Content-Type": "application/json"});
                response.write(JSON.stringify({}));
                response.end();
            }
        }

        let queryObj = url.parse(request.url, true).query;
        if (queryObj['guid']) {
            this.kserver.resolveGUID(queryObj['guid']).then((node) => {
                console.log('GUID RESOLVED', node);
                if (node !== undefined) {
                    this.mserver.getProfile(node);
                } else {
                    response.writeHead(200, {"Content-Type": "application/json"});
                    response.write(JSON.stringify({}));
                    response.end();
                }
            }, (err) => {
                console.log('[REST API] Error fetching profile:', err);
            });
        } else {
            let p = new Profile(this.db).get();
            if (!p.HasField("guid_key")) {
                response.writeHead(200, {"Content-Type": "application/json"});
                response.write(JSON.stringify({}));
                response.end();
            } else {
                let tempHandle = this.db.profile.getTempHandle();
                parse_profile(p, (tempHandle == '') ? '' : tempHandle);
            }

            //return server.NOT_DONE_YET
        }

    }

}

module.exports = {
    RestAPIServer: RestAPIServer
};
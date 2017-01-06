"use strict"

var tweetnacl = require('tweetnacl');
var Connection = require('./connection.js');
const sodium = require('sodium').api;

/**
RUDP state machine implementation over confidential channel

Classes:
    CryptoConnection: Endpoint of an encrypted RUDP connection
    ConnectionFactory: Creator of CryptoConnections.
**/

// from nacl import encoding, exceptions, public, utils
// from twisted.internet import reactor, task
//
// from txrudp import connection


// An encrypted RUDP connection.
module.exports = class CryptoConnection extends Connection {

    /**
    Create a new connection and register it with the protocol.

    Args:
        proto: Handler to underlying protocol.
        handler: Upstream recipient of received messages and
            handler of other events. Should minimally implement
            `receive_message` and `handle_shutdown`.
        ownAddr: Tuple of local host address (ip, port).
        destAddr: Tuple of remote host address (ip, port).
        relayAddr: Tuple of relay host address (ip, port).
        privateKey: A private key for Curve25519, as a
            hex-encoded public.PrivateKey. The instance will
            automatically generate a new such key if one is not
            provided.

    If a relay address is specified, all outgoing packets are
    sent to that adddress, but the packets contain the address
    of their final destination. This is used for routing.
    **/
    constructor(proto, handler, ownAddr, destAddr, relayAddr, privateKey) {
        super(proto, handler, ownAddr, destAddr, relayAddr);

        if(privateKey === undefined) {
            let keypair = tweetnacl.box.keyPair();
            this._privateKey = keypair.secretKey;
            this._publicKey = keypair.publicKey;
        } else {
            let keypair = tweetnacl.box.keyPair.fromSecretKey(privateKey);
            this._privateKey = keypair.secretKey;
            this._publicKey = keypair.publicKey;
        }
        this._remotePublicKey = undefined;

        this._leftNonceBytes = tweetnacl.randomBytes(Math.floor(tweetnacl.box.nonceLength / 2));

        this._sendSyn();
    }

    getRemotePublicKey() {
        return this._remotePublicKey;
    }

    _makeNonceFromNum(num) {
        /**
         Construct a nonce from the num provided and the cached nonce bytes.
         Args:
         num: Seed integer.
         Returns:
         A bytes sequence of appropriate length.
         **/
        function pad(n, width, z) {
            z = z || '0';
            n = n + '';
            return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
        }

        let rightNonceBytes = Buffer(pad(num, Math.floor(tweetnacl.box.nonceLength/2)));

        // '{0:0{1}}'.format(
        //     num,
        //     Math.floor(sodium.crypto_box_NONCEBYTES / 2)
        // );
        return Buffer.concat([rightNonceBytes, Buffer(this._leftNonceBytes)]);
    }

    _finalizePacket(rudpPacket) {
        /**
         Convert a packet.Packet to bytes and apply crypto stuff.
         If it is a SYN packet, attach the public key; if not,
         encrypt the payload (unless it is empty).
         Args:
         rudpPacket: A packet.Packet
         Returns:
         The protobuf-encoded version of the packet.
         **/
        if(rudpPacket.syn) {
            rudpPacket.payload = this._publicKey;
            console.log('Public Key:', this._publicKey.toString('hex'))
        } else if(this._remotePublicKey !== undefined) {
            // Use a "mixed nonce"; half of the nonce bytes vary
            // deterministically, as they depend on the sequence number;
            // half are randomly generated upon connection setup and
            // used until shutdown. Reusing the same nonce within the
            // session is impossible, reusing the same nonce across
            // different sessions (with the same key) is highly unilikely.

            let cryptobox = tweetnacl.box(
                rudpPacket.payload,
                this._makeNonceFromNum(rudpPacket.sequenceNumber),
                this._remotePublicKey,
                this._privateKey
            );
            rudpPacket.payload = Buffer.concat([this._makeNonceFromNum(rudpPacket.sequenceNumber), Buffer(cryptobox)]);

                //sodium.crypto_box(rudpPacket.payload, this._makeNonceFromNum(rudpPacket.sequenceNumber), , this._privateKey);
        }
        return Connection.prototype._finalizePacket(rudpPacket);
    }

    receivePacket(rudpPacket, fromAddr) {
        /**
        Process received packet and update connection state.

            Called by protocol when a packet arrives for this connection.

            If the packet is a SYN, setup encryption infrastructure;
        if not, ensure packet is successfully decrypted before
        further processing. Silently drop malicious packages.

            Args:
        rudp_packet: Received packet.Packet.
            from_addr: Sender's address as Tuple (ip, port).
        **/
        function toHexString(byteArray) {
            return byteArray.map(function(byte) {
                return ('0' + (byte & 0xFF).toString(16)).slice(-2);
            }).join('')
        }

        let plaintext = '';
        let nonce, cipherText;

        if(rudpPacket.syn) {
            /**
             * Handle syn packet
             * @type {Uint8Array}
             * @private
             */
            this._remotePublicKey = new Uint8Array(rudpPacket.payload);
        } else if(!rudpPacket.syn && this._remotePublicKey !== undefined) {
            /**
             * Decrypt packet
             */
            nonce = rudpPacket.payload.slice(0, tweetnacl.box.nonceLength);
            cipherText = rudpPacket.payload.slice(tweetnacl.box.nonceLength);
            plaintext = tweetnacl.box.open(
                cipherText,
                nonce,
                this._remotePublicKey,
                this._privateKey
            );
            rudpPacket.payload = plaintext;

        } else {
            console.log('Plain');
        }

        super.receivePacket(rudpPacket, fromAddr);

    //         try:
    //     remote_public_key = public.PublicKey(
    //         rudp_packet.payload,
    //         encoder=encoding.RawEncoder
    //     )
    //     self._crypto_box = public.Box(
    //         self._private_key,
    //         remote_public_key
    //     )
    //     except (exceptions.CryptoError, ValueError):
    //     pass
    // else:
    //     self._remote_public_key = rudp_packet.payload
    //     super(CryptoConnection, self).receive_packet(rudp_packet, from_addr)
    //     elif not rudp_packet.syn and self._crypto_box is not None:
    //         try:
    //     rudp_packet.payload = self._crypto_box.decrypt(
    //         rudp_packet.payload
    //     )
    //     except (
    //         exceptions.CryptoError,
    //         exceptions.BadSignatureError,
    //         ValueError
    //     ):
    //     pass
    // else:
    //     super(CryptoConnection, self).receive_packet(rudp_packet, from_addr)
    //     super.receivePacket(rudpPacket, fromAddr);
    }


};


//
// class CryptoConnection(connection.Connection):
//
//     """An encrypted RUDP connection."""
//
//     def __init__(
//         self,
//         proto,
//         handler,
//         own_addr,
//         dest_addr,
//         relay_addr=None,
//         private_key=None
//     ):
//         """
//         Create a new connection and register it with the protocol.
//
//         Args:
//             proto: Handler to underlying protocol.
//             handler: Upstream recipient of received messages and
//                 handler of other events. Should minimally implement
//                 `receive_message` and `handle_shutdown`.
//             own_addr: Tuple of local host address (ip, port).
//             dest_addr: Tuple of remote host address (ip, port).
//             relay_addr: Tuple of relay host address (ip, port).
//             private_key: A private key for Curve25519, as a
//                 hex-encoded public.PrivateKey. The instance will
//                 automatically generate a new such key if one is not
//                 provided.
//
//         If a relay address is specified, all outgoing packets are
//         sent to that adddress, but the packets contain the address
//         of their final destination. This is used for routing.
//         """
//         super(CryptoConnection, self).__init__(
//             proto, handler, own_addr, dest_addr, relay_addr
//         )
//
//         if private_key is None:
//             self._private_key = public.PrivateKey.generate()
//         else:
//             self._private_key = public.PrivateKey(
//                 private_key,
//                 encoder=encoding.HexEncoder
//             )
//         self._public_key = self._private_key.public_key
//         self._crypto_box = None
//         self._remote_public_key = None
//
//         self._left_nonce_bytes = utils.random(public.Box.NONCE_SIZE // 2)
//
//     @property
//     def remote_public_key(self):
//         """Return the byte-encoded remote public key."""
//         return self._remote_public_key
//
//     def _make_nonce_from_num(self, num):
//         """
//         Construct a nonce from the num provided and the cached nonce bytes.
//
//         Args:
//             num: Seed integer.
//
//         Returns:
//             A bytes sequence of appropriate length.
//         """
//         right_nonce_bytes = '{0:0{1}}'.format(
//             num,
//             self._crypto_box.NONCE_SIZE // 2
//         )
//         return right_nonce_bytes + self._left_nonce_bytes
//
//     def _finalize_packet(self, rudp_packet):
//         """
//         Convert a packet.Packet to bytes and apply crypto stuff.
//
//         If it is a SYN packet, attach the public key; if not,
//         encrypt the payload (unless it is empty).
//
//         Args:
//             rudp_packet: A packet.Packet
//
//         Returns:
//             The protobuf-encoded version of the packet.
//         """
//         if rudp_packet.syn:
//             rudp_packet.payload = self._public_key.encode(
//                 encoder=encoding.RawEncoder
//             )
//         elif self._crypto_box is not None:
//             # Use a "mixed nonce"; half of the nonce bytes vary
//             # deterministically, as they depend on the sequence number;
//             # half are randomly generated upon connection setup and
//             # used until shutdown. Reusing the same nonce within the
//             # session is impossible, reusing the same nonce across
//             # different sessions (with the same key) is highly unilikely.
//             rudp_packet.payload = self._crypto_box.encrypt(
//                 rudp_packet.payload,
//                 self._make_nonce_from_num(rudp_packet.sequence_number)
//             )
//         return super(CryptoConnection, self)._finalize_packet(rudp_packet)
//
//     def receive_packet(self, rudp_packet, from_addr):
//         """
//         Process received packet and update connection state.
//
//         Called by protocol when a packet arrives for this connection.
//
//         If the packet is a SYN, setup encryption infrastructure;
//         if not, ensure packet is successfully decrypted before
//         further processing. Silently drop malicious packages.
//
//         Args:
//             rudp_packet: Received packet.Packet.
//             from_addr: Sender's address as Tuple (ip, port).
//         """
//         if rudp_packet.syn and self._crypto_box is None:
//             # Try to create a crypto box for this connection, by
//             # combining remote public key and local private key.
//             try:
//                 remote_public_key = public.PublicKey(
//                     rudp_packet.payload,
//                     encoder=encoding.RawEncoder
//                 )
//                 self._crypto_box = public.Box(
//                     self._private_key,
//                     remote_public_key
//                 )
//             except (exceptions.CryptoError, ValueError):
//                 pass
//             else:
//                 self._remote_public_key = rudp_packet.payload
//                 super(CryptoConnection, self).receive_packet(rudp_packet, from_addr)
//         elif not rudp_packet.syn and self._crypto_box is not None:
//             try:
//                 rudp_packet.payload = self._crypto_box.decrypt(
//                     rudp_packet.payload
//                 )
//             except (
//                 exceptions.CryptoError,
//                 exceptions.BadSignatureError,
//                 ValueError
//             ):
//                 pass
//             else:
//                 super(CryptoConnection, self).receive_packet(rudp_packet, from_addr)
//
//
// class CryptoConnectionFactory(connection.ConnectionFactory):
//
//     """A factory for CryptoConnections."""
//
//     def make_new_connection(
//         self,
//         proto_handle,
//         own_addr,
//         source_addr,
//         relay_addr,
//         private_key=None
//     ):
//         """
//         Create a new CryptoConnection.
//
//         In addition, create a handler and attach the connection to it.
//         """
//         handler = self.handler_factory.make_new_handler(
//             own_addr,
//             source_addr,
//             relay_addr
//         )
//         connection = CryptoConnection(
//             proto_handle,
//             handler,
//             own_addr,
//             source_addr,
//             relay_addr,
//             private_key
//         )
//         handler.connection = connection
//         return connection

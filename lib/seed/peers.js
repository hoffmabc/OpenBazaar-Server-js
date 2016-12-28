(function(global, factory) {
    /* eslint-disable no-undef */

    /* AMD */ if (typeof define === 'function' && define.amd)
        define(["protobuf"], factory);
    
    /* CommonJS */ else if (typeof require === 'function' && typeof module === 'object' && module && module.exports)
        module.exports = factory(require("protobufjs/runtime"));

    /* eslint-enable no-undef */
})(this, function($protobuf) {
    "use strict"; // eslint-disable-line strict

    var protobuf = require('protobufjs');
    var $root = protobuf.Root.fromJSON({
          "nested": {
            "PeerSeeds": {
              "fields": {
                "serializedNode": {
                  "rule": "repeated",
                  "type": "bytes",
                  "id": 1
                },
                "signature": {
                  "rule": "required",
                  "type": "bytes",
                  "id": 2
                }
              }
            }
          }
        }).resolveAll();

    $protobuf.roots["default"] = $root;

    return $root;
});

const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
    'a',
    'b',
    'blockquote',
    'em',
    'hr',
    'h2',
    'h3',
    'h4',
    'h5',
    'i',
    'img',
    'li',
    'p',
    'ol',
    'nl',
    'span',
    'strike',
    'strong',
    'ul',
];

const ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'alt', 'style'],
    'img': ['src', 'width', 'height'],
    'b': ['style'],
    'blockquote': ['style'],
    'em': ['style'],
    'h2': ['style'],
    'h3': ['style'],
    'h4': ['style'],
    'h5': ['style'],
    'i': ['style'],
    'li': ['style'],
    'p': ['style'],
    'ol': ['style'],
    'nl': ['style'],
    'span': ['style'],
    'strike': ['style'],
    'strong': ['style']
};

const ALLOWED_STYLES = ['color', 'background']

module.exports = class Utils {
    constructor() {

    }

    static explodeForm(fieldData) {
        let fields = fieldData.split('&');
        let data = {};
        for(var i=0, len=fields.length; i<len; i++) {
            let fieldsplit = fields[i].split('=');
            data[fieldsplit[0]] = fieldsplit[1];
        }
        return data;
    }

    static sanitizeDirtyHTML(value) {
        // Recursively sanitize all strings within a data structure.
        switch (typeof(value)) {
            case "object":
                for (let propertyName in value) {
                    value[propertyName] = this.sanitizeDirtyHTML(value[propertyName]);
                }
                break;
            case "string":
                value = sanitizeHtml(value, {
                    ALLOWED_TAGS, ALLOWED_ATTRIBUTES
                })

        }
    }

    static isAllowedIP(request, allowedIPs) {
        if(allowedIPs == undefined) {
            allowedIPs = ['127.0.0.1'];
        }

        let requestIP = request.ip || request.connection.remoteAddress
            || request.socket.remoteAddress || request.connection.socket.remoteAddress;

        return (!allowedIPs.includes(requestIP));
    }

};
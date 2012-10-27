/**
  * Copyright (c) 2012 Ivo Wetzel.
  *
  * Permission is hereby granted, free of charge, to any person obtaining a copy
  * of this software and associated documentation files (the "Software"), to deal
  * in the Software without restriction, including without limitation the rights
  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  * copies of the Software, and to permit persons to whom the Software is
  * furnished to do so, subject to the following conditions:
  *
  * The above copyright notice and this permission notice shall be included in
  * all copies or substantial portions of the Software.
  *
  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  * THE SOFTWARE.
  */
var http = require('http'),
    crypto = require('crypto'),
    Remote = require('./Remote'),
    EventEmitter = require('events').EventEmitter;

function Server(callback, encoder, decoder, maxFrameSize) {

    EventEmitter.call(this);

    this._server = null;
    this._httpServer = false;
    this._upgradeHandler = null;
    this._maxFrameSize = maxFrameSize || 32768;

    this._remotes = null;
    this._remoteList = null;

    this._isRunning = false;
    this._encoder = encoder || function(msg) { return msg; };
    this._decoder = decoder || function(msg) { return msg; };

    this._connectCallback = callback;
    callback && this.on('connected', this._connectCallback);

}

Server.prototype = {

    listen: function(port, hostname) {

        var that = this;
        if (typeof port === 'number') {
            this._httpServer = true;
            this._server = new http.Server();
            this._server.listen(port, hostname);

        } else {
            this._httpServer = false;
            this._server = port;
        }

        this._remotes = {};
        this._remoteList = [];

        this._upgradeHandler = function(req, socket, headers) {
            if (!that._upgradeRequest(req, socket, headers)) {
                socket.end();
                socket.destroy();
            }
        };

        this._isRunning = true;
        this._server.on('upgrade', this._upgradeHandler);

    },

    /**
      * Returns whether the server is running (listening for new connections).
      */
    isRunning: function() {
        return this._isRunning;
    },

    /**
      * Returns a list of the currently accepted remotes.
      */
    remotes: function(filter) {
        return this._isRunning ? ((filter ? this._remoteList.filter(filter)
                                          : this._remoteList).slice()) : null;
    },

    /**
      * Sends a message to all accepted remotes.
      *
      * The remotes can be filter via the optional filter function.
      */
    send: function(message, filter) {

        var count = 0;
        if (this._isRunning) {
            (filter ? this._remoteList.filter(filter) : this._remoteList).forEach(function(remote) {
                count++;
                remote.send(message);
            });
        }

        return count;

    },

    /**
      * Closes the connection and sends a optional message before doing so.
      */
    close: function(message) {

        if (!this._isRunning) {
            return false;
        }

        // Stop HTTP server / listener
        this.removeListener('connected', this._connectCallback);
        this._server.removeListener('upgrade', this._upgradeHandler);
        if (this._server && this._httpServer) {
            this._server.close();
            this._httpServer = false;
        }

        // Close all remotes
        message && this.send(message);
        this._remoteList.forEach(function(remote) {
            remote.close();
        });

        // Remove all pending remotes
        for(var i in this._remotes) {
            if (this._remotes.hasOwnProperty(i)) {
                this._remotes[i].close();
            }
        }

        this._server = null;
        this._remoteList = null;
        this._remotes = null;

        return true;

    },


    // Internals --------------------------------------------------------------
    _addRemote: function(remote) {

        if (this._remoteList.indexOf(remote) === -1) {
            this._remoteList.push(remote);
            this.emit('accepted', remote);
        }

    },

    _removeRemote: function(remote, reject) {

        if (this._remotes.hasOwnProperty(remote.id)) {

            this._remoteList.splice(this._remoteList.indexOf(remote), 1);
            delete this._remotes[remote.id];

            reject && this.emit('rejected', remote);
            this.emit('closed', remote);

        }

    },

    _upgradeRequest: function(req, socket, head) {

        if (!this._validateUpgrade(req)) {
            return false;
        }

        var handshake = this._getWebSocketHandshake(req, head);
        if (handshake.version !== -1) {

            var data = 'HTTP/1.1 101 WebSocket Protocol Handshake\r\n'
                     + 'Upgrade: WebSocket\r\n'
                     + 'Connection: Upgrade\r\n';

            for(var i in handshake.headers) {
                if (handshake.headers.hasOwnProperty(i)) {
                    data += i + ': ' + handshake.headers[i] + '\r\n';
                }
            }

            data += '\r\n' + handshake.body;
            socket.write(data, 'ascii');

            socket.setTimeout(0);
            socket.setNoDelay(true);
            socket.setKeepAlive(true, 0);
            socket.removeAllListeners('timeout');

            var remote = new Remote(this, socket, handshake.version,
                                    this._maxFrameSize,
                                    this._encoder, this._decoder);

            this._remotes[remote.id] = remote;
            this.emit('connected', remote);

            return true;


        } else {
            return false;
        }

    },

    _validateUpgrade: function(req) {
        var headers = req.headers;
        return req.method === 'GET'
                && headers.hasOwnProperty('upgrade')
                && headers.hasOwnProperty('connection')
                && headers.upgrade.toLowerCase() === 'websocket'
                && headers.connection.toLowerCase().indexOf('upgrade') !== -1;
    },

    _getWebSocketHeaders: function(httpHeaders) {

        var headers = {
            host: httpHeaders.host,
            origin: httpHeaders.origin,
            version: +httpHeaders.version || -1
        };

        for(var i in httpHeaders) {
            if (i.substring(0, 14) === 'sec-websocket-') {
                headers[i.substring(14)] = httpHeaders[i];
            }
        }

        return headers;

    },

    _getWebSocketHandshake: function(req, head) {

        function pack32(value) {
            return String.fromCharCode(value >> 24 & 0xFF)
                   + String.fromCharCode(value >> 16 & 0xFF)
                   + String.fromCharCode(value >> 8 & 0xFF)
                   + String.fromCharCode(value & 0xFF);
        }

        var handshake = {
            version: -1,
            headers: null,
            body: ''
        };

        var headers = this._getWebSocketHeaders(req.headers);
        if (headers.version !== -1 && 'origin' in headers) {

            var sha1 = crypto.createHash('sha1');
            sha1.update(headers.key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');

            handshake.version = 13;
            handshake.headers = {
                'Sec-WebSocket-Version': headers.version,
                'Sec-WebSocket-Origin': headers.origin,
                'Sec-WebSocket-Accept': sha1.digest('base64')
            };

        } else  {

            var md5 = crypto.createHash('md5');
            if ('key1' in headers && 'key2' in headers) {

                var k = headers.key1,
                    l = headers.key2,
                    a = parseInt(k.replace(/[^\d]/g, ''), 10),
                    b = parseInt(l.replace(/[^\d]/g, ''), 10),
                    u = k.replace(/[^\ ]/g, '').length,
                    o = l.replace(/[^\ ]/g, '').length;

                if (!(u === 0 || o === 0 || a % u !== 0 || b % o !== 0)) {

                    md5.update(pack32(parseInt(a / u, 10)));
                    md5.update(pack32(parseInt(b / o, 10)));
                    md5.update(head.toString('binary'));

                    handshake.version = 6;
                    handshake.body = md5.digest('binary');
                    handshake.headers = {
                        'Sec-WebSocket-Origin': headers.origin,
                        'Sec-WebSocket-Location': 'ws://' + headers.host + '/'
                    };

                }

            } else {
                handshake.version = 6;
                handshake.body = md5.digest('binary');
                handshake.headers = {
                    'WebSocket-Origin': headers.origin,
                    'WebSocket-Location': 'ws://' + headers.host + '/'
                };
            }

        }

        return handshake;

    }

};

for(var i in EventEmitter.prototype) {
    Server.prototype[i] = EventEmitter.prototype[i];
}

module.exports = Server;


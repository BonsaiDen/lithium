/**  * Copyright (c) 2012 Ivo Wetzel.
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
var EventEmitter = require('events').EventEmitter,
    Protocol = require('./Protocol');


// Remote Abstraction ---------------------------------------------------------
// ----------------------------------------------------------------------------
function Remote(server, socket, version, maxFrameSize, encoder, decoder) {

    // Events
    EventEmitter.call(this);

    // Internals
    this._server = server;
    this._socket = socket;
    this._isPending = true;

    // Public properties
    this.id = socket.remoteAddress + ':' + socket.remotePort;
    this.address = socket.remoteAddress;
    this.port = socket.remotePort;
    this.bytesSend = 0;
    this.bytesReceived = 0;
    this.version = version;

    // Protocol
    this._encoder = encoder;
    this._decoder = decoder;
    this._protocol = Protocol(this, socket, version, maxFrameSize);
    Protocol.bind(this._protocol, this, socket);
    this._protocol.init();

}

Remote.prototype = {

    accept: function() {

        if (this._isPending) {
            this._isPending = false;
            this._server._addRemote(this);
            return true;

        } else {
            return false;
        }

    },

    reject: function(reason) {

        if (this._isPending) {
            this._isPending = false;
            this.close(reason);
            return true;

        } else {
            return false;
        }

    },

    isPending: function() {
        return this._isPending;
    },

    send: function(message) {
        this._protocol.write(this._encoder(message));
    },

    close: function(reason) {

        if (!this._protocol.isConnected) {
            return false;

        } else {
            return this._protocol.close(false, reason);
        }

    },

    toString: function() {
        return '[Remote ' + this.id + ' Version ' + this.version + ']';
    },

    _reset: function() {

        this._server = null;
        this._isPending = null;
        this._encoder = null;
        this._decoder = null;
        this.id = null;

    }

};

for(var i in EventEmitter.prototype) {
    Remote.prototype[i] = EventEmitter.prototype[i];
}

module.exports = Remote;


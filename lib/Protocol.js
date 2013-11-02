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
var Protocol6 = require('./Protocol6'),
    Protocol13 = require('./Protocol13');


// Protocol Abstraction -------------------------------------------------------
// ----------------------------------------------------------------------------
function Protocol(remote, socket, version, maxFrameSize) {

    function protocol() {
        this.socket = socket;
        this.maxFrameSize = maxFrameSize;
        this.isConnected = true;
        this.remote = remote;
    }

    protocol.prototype = {
        6: Protocol6,
        13: Protocol13

    }[version];

    return new protocol();

}

function wrap(callback, scope, delay) {
    return function() {
        var args = arguments;
        setTimeout(function() {
            callback.apply(scope || null, args);

        }, delay);
    };
}

Protocol.bind = function(protocol, remote, socket, delay) {

    protocol.onMessage = function(message, binary) {

        var data;
        try {
            data = remote._decoder(message);

        } catch(e) {
            return false;
        }

        remote.emit('message', data);
        return true;

    };

    protocol.onClose = function(closedByRemote) {

        socket.end();
        socket.destroy();

        remote._server._removeRemote(remote);
        remote.emit('close', closedByRemote);
        remote.reset();

    };

    if (delay) {
        protocol.read = wrap(protocol.read, protocol, delay);
        protocol.write = wrap(protocol.write, protocol, delay);
    }

    // Bind socket events
    socket.on('data', function(data) {
        protocol.read(data);
    });

    socket.on('error', function(err) {
        protocol.close();
    });

    socket.on('end', function() {
        protocol.close(true);
    });

};

module.exports = Protocol;


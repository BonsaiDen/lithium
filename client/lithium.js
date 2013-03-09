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

/*global MozWebSocket */
(function(exports) {

    'use strict';

    function Client(callback, encoder, decoder) {

        this._events = {};

        this._socket = null;
        this._callback = callback;

        this._isConnected = false;
        this._wasConnected = false;
        this._closedByRemote = true;

        this._encoder = encoder || function(msg) { return msg; };
        this._decoder = decoder || function(msg) { return msg; };

        this._callback && this.on('connection', this._callback, this);

    }

    Client.prototype = {

        connect: function(port, hostname, secure) {

            if (this._isConnected) {
                return false;
            }

            var Ws = typeof WebSocket !== 'undefined' ? WebSocket : MozWebSocket;
            try {
                this._socket = new Ws('ws' + (secure ? 's' : '') + '://'
                                        + hostname + (port !== undefined ? ':'
                                        + port : ''));

            } catch(e) {
                return e;
            }

            var that = this;
            this._socket.onopen = function() {
                that._isConnected = true;
                that._closedByRemote = true;
                that.emit('connection', that);
            };

            this._socket.onmessage = function(msg) {
                that.emit('message', that._decoder(msg.data));
            };

            this._socket.onclose = function(msg) {
                that._wasConnected = that._isConnected;
                that._isConnected = false;
                that.emit('close', that._closedByRemote, msg.reason, msg.code);
            };

            return true;

        },

        isConnected: function() {
            return this._isConnected;
        },

        wasConnected: function() {
            return this._wasConnected;
        },

        send: function(message) {

            if (!this.isConnected()) {
                return false;
            }

            this._socket.send(this._encoder(message));
            return true;

        },

        close: function() {

            if (!this.isConnected()) {
                return false;
            }

            this._closedByRemote = false;
            this._socket.close();
            return true;

        },


        // Events -------------------------------------------------------------
        on: function(name, callback, scope, once) {

            var events = null;
            if (!(events = this._events[name])) {
                events = this._events[name] = [];
            }

            events.push({
                callback: callback,
                scope: scope || this,
                once: once,
                fired: false
            });

            return callback;

        },

        once: function(name, callback, scope) {
            return this.on(name, callback, scope, true);
        },

        emit: function(name) {

            var id = name;

            // Go up to parent
            var events = this._events[id],
                stopped = false;

            if (events) {

                var call = Function.prototype.call;

                // Create a shallow copy to protect against unbinds
                // from within the callbacks
                var sliced = events.slice();
                for(var i = 0, l = sliced.length; i < l; i++) {

                    var event = events[i];
                    if (!event.once || !event.fired) {

                        event.fired = true;

                        var args = Array.prototype.slice.call(arguments);
                        args[0] = event.scope || this;
                        stopped = call.apply(event.callback, args) || stopped;

                    }

                    if (event.once) {
                        events.splice(i, 1);
                        i--;
                        l--;
                    }

                }

            }

            return stopped;

        },

        unbind: function(name, func) {

            if (typeof name === 'function') {
                name = null;
                func = name;
            }

            var count = 0;
            if (name) {

                if (func) {

                    var events = this._events[name];
                    if (events) {

                        for(var i = 0, l = events.length; i < l; i++) {

                            if (events[i].callback === func) {
                                events.splice(i, 1);
                                i--;
                                l--;
                            }

                        }

                    }

                } else {
                    count = this._events[name];
                    delete this._events[name];
                }

            } else {

                for(var e in this._events) {
                    if (this._events.hasOwnProperty(e)) {
                        this.unbind(e, func);
                    }
                }

            }

        }

    };

    exports.lithium = {
        Client: Client
    };

})(typeof exports !== 'undefined' ? exports : (this.lithium = {}));


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

        this._isBinary = false;
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
                this._socket = new Ws('ws' + (secure ? 's' : '') + '://' + hostname + (port !== undefined ? ':' + port : ''));
                this._isBinary = false; //typeof ArrayBuffer !== 'undefined' && typeof this._socket.binaryType !== 'undefined';
                if (this._isBinary) {
                    this._socket.binaryType = 'arraybuffer';
                }

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

                var data = msg.data;
                if (that._isBinary && msg.data instanceof ArrayBuffer) {
                    var bytes = new Uint8Array(msg.data);
                    data = String.fromCharCode.apply(null, bytes);
                }

                that.emit('message', that._decoder(data));

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

        send: function(msg) {

            if (!this.isConnected()) {
                return false;

            } else {

                var data = this._encoder(msg);
                if (this._isBinary) {

                    var len = data.length,
                        bytes = new Uint8Array(len);

                    for(var i = 0; i < len; i++) {
                        bytes[i] = data.charCodeAt(i);
                    }

                    data = bytes.buffer;

                }

                this._socket.send(data);
                return true;

            }

        },

        close: function() {

            if (!this.isConnected()) {
                return false;

            } else {
                this._closedByRemote = false;
                this._socket.close();
                return true;
            }

        },


        // Events -------------------------------------------------------------

        /**
          * {Function} Bind a @callback {Function} for any event with the @name {String}
          * in the optional @scope {Object?} and return the @callback.
          *
          * In case @once {Boolean} is set, the callback will be unbound after it has
          * been fired once.
          */
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

        /**
          * Like {Emitter#on} but will only fire once and then get removed.
          */
        once: function(name, callback, scope) {
            return this.on(name, callback, scope, true);
        },

        /**
          * Emits the event @name {String} with the params @arguments {Arguments}
          */
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

        /**
          * {Integer} If the first argument is a {Function} all events for the given function
          * will be unbound. If only @name {String} is set, all callbacks for the
          * given event will be removed. If both parameters are set, they'll act
          * as a filter.
          *
          * Returns the number of unbound callbacks.
          */
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

    exports.Client = Client;

})(typeof exports !== 'undefined' ? exports : (this.lithium = {}));


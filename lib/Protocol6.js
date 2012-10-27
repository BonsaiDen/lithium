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
var ProtocolImplementation = {

    init: function() {
        this.frame = [];
        this.frameLength = 0;
        this.frameState = 0;
    },

    read: function(data) {

        if (!this.isConnected) {
            return;

        } else if (data.length > this._maxFrameSize) {
            return this.close();
        }

        for(var i = 0, l = data.length; i < l; i++) {

            var frameType = data[i];
            if (this.frameState === 0) {

                if (frameType === 0xff) {
                    this.frameState = 3;

                } else if ((frameType & 0x80) === 0x80) {
                    this.frameState = 2;

                } else {
                    this.frameState = 1;
                }

                this.remote.bytesReceived += 1;

            // Framed message
            } else if (this.frameState === 1) {

                if (frameType === 0xff) {

                    var buffer = new Buffer(this.frame);
                    this.frame.length = 0;
                    this.frameState = 0;
                    this.frameLength = 0;

                    this.remote.bytesReceived += this.frameLength + 1;

                    // In case something's wrong with the message, close the connection
                    if (!this.onMessage(buffer.toString('utf8'), false)) {
                        this.close();
                    }

                } else {
                    this.frame.push(frameType);
                    this.frameLength++;
                }

            // Size prefixed message
            } else if (this.frameState === 2) {
                // TODO Does any old browser actually implement this?

            // Closing
            } else if (this.frameState === 3) {
                if (frameType === 0x00) {
                    this.close(true);
                }
            }

        }

    },

    write: function(data, binary) {

        if (!this.socket.writable) {
            this.close();
        }

        try {

            this.socket.write('\x00', 'ascii');

            if (data !== null) {

                var dataLength = Buffer.byteLength(data);
                this.socket.write(data, 'utf8');
                this.remote.bytesSend += dataLength + 2;
            }

            this.socket.write('\xff', 'ascii');

        } catch(e) {
            this.close();
        }

    },

    close: function(closedByRemote) {

        if (this.isConnected) {
            this.isConnected = false;
            this.socket.write('\xff\x00', 'binary');
            this.onClose(closedByRemote || false);
            return true;

        } else {
            return false;
        }

    }

};

module.exports = ProtocolImplementation;


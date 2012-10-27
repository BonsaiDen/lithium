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

        this.buffer = new Buffer(0);
        this.bufferOffset = 0;

        this.mode = 0;
        this.op = 0;
        this.masked = false;
        this.maskOffset = 0;
        this.frameLength = 0;
        this.closeCode = 1000; // Normal closure

    },

    read: function(data) {

        if (!this.isConnected) {
            return;

        } else if (data.length > this._maxFrameSize) {
            this.closeCode = 1009; // Message too big
            return this.close();
        }

        // Create a temporary buffer for reading
        var tmp = new Buffer(this.buffer.length + data.length);
        this.buffer.copy(tmp);
        data.copy(tmp, this.buffer.length);

        // Re-assign buffer
        this.buffer = tmp;

        var length = this.buffer.length;
        while(length > 0) {

            // Parse the available data for a message frame
            var lastPos = this.bufferOffset,
                result = this.parse(length);

            if (result === false || !this.isConnected) {
                break;

            // If we read a message, re-size the buffer and reset the offset
            } else if (result === true) {

                length = this.buffer.length - this.bufferOffset;
                tmp = new Buffer(length);
                this.buffer.copy(tmp, 0, this.bufferOffset);
                this.buffer = tmp;
                this.bufferOffset = 0;
            }

        }

    },

    parse: function(length) {

        var bytes = length - this.bufferOffset,
            buffer = this.buffer;

        var b;
        if (this.mode === 0 && bytes >= 1) {

            b = buffer[this.bufferOffset++];
            this.op = b & 15;
            b &= 240;

            // Reserved frame check
            if ((b & 2) === 2 || (b & 4) === 4 || (b & 8) === 8) {
                this.mode = -1;

            // Closing frame
            } else if (this.op === 8) {
                this.mode = -1;

            // Ping frame
            } else if (this.op === 9) {
                this.mode = 1;

            // Pong frame
            } else if (this.op === 10) {
                this.mode = 1;

            // Unused op codes
            } else if (this.op !== 1 && this.op !== 2 && this.op !== 9) {
                this.mode = -1;

            } else {
                this.mode = 1;
            }

        } else if (this.mode === 1 && bytes >= 1) {

            b = buffer[this.bufferOffset++];

            // Clients ALWAYS MASK, although they don't care to tell you
            this.masked = this.op !== 10 ? ((b & 1) === 1 || true) : false;
            this.frameLength = b & 127;

            if (this.frameLength <= 125) {
                this.mode = this.masked ? 4 : 5;

            } else if (this.frameLength === 126) {
                this.frameLength = 0;
                this.mode = 2;

            } else if (this.frameLength === 127) {
                this.frameLength = 0;
                this.mode = 3;

            } else {
                this.closeCode = 1002; // Protocol error
                this.mode = -1;
            }

        // Read 16 bit length
        } else if (this.mode === 2 && bytes >= 2) {

            this.frameLength = buffer[this.bufferOffset + 1]
                       + (buffer[this.bufferOffset] << 8);

            this.mode = this.masked ? 4 : 5;

            this.bufferOffset += 2;

        // Read 64 bit length
        } else if (this.mode === 3 && bytes >= 8) {

            var hi = (buffer[this.bufferOffset + 0] << 24)
                   + (buffer[this.bufferOffset + 1] << 16)
                   + (buffer[this.bufferOffset + 2] << 8)
                   +  buffer[this.bufferOffset + 3],

                low = (buffer[this.bufferOffset + 4] << 24)
                    + (buffer[this.bufferOffset + 5] << 16)
                    + (buffer[this.bufferOffset + 6] << 8)
                    +  buffer[this.bufferOffset + 7];

            this.frameLength = (hi * 4294967296) + low;
            this.mode = this.masked ? 4 : 5;

            this.bufferOffset += 8;

        // Read mask
        } else if (this.mode === 4 && bytes >= 4) {
            this.maskOffset = this.bufferOffset;
            this.mode = 5;

            this.bufferOffset += 4;

        // Read frame data
        } else if (this.mode === 5 && bytes >= this.frameLength)  {

            var message,
                isBinary = this.op === 2;

            if (this.frameLength > 0) {

                if (this.masked) {
                    var i = 0;
                    while(i < this.frameLength) {
                        buffer[this.bufferOffset + i] ^= buffer[this.maskOffset + (i % 4)];
                        i++;
                    }
                }

                this.bytesReceived += this.frameLength;
                message = buffer.toString(isBinary ? 'binary' : 'utf8',
                                          this.bufferOffset,
                                          this.bufferOffset + this.frameLength);

            } else {
                message = '';
            }

            this.mode = 0;

            this.bufferOffset += this.frameLength;
            this.bytesReceived += this.bufferOffset;

            // Ping
            if (this.op === 9) {
                this.write(message, isBinary);

            // Message
            } else if (this.op !== 10) {

                // In case something's wrong with the message, close the connection
                if (!this.onMessage(message, isBinary)) {
                    this.closeCode = 1003; // Unsupported data
                    this.close();
                }

            }

            return true;

        } else {
            return false;
        }

        if (this.mode === -1) {
            this.close(true);
            return false;
        }

    },

    write: function(data, binary, isClose) {

        if (!this.socket.writable) {
            return this.close(true);
        }

        var enc = binary ? 'binary' : 'utf8',
            length = Buffer.byteLength(data, enc) + (isClose ? 2 : 0),
            buffer,
            bytes = 2;

        // 64 Bit
        if (length > 0xffff) {

            var low = length | 0,
                hi = (length - low) / 4294967296;

            buffer = new Buffer(10 + length);
            buffer[1] = 127;

            buffer[2] = (hi >> 24) & 0xff;
            buffer[3] = (hi >> 16) & 0xff;
            buffer[4] = (hi >> 8) & 0xff;
            buffer[5] = hi & 0xff;

            buffer[6] = (low >> 24) & 0xff;
            buffer[7] = (low >> 16) & 0xff;
            buffer[8] = (low >> 8) & 0xff;
            buffer[9] = low & 0xff;

            bytes += 8;

        // 16 Bit
        } else if (length > 125) {
            buffer = new Buffer(4 + length);
            buffer[1] = 126;

            buffer[2] = (length >> 8) & 0xff;
            buffer[3] = length & 0xff;

            bytes += 2;

        // Normal length
        } else {
            buffer = new Buffer(2 + length);
            buffer[1] = length;
        }

        // Set op and fin
        buffer[0] = 128 + (isClose ? 8 : (binary ? 2 : 1));
        buffer[1] &= ~128; // Clear masking bit

        // Handle closing codes
        if (isClose) {
            var code = String.fromCharCode((this.closeCode >> 8) & 0xff)
                     + String.fromCharCode(this.closeCode & 0xff);

            buffer.write(code, bytes, 'binary');
            bytes += 2;
        }

        buffer.write(data, bytes, enc);
        this.socket.write(buffer);
        this.remote.bytesSend += bytes + length;

    },

    close: function(closedByRemote, reason) {

        if (this.isConnected) {
            this.isConnected = false;

            this.buffer = null;
            this.bufferOffset = null;
            this.parser = null;

            this.write(reason || '', false, true);
            this.closeCode = null;
            this.remote = null;
            this.socket = null;

            this.onClose(closedByRemote || false);
            return true;

        } else {
            return false;
        }

    }

};

module.exports = ProtocolImplementation;


# Lithium

__Lithium__ is a data centric WebSocket library for both Node.js and the Browser.


## Installation
    
#### Client

```html
<script type="text/javascript" src="lithium.client.js"></script>
```

#### Server

    npm install lithium


## Usage

Below is an example of a simple, JSON based echo server.

#### Client

```javascript
var client = lithium.Client(function(client) {

    client.on('message', function(msg) {
        ...
    });

    client.send({
        msg: 'Hello World'
    });

}, JSON.stringify, JSON.parse);
```

#### Server

```javascript
var lithium = require('lithium');

var server = new lithium.Server(function(remote) {

    remote.accept();
    remote.on('message', function(msg) {
        remote.send(msg);
    });

}, JSON.stringify, JSON.parse);

server.listen(8000);
```

## Features

- WebSocket Protocols (v75, v76, hixie and hyby)
- Binary Message Support
- Consistent API on both Server and Client
- No dependencies


## API

### Server

A `http.Server`-like interface for managing web socket connections.


#### Methods

- __lithium.Server([function:callback] [, function:encoder, function:decoder])__ *(Constructor)*

    Creates a new server instance.

    The optional `callback` argument is shortcut for the `connection` event.

    If both the `encoder` and `decoder` arguments are present, messages will be 
    passed to these functions when being send / received.

    For example, in order to process and treat all messages as JSON objects pass


- __listen(integer:port [, string:hostname])__

    Makes the server listen for incoming web socket requests on `port` and - 
    optionally - `hostname`.


- __listen(http(s).Server)__

    Makes the server listen for incoming web socket request on an existing 
    instance of `http.Server` or `https.Server`.


- __remotes([function:filter])__

    Returns a array with all remotes that are currently connected to the server 
    (meaning that only accepted remotes will be contained in the array).

    Filter is an optional function behaving much like `Array.filter` in that it 
    filters the remotes before returning them.


- __send(any:message [, function:filter])__

    Sends a message to all *accepted* remotes on the server. 

    Filter is an optional function behaving much like `Array.filter` in that it 
    filters the remotes before messaging them.

    Returns the number of remotes the message was sent to.


- __close([string:reason])__
    
    Closes the server by preventing any furhter connections to be made and 
    invokes the `close` method of all the server's remotes.

    The optional `reason` is only supported in newer versions of the WebSocket 
    protocol and will be available as the `reason` property on the WebSocket's 
    close event.

    Returns `false` in case the server is already closed.


#### Events

- __connection__ => *function(remote)*

    Emitted when a `remote` connects to the server.


- __accepted__ => *function(remote)*

    Emitted when the server accepts a `remote`.


- __rejected__ => *function(remote)*

    Emitted when the server rejects a `remote`.


- __closed__ => *function(remote, closedByRemote)*

    Emitted when a `remote` disconnects from the server.

    `closedByRemote` will be `true` in the case that the disconnect was initiated 
    by the remote.


- __close__

    Emitted when the server stops listening for new connections.



### Remotes

Each remote encapsulate a single web socket connection to a client.

A remote is only recognized as being connected after it was accepted.

#### Properties

- __id__ *string*


- __address__  *string*

    Address of the underlying socket connection.


- __port__  *integer*

    Port of the underlying socket connection.


- __bytesSend__  *integer*

    Number of raw bytes (including protocol overhead) send over the socket.

- __bytesReceived__  *integer*

    Number of raw bytes (including protocol overhead) send over the socket.


- __version__ *integer*

    The version of the underlying WebSocket protocol for this remote.


#### Methods

- __accept()__ => *boolean*

    Accepts a pending remote connection, which adds it to the list of connected 
    remotes on the server.

    Once a remote is accepted messages can be send to it.
    
    Returns `true` in case the remote was accepted or `false` in case it could 
    not be accepted.


- __reject([string:reason])__ => *boolean*

    Rejects a pending remote and sends an optional `reason` as a message before 
    closing the connection. 

    Returns `true` in case the remote was rejected or `false` in case it could 
    not be rejected.


- __isPending()__ => *true*
    
    Returns whether or not the connection is pending.

    Pending means that the connection is yet to be either accepted or rejected.


- __info()__ => *object*

    Returns a object containing connection specific information:

        {
            ip: "127.0.0.1"
            port: 35758,
            bytesSend: 123,
            bytesReceived: 456
        }

    > Note: The returned object is a reference.


- __send(any:message)__ => *boolean*
    
    Sends a `message` to the remote.

    Returns `true` in case the message was send or `false` in case it could 
    not be send.


- __close([any:reason])__

    Closes the connection to the remote. 
    
    The optional `reason` is only supported in newer versions of the WebSocket 
    protocol and will be available as the `reason` property on the WebSocket's 
    close event.

    Returns `true` in case the connection was closed or `false` in case it 
    was not.


#### Events

- __message__ => *function(any:message)*

    Emitted when a `message` is received from a remote. 
    

- __close__ => *function(boolean:closedByRemote)*

    Emitted when the remote is disconnected from the server.

    `closedByRemote` will be `true` in the case that the disconnect was initiated 
    by the remote.



### Client

A thin wrapper around the browser side `WebSocket` object, providing a 
interface that is consistent with the lithium server.


#### Methods

- __lithium.Client([function:callback] [, function:encoder, function:decoder])__ *(Constructor)*

    The optional `callback` argument is shortcut for the `connection` event.

    If both the `encoder` and `decoder` arguments are present, messages will be 
    passed to these functions when being send / received.

    For example, in order to process and treat all messages as JSON objects pass


- __connect(integer:port [, string:hostname])__

    Connects to the server at `port` and - optionally - `hostname`.

    
- __isConnected()__  => *boolean*

    Returns `true` in case the client is currently connected to the server.


- __send(any:message)__ => *boolean*

    Sends a `message` to the remote.

    Returns `true` in case the message was send or `false` in case it could 
    not be send.


- __close()__ => *boolean*

    Closes the connection to the server.

    Returns `false` in case the connection is already closed.


#### Events

- __connection__

    Emitted once the connection to the server is established.


- __message__ => *function(any:message)*

    Emitted when a `message` is received from the server. 


- __close__ => *function(boolean:closedByServer)*

    Emitted when the client is disconnected from the server.

    In the case that the server has initiated the close of the connection, 
    the value of `closedByServer` will be `true`.


## License

__Lithium__ is licensed under MIT.


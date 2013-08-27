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
var client = new lithium.Client(function(client) {

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

- __Constructor - lithium.Server([Function:callback] [, Function:encoder, Function:decoder])__

    Creates a new server instance.

    The optional `callback` argument is shortcut for the `connection` event.

    If both the `encoder` and `decoder` arguments are present, messages will be 
    passed to these functions when being send / received.

    For example, in order to process and treat all messages as JSON objects pass


- __listen(Number:port [, String:hostname])__

    Makes the server listen for incoming web socket requests on `port` and - 
    optionally - `hostname`.


- __listen(http(s).Server)__

    Makes the server listen for incoming web socket request on an existing 
    instance of `http.Server` or `https.Server`.


- __Boolean - isRunning()__

    Returns whether the server is running (listening for new connections).


- __Array[Remote] - remotes([Function:filter])__

    Returns a array with all remotes that are currently connected to the server 
    (meaning that only accepted remotes will be contained in the array).

    Filter is an optional function behaving much like `Array.filter` in that it 
    filters the remotes before returning them.


- __Integer - send(Any:message [, Function:filter])__

    Sends a message to all *accepted* remotes on the server. 

    Filter is an optional function behaving much like `Array.filter` in that it 
    filters the remotes before messaging them.

    Returns the number of remotes the message was sent to.


- __Boolean - close([string:reason])__
    
    Closes the server by preventing any furhter connections to be made and 
    invokes the `close` method of all the server's remotes.

    The optional `reason` is only supported in newer versions of the WebSocket 
    protocol and will be available as the `reason` property on the WebSocket's 
    close event.

    Returns `false` in case the server is already closed.


#### Events

- __connection(Remote:remote)__

    Emitted when a `remote` connects to the server.


- __accepted(Remote:remote)__

    Emitted when the server accepts a `remote`.


- __rejected(Remote:remote)__

    Emitted when the server rejects a `remote`.


- __closed(Remote:remote, Boolean:closedByRemote)__

    Emitted when a `remote` disconnects from the server.

    `closedByRemote` will be `true` in the case that the disconnect was initiated 
    by the remote.


- __close()__

    Emitted when the server stops listening for new connections.



### Remotes

Each remote encapsulate a single web socket connection to a client.

A remote is only recognized as being connected after it was accepted.

#### Properties

- __String - id__


- __String - address__

    Address of the underlying socket connection.


- __Intege - port__

    Port of the underlying socket connection.


- __Integer - bytesSend__

    Number of raw bytes (including protocol overhead) send over the socket.


- __Integer - bytesReceived__

    Number of raw bytes (including protocol overhead) send over the socket.


- __Integer - version__

    The version of the underlying WebSocket protocol for this remote.


#### Methods

- __Boolean - accept()__

    Accepts a pending remote connection, which adds it to the list of connected 
    remotes on the server.

    Once a remote is accepted messages can be send to it.
    
    Returns `true` in case the remote was accepted or `false` in case it could 
    not be accepted.


- __Boolean - reject([String:reason])__

    Rejects a pending remote and sends an optional `reason` as a message before 
    closing the connection. 

    Returns `true` in case the remote was rejected or `false` in case it could 
    not be rejected.


- __Boolean - isPending()__
    
    Returns whether or not the connection is pending.

    Pending means that the connection is yet to be either accepted or rejected.


- __Boolean - send(any:message)__
    
    Sends a `message` to the remote.

    Returns `true` in case the message was send or `false` in case it could 
    not be send.


- __Boolean - close([Any:reason])__

    Closes the connection to the remote. 
    
    The optional `reason` is only supported in newer versions of the WebSocket 
    protocol and will be available as the `reason` property on the WebSocket's 
    close event.

    Returns `true` in case the connection was closed or `false` in case it 
    was not.


#### Events

- __message(Any:message)__

    Emitted when a `message` is received from a remote. 
    

- __close(Boolean:closedByRemote)__

    Emitted when the remote is disconnected from the server.

    `closedByRemote` will be `true` in the case that the disconnect was initiated 
    by the remote.



### Client

A thin wrapper around the browser side `WebSocket` object, providing a 
interface that is consistent with the lithium server.


#### Methods

- __Constructor - lithium.Client([Function:callback] [, Function:encoder, Function:decoder])__ *(Constructor)*

    The optional `callback` argument is shortcut for the `connection` event.

    If both the `encoder` and `decoder` arguments are present, messages will be 
    passed to these functions when being send / received.

    For example, in order to process and treat all messages as JSON objects pass


- __Boolean - connect(Integer:port [, String:hostname])__

    Connects to the server at `port` and - optionally - `hostname`.

    
- __Boolean - isConnected()__

    Returns `true` in case the client is currently connected to the server.


- __Boolean - wasConnected()__

    Returns `true` in case the client was connected to the server before it closed.


- __Boolean - send(any:message)__

    Sends a `message` to the remote.

    Returns `true` in case the message was send or `false` in case it could 
    not be send.


- __Boolean - close()__

    Closes the connection to the server.

    Returns `false` in case the connection is already closed.


#### Events

- __connection()__

    Emitted once the connection to the server is established.


- __message(Any:message)__

    Emitted when a `message` is received from the server. 


- __close(Boolean:closedByServer, String:reason, Integer:code)__

    Emitted when the client is disconnected from the server.

    In the case that the server has initiated the close of the connection, 
    the value of `closedByServer` will be `true`.


## License

__Lithium__ is licensed under MIT.


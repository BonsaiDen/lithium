# Lithium

__Lithium__ is a data centric WebSocket library for both Node.js and the Browser.


## Installation
    
#### Client

    <script type="text/javascript" src="lithium.client.js"></script>

#### Server

    npm install lithium


## Usage

Below is an example of a simple, JSON based echo server.

#### Client

    var client = lithium.Client(function(client) {

        client.on('message', function(msg) {
            ...
        });

        client.send({
            msg: 'Hello World'
        });

    }, JSON.stringify, JSON.parse);


#### Server

    var lithium = require('lithium');

    var server = new lithium.Server(function(remote) {

        remote.accept();
        remote.on('message', function(msg) {
            remote.send(msg);
        });

    }, JSON.stringify, JSON.parse);
    
    server.listen(8000);


## Features

- WebSocket Protocols (v75, v76, hixie and hyby)
- Binary Message Support
- Consistent API on both Server and Client
- No dependencies


## API

### Server

A `http.Server`-like interface for managing web socket connections.


#### Methods

- __lithium.Server([callback] [, encoder, decoder])__ *(Constructor)*

    Creates a new server instance.

    The optional `callback` argument is shortcut for the `connection` event.

    If both the `encoder` and `decoder` arguments are present, messages will be 
    passed to these functions when being send / received.

    For example, in order to process and treat all messages as JSON objects pass


- __listen(port [, hostname])__

    Makes the server listen for incoming web socket requests on `port` and - 
    optionally - `hostname`.


- __listen(http(s).Server)__

    Makes the server listen for incoming web socket request on an existing 
    instance of `http.Server` or `https.Server`.


- __remotes([filter])__

    Returns a array with all remotes that are currently connected to the server 
    (meaning that only accepted remotes will be contained in the array).

    Filter is an optional function behaving much like `Array.filter` in that it 
    filters the remotes before returning them.


- __send(message [, filter])__

    Sends a message to all *accepted* remotes on the server. 

    Filter is an optional function behaving much like `Array.filter` in that it 
    filters the remotes before messaging them.


- __close([message])__
    
    Closes the server by preventing any furhter connections to be made and 
    invokes the `close` method of all the server's remotes.

    Also sends an optional `message` to all *accepted* remotes before closing 
    their connections. 


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

- __id__

- __address__

- __port__

- __bytesSend__

- __bytesReceived__

- __version__


#### Methods

- __accept()__

    Accepts a pending remote connection, which adds it to the list of connected 
    remotes on the server.

    Once a remote is accepted messages can be send to it.
    
    Returns `true` in case the remote was accepted or `false` in case it could 
    not be accepted.


- __reject([reason])__

    Rejects a pending remote and sends an optional `reason` as a message before 
    closing the connection. 

    Returns `true` in case the remote was rejected or `false` in case it could 
    not be rejected.


- __isPending()__
    
    Returns whether or not the connection is pending.


- __info()__

    Returns a object containing connection specific information:

        {
            ip: "127.0.0.1"
            port: 35758,
            bytesSend: 123,
            bytesReceived: 456
        }

    > Note: The returned object is a reference.


- __send(message)__
    
    Sends a `message` to the remote.

    Returns `true` in case the message was send or `false` in case it could 
    not be send.


- __close([message])__

    Closes the connection to the remote, and optional `message` can be send 
    right before the connection is being closed.

    Returns `true` in case the connection was closed or `false` in case it 
    was not.


#### Events

- __message__ => *function(message)*

    Emitted when a `message` is received from a remote. 
    

- __close__ => *function(closedByRemote)*

    Emitted when the remote is disconnected from the server.

    `closedByRemote` will be `true` in the case that the disconnect was initiated 
    by the remote.



### Client

A thin wrapper around the browser side `WebSocket` object, providing a 
interface that is consistent with the lithium server.


#### Methods

- __lithium.Client([callback] [, encoder, decoder])__ *(Constructor)*

    The optional `callback` argument is shortcut for the `connection` event.

    If both the `encoder` and `decoder` arguments are present, messages will be 
    passed to these functions when being send / received.

    For example, in order to process and treat all messages as JSON objects pass


- __connect(port [, hostname])__

    Connects to the server at `port` and - optionally - `hostname`.

    
- __isConnected()__ 

    Returns `true` in case the client is currently connected to the server.


- __send(message)__

    Sends a `message` to the remote.

    Throws an error in case the connection is not yet open or was closed.


- __close([message])__

    Closes the connection to the server, and optional `message` can be send 
    right before the connection is being closed.

    Throws an error in case the connection is already closed.


#### Events

- __connection__

    Emitted once the connection to the server is established.


- __message__ => *function(message)*

    Emitted when a `message` is received from the server. 


- __close__ => *function(closedByServer)*

    Emitted when the client is disconnected from the server.

    In the case that the server has initiated the close of the connection, 
    the value of `closedByServer` will be `true`.


## License

__Lithium__ is licensed under MIT.


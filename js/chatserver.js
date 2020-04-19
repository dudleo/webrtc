//#!/usr/bin/env node
//
// WebSocket chat server
// Implemented using Node.js
//
// Requires the websocket module.
//
// WebSocket and WebRTC based multi-user chat sample with two-way video
// calling, including use of TURN if applicable or necessary.
//
// This file contains the JavaScript code that implements the server-side
// functionality of the chat system, including user ID management, message
// reflection, and routing of private messages, including support for
// sending through unknown JSON objects to support custom apps and signaling
// for WebRTC.
//
// Requires Node.js and the websocket module (WebSocket-Node):
//
//  - http://nodejs.org/
//  - https://github.com/theturtle32/WebSocket-Node
//
// To read about how this sample works:  http://bit.ly/webrtc-from-chat
//
// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

"use strict";

var http = require('http');
var https = require('https');
var fs = require('fs');
var WebSocketServer = require('websocket').server;

// Pathnames of the SSL key and certificate files to use for
// HTTPS connections.

const keyFilePath = "key.pem";
const certFilePath = "cert.pem";

// Used for managing the text chat user list.

var connections = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

// Scans the list of users and see if the specified name is unique. If it is,
// return true. Otherwise, returns false. We want all users to have unique
// names.
function checkUniqueUsername(name) {
  var isUnique = true;
  var i;

  for (i=0; i<connections.length; i++) {
    if (connections[i].username === name) {
      isUnique = false;
      break;
    }
  }
  return isUnique;
}

// Sends a message (which is already stringified JSON) to a single
// user, given their username. We use this for the WebRTC signaling,
// and we could use it for private text messaging.
function sendMsgToUser(target_username, msgString) {
  var i;
  for (i=0; i<connections.length; i++) {
    if (connections[i].username === target_username) {
      connections[i].sendUTF(msgString);
      break;
    }
  }
}

function sendMsgToAllOtherUsers(source_username, msgString){
  var i;
  for (i=0; i<connections.length; i++) {
    if (connections[i].username !== source_username) {
      connections[i].sendUTF(msgString);
    }
  }
}

// Scan the list of connections and return the one for the specified
// clientID. Each login gets an ID that doesn't change during the session,
// so it can be tracked across username changes.
function getConnectionFromID(clientID) {
  var connection = null;
  var i;
  for (i=0; i<connections.length; i++) {
    if (connections[i].clientID === clientID) {
      connection = connections[i];
      break;
    }
  }

  return connection;
}

// Sends a "userlist" message to all chat members. This is a cheesy way
// to ensure that every join/drop is reflected everywhere. It would be more
// efficient to send simple join/drop messages to each user, but this is
// good enough for this simple example.
function sendUserListToAll() {

  var userListMsg = {
    type: "userlist",
    users: []
  };

  var i;
  // Add the users to the list
  for (i=0; i<connections.length; i++) {
    userListMsg.users.push(connections[i].username);
  }

  var userListMsgStr = JSON.stringify(userListMsg);
  var i;
  for (i=0; i<connections.length; i++) {
    connections[i].sendUTF(userListMsgStr);
  }
}


// Try to load the key and certificate files for SSL so we can
// do HTTPS (required for non-local WebRTC).

var httpsOptions = {
  key: null,
  cert: null, 
  passphrase: 'PaulanerSpezi'
};

try {
  httpsOptions.key = fs.readFileSync(keyFilePath);
  try {
    httpsOptions.cert = fs.readFileSync(certFilePath);
  } catch(err) {
    httpsOptions.key = null;
    httpsOptions.cert = null;
  }
} catch(err) {
  httpsOptions.key = null;
  httpsOptions.cert = null;
}

// If we were able to get the key and certificate files, try to
// start up an HTTPS server.
var webServer = null;

try {
  if (httpsOptions.key && httpsOptions.cert) {
    console.log('Status: HTTPS WebServer');
    console.log(httpsOptions);
    webServer = https.createServer(
      httpsOptions,
      handleWebRequest
    );
  }
} catch(err) {
  console.log('Status: HTTPS WebServer failed.');
  console.log(err);
  webServer = null;
}

if (!webServer) {
  console.log('Status: HTTP WebServer');
  try {
    webServer = http.createServer(
      {},
      handleWebRequest
    );
  } catch(err) {
    webServer = null;
    console.log('Error: creating HTTP(s) server... \n' + err.toString());
  }
}


// Our HTTPS server does nothing but service WebSocket
// connections, so every request just returns 404. Real Web
// requests are handled by the main server on the box. If you
// want to, you can return real HTML here and serve Web content.

function handleWebRequest(request, response) {
  console.log ("Status: Received web request for " + request.url);
  response.writeHead(404);
  response.end();
}

// Spin up the HTTPS server on the port assigned to this sample.
// This will be turned into a WebSocket port very shortly.

webServer.listen(8090, function() {
  console.log("Status: Server is listening on port 8090");
});

// Create the WebSocket server by converting the HTTPS server into one.

var webSocketServer = new WebSocketServer({
  httpServer: webServer,
  autoAcceptConnections: false
});

if (!webSocketServer) {
  console.log("Error: Unable to create WebSocket server!");
}

// Set up a "connect" message handler on our WebSocket server. This is
// called whenever a user connects to the server's port using the
// WebSocket protocol.

webSocketServer.on('request', function(request) {

  console.log("Status: New websocket request.");

  if (request['resourceURL']['query']['token'] !== '0730722221'){
    console.log('Status: rejected because wrong token.')
    var connection = request.reject(403, 'no reason');
    
  }
  else{
    console.log('Status: accepting request.')
  // Accept the request and get a connection.
  var connection = request.accept("json", request.origin);

  // Add the new connection to our list of connections.
  //log("Connection accepted from " + connections.remoteAddress + ".");
  connections.push(connection);

  connection.clientID = nextID;
  nextID++;

  // Send the new client its token; it send back a "username" message to
  // tell us what username they want to use.

  var msg = {
    type: "id",
    id: connection.clientID
  };
  connection.sendUTF(JSON.stringify(msg));

  // Set up a handler for the "message" event received over WebSocket. This
  // is a message sent by a client, and may be text to share with other
  // users, a private message (text or signaling) for one user, or a command
  // to the server.

  connection.on('message', function(msgStringIn) {
    if (msgStringIn.type === 'utf8') {
      //console.log("Status: Received Message: \n" + msgStringIn.utf8Data);
      
      // Process incoming data.

      var msgIn = JSON.parse(msgStringIn.utf8Data);

      // this === getConnectionFromID(msgIn.id) (true)
      var connect = getConnectionFromID(msgIn.id);
      
      // Take a look at the incoming object and act on it based
      // on its type. Unknown message types are passed through,
      // since they may be used to implement client-side features.
      // Messages with a "target" property are sent only to a user
      // by that name.

      switch(msgIn.type) {
        // Public, textual message
        case "video-offer":
        case "video-answer":
          console.log('Status: message forwarding.')
          sendMsgToUser(msgIn.target, JSON.stringify(msgIn));
          break;

        // Username change
        case "username":
          var nameChanged = false;
          var origName = msgIn.name;          

          // Ensure the name is unique by appending a number to it
          // if it's not; keep trying that until it works.
          while (!checkUniqueUsername(msgIn.name)) {
            msgIn.name = origName + appendToMakeUnique;
            appendToMakeUnique++;
            nameChanged = true;
          }

          // If the name had to be changed, we send a "rejectusername"
          // message back to the user so they know their name has been
          // altered by the server.
          if (nameChanged) {
            var changeMsg = {
              id: msgIn.id,
              type: "rejectusername",
              name: msgIn.name
            };
            connect.sendUTF(JSON.stringify(changeMsg));
          }

          // Set this connection's final username and send out the
          // updated user list to all users. Yeah, we're sending a full
          // list instead of just updating. It's horribly inefficient
          // but this is a demo. Don't do this in a real app.
          if(!connect.username){
            console.log('Status: New user');
            connect.username = msgIn.name;
            var newUserMsg = {
              type: "new-user",
              name: connect.username
            };
            sendMsgToAllOtherUsers(connect.username, JSON.stringify(newUserMsg));
          }
          else{
            connect.username = msgIn.name;  
          }

          
          //sendUserListToAll();
          break;
      }
    }
  });

  // Handle the WebSocket "close" event; this means a user has logged off
  // or has been disconnected.
  connection.on('close', function(reason, description) {
    // First, remove the connection from the list of connections.
    connections = connections.filter(function(el, idx, ar) {
      return el.connected;
    });

    // Now send the updated user list. Again, please don't do this in a
    // real application. Your users won't like you very much.
    // sendUserListToAll();

    // Build and output log output for close information.

    var logMessage = "Status: Connection closed: " + connection.remoteAddress + " (" +
                     reason;
    if (description !== null && description.length !== 0) {
      logMessage += ": " + description;
    }
    logMessage += ")";
    console.log(logMessage);
  });

  }
});

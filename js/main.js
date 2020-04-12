

// helps to write cleaner code (e.g. prevents use of undeclared variables)
'use strict';

var sigConnection = null;
var clientID = 0;

function sendToServer(msgJSON) {
  var msgString = JSON.stringify(msgJSON);
  sigConnection.send(msgString);
}

function sendUsernameToServer() {
  console.log('Status: sending username to server.')
  var username = $('.input-username').val();

  sendToServer({
    name: username,
    id: clientID,
    type: "username"
  });
}


function connect(){
  var serverUrl;
  // If this is an HTTPS connection, we have to use a secure WebSocket
  // connection too, so add another "s" to the scheme.
  if (document.location.protocol === "https:") {
    serverUrl = 'wss://localhost:8090'
  }
  else{
    serverUrl = 'ws://localhost:8090'
  }

  console.log('Status: Connecting to server: ' + serverUrl);
  sigConnection = new WebSocket(serverUrl, "json");


  sigConnection.onopen = function(){
    console.log('Status: signal-connection opened.');
    $('.button-connect-signaling').hide();
  };

  sigConnection.onmessage = async function(msgString){
    var msgJSONIn = JSON.parse(msgString.data);

    console.log(msgJSONIn);

    switch(msgJSONIn.type) {
      case "id":
        clientID = msgJSONIn.id;
        sendUsernameToServer();
        break;

      case "rejectusername":
        $('.input-username').val(msgJSONIn.name);

      case "userlist":      // Received an updated user list
        // handle user list: type: userlist | users: ["user1", "user2"]
        // add to dropdown for call
        var dropdownOptionsHTML = ""
        msgJSONIn.users.forEach(function(username) {
          $('.dropdown-option-default').find('label').text(username);
          var dropdownOptionHTML = $('.dropdown-option-default').html();

          dropdownOptionsHTML += dropdownOptionHTML;  
        });
        $('.input-remote-username-dropdown').find('.dropdown-content').html(dropdownOptionsHTML);
        $('.dropdown-option').mousedown(function(){
          console.log('clicked remote username: ' + $(this).find('label').text());
          $('.input-remote-username').val($(this).find('label').text());


        });
        break;

      case "video-offer":

        console.log('Status: video-offer received: \n' + msgJSONIn);
        var offer = msgJSONIn.sdp;
        var answer = await createAnswer(offer);

        var msgJSONOut = {
          name: msgJSONIn.target,
          id: clientID,
          type: 'video-answer',
          target: msgJSONIn.name,
          sdp: answer
        };

        console.log('Status: sending answer-offer: ', msgJSONOut);

        sendToServer(msgJSONOut);
        break;
      case "video-answer":
        console.log('Status: video-answer received: \n' + msgJSONIn);

        var answer = msgJSONIn.sdp;

        acceptAnswer(answer);
        break;
    }
  };

  sigConnection.onclose = function(){
    console.log('Status: signal-connection closed.');
    $('.button-connect-signaling').show();
  }

  sigConnection.onerror = function(evt) {
    console.log('Status: signal-connection error. \n' + evt);
  }
}


$('.button-connect-signaling').mousedown(function(){
  console.log('Status: Button button-connect-signaling clicked.');
  connect();
});

$('.button-call').mousedown(async function(){

  var username = $('.input-username').val();
  var remoteUsername = $('.input-remote-username').val();


  // create peerconnection
  // create offer
  var offer = await createOffer();

  var msgJSON = {
    name: username,
    id: clientID,
    type: 'video-offer',
    target: remoteUsername,
    sdp: offer
  };


  console.log('Status: sending video-offer: ', msgJSON);

  sendToServer(msgJSON);


});




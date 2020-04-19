// helps to write cleaner code (e.g. prevents use of undeclared variables)
'use strict';


var configuration = {
	iceServers: 
	[{
		 urls: 'stun:stun.l.google.com:19302'
	}]
};

console.log(configuration);

var connection1 = new RTCPeerConnection();
var channel1 = connection1.createDataChannel("channel1");
console.log('connection1 created');

var connection2 = new RTCPeerConnection();
console.log('connection2 created');

connection1.addEventListener('connectionstatechange', event => {
    if (connection1.connectionState === 'connected') {
        console.log('connection1 connected!')
        // Peers connected!
    }
});


connection2.addEventListener('connectionstatechange', event => {
    if (connection2.connectionState === 'connected') {
        console.log('connection2 connected!')
        // Peers connected!
    }
});

/*
connection1.addEventListener('icecandidate', async event => {
	if (event.candidate) {
		try {
			console.log('connection1');
      console.log('candidate: ', event.candidate);
      await connection2.addIceCandidate(event.candidate);

			console.log('connection1 connectionState: ', connection1.connectionState);
			console.log('connection2 connectionState: ', connection2.connectionState);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
});

connection2.addEventListener('icecandidate', async event => {
	if (event.candidate) {
		try {
			console.log('connection2');
      console.log('candidate: ', event.candidate);
      await connection1.addIceCandidate(event.candidate);

			console.log('connection1 connectionState: ', connection1.connectionState);
			console.log('connection2 connectionState: ', connection2.connectionState);
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
});
*/

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createOffer(){

	var offer1 = await connection1.createOffer();	
  
	await connection1.setLocalDescription(offer1);
	
	// send offer1...
  // waiting here would mean the local ICE candidates can be sent with the description
  //await timeout(1000);
  //offer1 = connection1.localDescription;
  
	await connection2.setRemoteDescription(new RTCSessionDescription(offer1));
  
	var answer2 = await connection2.createAnswer();
	await connection2.setLocalDescription(answer2);

	// return answer2...
  // waiting here would mean the local ICE candidates can be sent with the description
  //await timeout(1000);
  //answer2 = connection2.localDescription;
  
	await connection1.setRemoteDescription(new RTCSessionDescription(answer2));

	
	console.log('connection1: ', connection1);
	console.log('connection2: ', connection2); 
  

	//console.log('connection1 connectionState: ', connection1.connectionState);
	//console.log('connection2 connectionState: ', connection2.connectionState);
}
createOffer();

//setTimeout(function() {
//  //your code to be executed after 1 second
//  console.log('connection1: ', connection1);
//  console.log('connection2: ', connection2); 
//}, 500);

async function getUserMediaStream(){
    const constraints = {
      audio: false,
      video: true
    };

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){
        // pull native DOM element from jQuery object
        var video = $('.myvideo')[0];
        video.srcObject = stream;
        $('.myvideo').on('loadedmetadata', function(e) {
          console.log('loadedmetadata...');
        });
    })
    .catch(function(err){
      console.log(err);
    });
}

getUserMediaStream();



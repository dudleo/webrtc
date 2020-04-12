// helps to write cleaner code (e.g. prevents use of undeclared variables)
'use strict';



var rtcConnection = null;
var localStream = null;

var configuration = {
	iceServers: 
	[{
		 urls: 'stun:stun.l.google.com:19302'
	}]
};


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rtc_onconnectionstatechange_cb(event){
	console.log('rtcConnection state changed: ' + rtcConnection.connectionState);
}


// receive remote source
function rtc_ontrack_cb(event) {
	console.log('rtcConnection remote track received.');
	// pull native DOM element from jQuery object
    var remoteVideo = $('.remoteVideo')[0];
	remoteVideo.srcObject = event.streams[0];
}


async function getUserMediaStream(){
    const constraints = {
      audio: true,
      video: true
    };

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){
        // pull native DOM element from jQuery object
        var localVideo = $('.localVideo')[0];
        localVideo.srcObject = stream;
        localStream = stream;

        $('.myvideo').on('loadedmetadata', function(e) {
          console.log('loadedmetadata...');
        });
    })
    .catch(function(err){
      console.log(err);
    });
}


async function createOffer(){
	rtcConnection = new RTCPeerConnection(configuration);

	rtcConnection.onconnectionstatechange = rtc_onconnectionstatechange_cb;
	rtcConnection.ontrack = rtc_ontrack_cb;

    localStream.getTracks().forEach(
    	(track) => rtcConnection.addTrack(track, localStream));

	var offer = await rtcConnection.createOffer();	
  
	await rtcConnection.setLocalDescription(offer);

	console.log(rtcConnection.iceGatheringState);
	// wait for ICE to gather all routes
	while(rtcConnection.iceGatheringState != 'complete'){
		await timeout(100);
		console.log(rtcConnection.iceGatheringState);
	}

	offer = rtcConnection.localDescription;

	return offer;
}

async function createAnswer(offer){
	rtcConnection = new RTCPeerConnection(configuration);

	rtcConnection.onconnectionstatechange = rtc_onconnectionstatechange_cb;
	rtcConnection.ontrack = rtc_ontrack_cb;

	await rtcConnection.setRemoteDescription(new RTCSessionDescription(offer));
  
    var answer = await rtcConnection.createAnswer();
    
    await rtcConnection.setLocalDescription(answer);

    console.log(rtcConnection.iceGatheringState);
	// wait for ICE to gather all routes
	while(rtcConnection.iceGatheringState != 'complete'){
		await timeout(100);
		console.log(rtcConnection.iceGatheringState);
	}

	answer = rtcConnection.localDescription;

	return answer;

}

async function acceptAnswer(answer){
	await rtcConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

getUserMediaStream();









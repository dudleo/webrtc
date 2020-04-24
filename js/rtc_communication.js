// helps to write cleaner code (e.g. prevents use of undeclared variables)
'use strict';


var rtcConnections = [];
var rtcUsernames = [];
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


function video_mousedown_cb(){
  var clickedVideo = this;
  var mainVideo = $('.main_video')[0];
  mainVideo.srcObject = clickedVideo.srcObject;

}

async function rtc_onicecandidate_cb(event){
	var candidate = event.candidate;

	var rtcConnectionID = 0; 
	var i = 0;
	for (i=0; i<rtcConnections.length; i++) {
		if (rtcConnections[i] === this) {
		  rtcConnectionID = i;
		  break;
		}
	}
	var remoteUsername = rtcUsernames[rtcConnectionID];
	
	sendICECandidate(candidate, remoteUsername);
}

// receive remote source
function rtc_ontrack_cb(event) {
	console.log('rtcConnection remote track received.');
	// pull native DOM element from jQuery object
	var rtcConnectionID = 0; 
	var i = 0;
	for (i=0; i<rtcConnections.length; i++) {
		if (rtcConnections[i] === this) {
		  rtcConnectionID = i;
		  break;
		}
	}
	var found_remote_video = false;
	$('.remote_video').each( function(){
		if($(this).attr('id') === 'rtc' + rtcConnectionID){

			console.log('Status: found remote video');
			console.log($(this));
			var remoteVideo = $(this)[0];
			console.log(event.streams);
			console.log(remoteVideo);

			remoteVideo.srcObject = event.streams[0];
			found_remote_video = true;

		}
	});
	

	if (found_remote_video === false){
		console.log('Status: add new video');
		var newRemoteVideo = $('.remote_video_default').html();
		console.log('new-remote-video: ' + newRemoteVideo);
		$('.videos').append(newRemoteVideo);

		var remoteVideo = $('.videos').find('.remote_video_new')[0];
		console.log('remote-video: ' + remoteVideo);
		remoteVideo.srcObject = event.streams[0];
		
		$('.videos').find('.remote_video_new').attr('id', 'rtc' + rtcConnectionID);
		$('.videos').find('.remote_video_new').css('display', 'initial');

		$('.videos').find('.remote_video_new').mousedown(video_mousedown_cb);

		$('.videos').find('.remote_video_new').removeClass('remote_video_new');
	}
}


async function getUserMediaStream(){
    const constraints = {
      audio: true,
      video: true
    };

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){
        // pull native DOM element from jQuery object
        var localVideo = $('.local_video')[0];
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


async function createOffer(remoteUsername){
	rtcConnection = new RTCPeerConnection(rtcConnections);

	rtcConnections.push(rtcConnection);
	rtcUsernames.push(remoteUsername);
	
	rtcConnection.onconnectionstatechange = rtc_onconnectionstatechange_cb;
	rtcConnection.ontrack = rtc_ontrack_cb;
	rtcConnection.onicecandidate = rtc_onicecandidate_cb;

    localStream.getTracks().forEach(
    	(track) => rtcConnection.addTrack(track, localStream));

	var offer = await rtcConnection.createOffer();	
  
	await rtcConnection.setLocalDescription(offer);

	console.log(rtcConnection.iceGatheringState);
	// wait for ICE to gather all routes
	/*
	while(rtcConnection.iceGatheringState != 'complete'){
		await timeout(100);
		console.log(rtcConnection.iceGatheringState);
	}
	*/
	offer = rtcConnection.localDescription;

	return offer;
}

async function createAnswer(offer, remoteUsername){
	rtcConnection = new RTCPeerConnection(rtcConnections);

	rtcConnections.push(rtcConnection);
	rtcUsernames.push(remoteUsername);

	rtcConnection.onconnectionstatechange = rtc_onconnectionstatechange_cb;
	rtcConnection.ontrack = rtc_ontrack_cb;

	localStream.getTracks().forEach(
    	(track) => rtcConnection.addTrack(track, localStream));

	await rtcConnection.setRemoteDescription(new RTCSessionDescription(offer));
  
    var answer = await rtcConnection.createAnswer();
    
    await rtcConnection.setLocalDescription(answer);

    console.log(rtcConnection.iceGatheringState);
	// wait for ICE to gather all routes
	/*
	while(rtcConnection.iceGatheringState != 'complete'){
		await timeout(100);
		console.log(rtcConnection.iceGatheringState);
	}
	*/

	answer = rtcConnection.localDescription;

	return answer;

}

async function acceptAnswer(answer, remoteUsername){
	var i;
	for (i=0; i<rtcUsernames.length; i++) {
		if (rtcUsernames[i] === remoteUsername) {
		  await rtcConnections[i].setRemoteDescription(new RTCSessionDescription(answer));
		  break;
		}
	}
	
}

async function acceptICECandidate(candidate, remoteUsername){
	var i;
	for (i=0; i<rtcUsernames.length; i++) {
		if (rtcUsernames[i] === remoteUsername) {
		  await rtcConnections[i].addIceCandidate(candidate);
		  break;
		}
	}
}

function sendICECandidate(candidate, remoteUsername){
	var username = $('.input-username').val();

	var msgJSON = {
	    name: username,
	    type: 'new-ice-candidate',
	    target: remoteUsername,
	    candidate: candidate
	};


	console.log('Status: sending new ice candidate: ', msgJSON);

	sendToServer(msgJSON);
}

getUserMediaStream();









// Config variables: change them to point to your own servers
const SIGNALING_SERVER_URL = 'https://192.168.1.189:9999';
const TURN_SERVER_URL = 'localhost:3478';
const TURN_SERVER_USERNAME = 'username';
const TURN_SERVER_CREDENTIAL = 'credential';
// WebRTC config: you don't have to change this for the example to work
// If you are testing on localhost, you can just use PC_CONFIG = {}
const PC_CONFIG = {/*
  iceServers: [
    {
      urls: 'turn:' + TURN_SERVER_URL + '?transport=tcp',
      username: TURN_SERVER_USERNAME,
      credential: TURN_SERVER_CREDENTIAL
    },
    {
      urls: 'turn:' + TURN_SERVER_URL + '?transport=udp',
      username: TURN_SERVER_USERNAME,
      credential: TURN_SERVER_CREDENTIAL
    }
  ]*/
};

// Signaling methods
let socket = io(SIGNALING_SERVER_URL, { autoConnect: false });

socket.on('data', (data) => {
  console.log('Data received: ',data);
  handleSignalingData(data);
});

socket.on('ready', () => {
  console.log('Ready');
  // Connection with signaling server is ready, and so is local stream
  createPeerConnection();
  sendOffer();
});

let sendData = (data) => {
  socket.emit('data', data);
};

// WebRTC methods
let pc;
let dc;

let getLocalStream = () => {
socket.connect();
console.log("Connecting...");
}

function handleSendChannelStatusChange(data)
{
    console.log('Received something');
    console.log(data);
}

function add_text(text)
{
  var el = document.createElement("ion-item");
  var txtNode = document.createTextNode(text);
  el.appendChild(txtNode);
  document.getElementById('remotetext').appendChild(el);
}


function draw_dots(mesh, canvas_id="local") {
  var canvas = document.getElementById(canvas_id);
  var canvasWidth = 400;
  var canvasHeight = 400;
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var canvasData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  for(let i=0;i<mesh.length;i++)
  {
    x = parseInt(mesh[i][0]/3);
    y = parseInt(mesh[i][1]/3);
    var index = (x + y * canvasWidth) * 4;
    canvasData.data[index + 0] = 0;
    canvasData.data[index + 1] = 0;
    canvasData.data[index + 2] = 0;
    canvasData.data[index + 3] = 255;
  }
  ctx.putImageData(canvasData, 0, 0);
}

var last_message = null;
function handleReceiveMessage(message){
    last_message = message;
    console.log("Message received");
    let mesh = null;
    try{
      parsed = JSON.parse(message.data);
      mesh = parsed["remote_mesh"];
    }
    catch{};
    if (mesh){
      draw_dots(parsed["remote_mesh"], "remote");
    }
    else{
      add_text(message.data);
    }
}

function receiveChannelCallback(event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleSendChannelStatusChange;
    receiveChannel.onclose = handleSendChannelStatusChange;
  }



let createPeerConnection = () => {
  try {
    pc = new RTCPeerConnection(PC_CONFIG);
    pc.onicecandidate = onIceCandidate;
    dc = pc.createDataChannel("datachannel");
    pc.ondatachannel = receiveChannelCallback;
    console.log('PeerConnection created');
  } catch (error) {
    console.error('PeerConnection failed: ', error);
  }
};

let sendOffer = () => {
  console.log('Send offer');
  pc.createOffer().then(
    setAndSendLocalDescription,
    (error) => { console.error('Send offer failed: ', error); }
  );
};

let sendAnswer = () => {
  console.log('Send answer');
  pc.createAnswer().then(
    setAndSendLocalDescription,
    (error) => { console.error('Send answer failed: ', error); }
  );
};

let setAndSendLocalDescription = (sessionDescription) => {
  pc.setLocalDescription(sessionDescription);
  console.log('Local description set');
  sendData(sessionDescription);
};

let onIceCandidate = (event) => {
  if (event.candidate) {
    console.log('ICE candidate');
    sendData({
      type: 'candidate',
      candidate: event.candidate
    });
  }
};

let onAddStream = (event) => {
  console.log('Add stream');
  remoteStreamElement.srcObject = event.stream;
};

let handleSignalingData = (data) => {
  switch (data.type) {
    case 'offer':
      createPeerConnection();
      pc.setRemoteDescription(new RTCSessionDescription(data));
      sendAnswer();
      break;
    case 'answer':
      pc.setRemoteDescription(new RTCSessionDescription(data));
      break;
    case 'candidate':
      pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('ICE');
      break;
  }
};

// Start connection
getLocalStream();

function send_data(data)
{
  dc.send(data);
}


function startVideo()
{
    const video = document.getElementById("video");
    navigator.mediaDevices.getUserMedia({video:true, audio: true}).then(
    function(stream){
        video.srcObject = stream
        video.play()
    })
}

let model = null;
async function load_model()
{
  model = await faceLandmarksDetection.load(
    faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
}



async function send_mesh(mesh)
{
  send_data(JSON.stringify({'remote_mesh' : mesh}));
}

let last_predictions = null;
async function update_mesh()
{
    last_predictions = await model.estimateFaces({
      input: document.querySelector("video")});
    let mesh = last_predictions[0].scaledMesh;
    send_mesh(mesh);
    draw_dots(mesh);
}



function page_load()
{
  startVideo();
  load_model();
  setTimeout(function (){ setInterval(update_mesh, 125)}, 1000);

  var input = document.getElementById("inputtext");
  // Execute a function when the user releases a key on the keyboard
  input.addEventListener("keyup", function(event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      // Cancel the default action, if needed
      event.preventDefault();
      send_data(input.value);
      add_text(input.value);
      input.value = "";
    }
  });


}
window.onload = page_load;
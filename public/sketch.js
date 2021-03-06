let robot;
let socket = io();
let speaker;
function setup() {
  noCanvas();
  // p5.SpeechRec - Basic
  robot = new p5.SpeechRec(); // speech recognition object
  robot.continuous = false; // allow continuous recognition
  robot.interimResults = true; // allow partial recognition (faster, less accurate)
  robot.onResult = showResult; // callback function that triggers when speech is recognized
  robot.onError = showError; // callback function that triggers when an error occurs
  robot.onEnd = onVoiceRecognitionEnd; // callback function that triggers voice recognition ends
  speaker = new p5.Speech();
  getAudioContext().suspend(); //make sure audio is paused
  document.getElementById('record').addEventListener('click', () => {
    robot.start();
    userStartAudio();
    document.getElementById('record').classList.add('active');
  });
  socket.on('reply', data => {
    console.log(data);
    // speaker.speak(data);cd
    var msg = new SpeechSynthesisUtterance();
    msg.text = data;
    window.speechSynthesis.speak(msg);
    document.getElementById('result').innerText = msg.text;
  });
}
function draw() {}

function startAudio() {}

function showResult(result) {}
function showError(err) {
  console.log(err);
}
function onVoiceRecognitionEnd() {
  console.log(robot.resultString);
  if (robot.resultString != undefined) {
    socket.emit('instruction', robot.resultString);
  }
  document.getElementById('record').classList.remove('active');
}

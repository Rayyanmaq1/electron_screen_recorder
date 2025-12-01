// DOM elements
const selectSourceBtn = document.getElementById('selectSource');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const sourceSelector = document.getElementById('sourceSelector');
const sourceList = document.getElementById('sourceList');
const closeSelector = document.getElementById('closeSelector');
const recordingIndicator = document.getElementById('recordingIndicator');

// Recording state
let mediaRecorder = null;
let recordedChunks = [];
let selectedSource = null;
let mediaStream = null;

// Event listeners
selectSourceBtn.addEventListener('click', showSourceSelector);
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
saveBtn.addEventListener('click', saveRecording);
closeSelector.addEventListener('click', hideSourceSelector);

async function showSourceSelector() {
  try {
    const sources = await window.electronAPI.getSources();
    sourceList.innerHTML = '';
    
    sources.forEach(source => {
      const div = document.createElement('div');
      div.className = 'source-item';
      div.innerHTML = `
        <img src="${source.thumbnailDataUrl}" alt="${source.name}">
        <span>${source.name}</span>
      `;
      div.addEventListener('click', () => selectSource(source));
      sourceList.appendChild(div);
    });
    
    sourceSelector.classList.add('active');
  } catch (error) {
    updateStatus(`Error getting sources: ${error.message}`);
  }
}

function hideSourceSelector() {
  sourceSelector.classList.remove('active');
}

async function selectSource(source) {
  hideSourceSelector();
  selectedSource = source;
  
  try {
    // Stop any existing stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    // Get the stream for the selected source
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    });
    preview.srcObject = mediaStream;
    
    updateStatus(`Selected: ${source.name}`);
    startBtn.disabled = false;
    stopBtn.disabled = true;
    saveBtn.disabled = true;
  } catch (error) {
    updateStatus(`Error selecting source: ${error.message}`);
  }
}

function startRecording() {
  if (!mediaStream) {
    updateStatus('Please select a source first');
    return;
  }
  
  recordedChunks = [];
  
  // Check codec support and select the best available option
  let mimeType = 'video/webm; codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm; codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }
  
  try {
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
  } catch (e) {
    // Fallback without specifying mimeType
    try {
      mediaRecorder = new MediaRecorder(mediaStream);
    } catch (e2) {
      updateStatus('Recording not supported: MediaRecorder API unavailable');
      return;
    }
  }
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = () => {
    updateStatus('Recording stopped. You can save the video now.');
    recordingIndicator.classList.remove('active');
    saveBtn.disabled = false;
  };
  
  mediaRecorder.start();
  
  updateStatus('Recording...');
  recordingIndicator.classList.add('active');
  startBtn.disabled = true;
  stopBtn.disabled = false;
  saveBtn.disabled = true;
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

async function saveRecording() {
  if (recordedChunks.length === 0) {
    updateStatus('No recording to save');
    return;
  }
  
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const arrayBuffer = await blob.arrayBuffer();
  
  updateStatus('Saving...');
  
  const result = await window.electronAPI.saveVideo(arrayBuffer);
  
  if (result.success) {
    updateStatus(`Saved to: ${result.filePath}`);
    recordedChunks = [];
    saveBtn.disabled = true;
  } else {
    updateStatus(result.message || 'Save cancelled');
  }
}

function updateStatus(message) {
  status.textContent = message;
}

let desktopCapturer, Menu;
let mediaRecorder;
let recordedChunks = [];
let timerInterval;
let recordingStartTime;

// Wait for DOM to be ready before accessing elements
document.addEventListener("DOMContentLoaded", () => {
  const videoElement = document.querySelector("#video");
  const startButton = document.getElementById("start-recording");
  const stopButton = document.getElementById("stop-recording");
  const recordedVideoElement = document.getElementById("recorded-video");
  const videoOverlay = document.getElementById("video-overlay");
  const statusIcon = document.getElementById("status-icon");
  const statusText = document.getElementById("status-text");
  const timerElement = document.getElementById("timer");
  const timerDisplay = document.getElementById("timer-display");
  const playbackSection = document.getElementById("playback-section");
  const playbackVideo = document.getElementById("playback-video");
  const closePlaybackButton = document.getElementById("close-playback");

  let lastRecordedVideoURL = null;

  // Require Electron APIs after DOM is ready
  const { ipcRenderer } = require("electron");
  const remote = require("@electron/remote");
  const { writeFile } = require("fs");

  Menu = remote.Menu;
  const dialog = remote.dialog;
  // Access desktopCapturer through remote
  const desktopCapturerRemote = remote.desktopCapturer;

  // Update status
  function updateStatus(status, text) {
    if (statusIcon) {
      statusIcon.className = `fas fa-circle status-icon ${status}`;
    }
    if (statusText) {
      statusText.textContent = text;
    }
  }

  // Timer functions
  function startTimer() {
    recordingStartTime = Date.now();
    if (timerElement) timerElement.style.display = 'flex';

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      if (timerDisplay) {
        timerDisplay.textContent = `${minutes}:${seconds}`;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timerElement) timerElement.style.display = 'none';
    if (timerDisplay) timerDisplay.textContent = '00:00';
  }

  // Assign function reference, not function call result
  if (recordedVideoElement) {
    recordedVideoElement.onclick = () => getVideoSources();
  }

  async function getVideoSources() {
    try {
      console.log("desktopCapturerRemote:", desktopCapturerRemote);

      // Try using desktopCapturer from remote first, fallback to IPC
      let sources;
      if (desktopCapturerRemote) {
        console.log("Using desktopCapturer from remote...");
        sources = await desktopCapturerRemote.getSources({
          types: ["screen", "window"],
          thumbnailSize: { width: 150, height: 150 },
        });
      } else {
        console.log("Falling back to IPC...");
        sources = await ipcRenderer.invoke("get-sources");
      }

      console.log("sources:", sources);

      if (!sources || sources.length === 0) {
        alert("No screen sources found");
        return;
      }

      if (!Menu) {
        console.error("Menu is not available");
        alert("Menu API is not available. Check console for details.");
        return;
      }

      const videoOptionsMenu = Menu.buildFromTemplate(
        sources.map((source) => {
          return {
            label: source.name,
            click: () => selectSource(source),
          };
        })
      );

      videoOptionsMenu.popup();
    } catch (error) {
      console.error("Error getting video sources:", error);
      alert("Failed to get video sources: " + error.message);
    }
  }

  async function selectSource(source) {
    try {
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: source.id,
          },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
      }

      // Hide video overlay when source is selected
      if (videoOverlay) {
        videoOverlay.classList.add('hidden');
      }

      const options = { mimeType: "video/webm; codecs=vp9" };
      mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.onstop = handleStop;

      if (startButton) startButton.disabled = false;

      updateStatus('ready', `Ready - ${source.name}`);

      console.log(`Successfully captured source: ${source.name}`);
    } catch (error) {
      console.error("Error capturing source:", error);
      alert(
        `Failed to capture "${source.name}". This window may be protected or not capturable. Please try a different source.`
      );
      if (startButton) startButton.disabled = true;
      updateStatus('', 'Ready');
    }
  }

  function handleDataAvailable(e) {
    console.log("video data available");
    recordedChunks.push(e.data);
  }

  async function handleStop(e) {
    const blob = new Blob(recordedChunks, {
      type: "video/webm; codecs=vp9",
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    const { filePath } = await dialog.showSaveDialog({
      buttonLabel: "Save video",
      defaultPath: `recording-${Date.now()}.webm`,
    });

    if (filePath) {
      console.log("Video saved to:", filePath);
      writeFile(filePath, buffer, () => {
        console.log("video saved successfully!");
        updateStatus('ready', 'Recording saved! Click below to play.');
      });
    } else {
      updateStatus('ready', 'Recording ready to play.');
    }

    // Create video URL for playback
    lastRecordedVideoURL = URL.createObjectURL(blob);

    // Show playback section and load video
    if (playbackSection && playbackVideo) {
      playbackVideo.src = lastRecordedVideoURL;
      playbackSection.style.display = 'block';

      // Scroll to playback section
      setTimeout(() => {
        playbackSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }

    recordedChunks = [];
  }

  if (startButton) {
    startButton.onclick = (e) => {
      if (mediaRecorder) {
        mediaRecorder.start();
        startButton.disabled = true;
        if (stopButton) stopButton.disabled = false;
        updateStatus('recording', 'Recording...');
        startTimer();
        console.log("media recorder started", mediaRecorder);
      }
    };
  }

  if (stopButton) {
    stopButton.onclick = (e) => {
      if (mediaRecorder) {
        mediaRecorder.stop();
        if (startButton) startButton.disabled = false;
        stopButton.disabled = true;
        updateStatus('ready', 'Processing...');
        stopTimer();
        console.log("media recorder stopped", mediaRecorder);
      }
    };
  }

  if (closePlaybackButton) {
    closePlaybackButton.onclick = () => {
      if (playbackSection) {
        playbackSection.style.display = 'none';
      }
      if (playbackVideo) {
        playbackVideo.pause();
        playbackVideo.src = '';
      }
      if (lastRecordedVideoURL) {
        URL.revokeObjectURL(lastRecordedVideoURL);
        lastRecordedVideoURL = null;
      }
    };
  }
});

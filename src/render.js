let desktopCapturer, Menu;
let mediaRecorder;
let recordedChunks = [];

// Wait for DOM to be ready before accessing elements
document.addEventListener("DOMContentLoaded", () => {
  const videoElement = document.querySelector("#video");
  const startButton = document.getElementById("start-recording");
  const stopButton = document.getElementById("stop-recording");
  const playButton = document.getElementById("play-video");
  const recordedVideoElement = document.getElementById("recorded-video");

  // Require Electron APIs after DOM is ready
  const { ipcRenderer } = require("electron");
  const remote = require("@electron/remote");

  Menu = remote.Menu;
  // Access desktopCapturer through remote
  const desktopCapturerRemote = remote.desktopCapturer;

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
    if (startButton) startButton.disabled = false;

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

    const options = { mimeType: "video/webm; codecs=vp9" };
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
  }

  function handleDataAvailable(e) {
    console.log("video data available");
    recordedChunks.push(e.data);
  }

  function handleStop(e) {
    const blob = new Blob(recordedChunks, {
      type: "video/webm; codecs=vp9",
    });

    const videoURL = URL.createObjectURL(blob);
    if (recordedVideoElement) recordedVideoElement.src = videoURL;
    //   if (playButton) playButton.disabled = false;
  }

  if (startButton) {
    startButton.onclick = (e) => {
      if (mediaRecorder) {
        mediaRecorder.start();
        startButton.disabled = true;
        if (stopButton) stopButton.disabled = false;
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
        console.log("media recorder stopped", mediaRecorder);
      }
    };
  }

  if (playButton) {
    playButton.onclick = (e) => {
      if (recordedVideoElement) recordedVideoElement.play();
    };
  }
});

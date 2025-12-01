# Electron Screen Recorder

A desktop screen recording application built with Electron.js. This application allows you to record your screen or any application window and save the recording as a WebM video file.

## Features

- **Screen/Window Selection**: Choose from available screens or application windows to record
- **Live Preview**: See what you're recording in real-time
- **Start/Stop Recording**: Easy-to-use controls for managing recordings
- **Save Recording**: Export your recordings as WebM video files
- **Modern UI**: Clean and intuitive dark-themed interface

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Rayyanmaq1/electron_screen_recorder.git
   cd electron_screen_recorder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the application:
   ```bash
   npm start
   ```

2. Click "Select Source" to choose a screen or window to record
3. Click "Start Recording" to begin recording
4. Click "Stop Recording" when finished
5. Click "Save Recording" to save the video file

## Technology Stack

- **Electron.js**: Cross-platform desktop application framework
- **desktopCapturer API**: Native screen capture functionality
- **MediaRecorder API**: Video recording and encoding

## Project Structure

```
electron_screen_recorder/
├── src/
│   ├── main.js      # Main Electron process
│   ├── preload.js   # Preload script for IPC
│   ├── index.html   # Application UI
│   └── render.js    # Renderer process logic
├── package.json
└── README.md
```

## License

ISC
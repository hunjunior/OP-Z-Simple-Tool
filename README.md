# OP-Z-Simple-Tool

This is a minimal OP-Z  Electron app to generate OP-Z compatible AIF drum kit files from short audio samples.

The main important files of the project:

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.
- `index.html` - A web page to render. This is the app's **renderer process**.
- `processing.js` - The JS file which contains the functions to perform file/audio processing, DOM manipulation etc.
- `JSON/drum_JSON_template.json` - The template OP-1 JSON. This will be modified and concatenated to the final AIF kit.

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. Furthermore, make sure you have [ffmpeg](http://www.ffmpeg.org/) installed on your system (including all necessary encoding libraries like libmp3lame or libx264) 

From your command line:

```bash
# Clone this repository
git clone https://github.com/hunjunior/OP-Z-Simple-Tool.git
# Go into the repository
cd OP-Z-Simple-Tool
# Install dependencies
npm install
# Run the app
npm start
```

Note: If you're using Linux Bash for Windows, [see this guide](https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/) or use `node` from the command prompt.

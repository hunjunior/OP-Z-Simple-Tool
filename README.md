# OP-Z-Simple-Tool

This is a minimal OP-Z  Electron app to generate OP-Z compatible AIF drum kit files from short audio samples.

<p align="center">  <img width="500" src="https://i.imgur.com/A5jzvdF.png](https://i.imgur.com/HkpXb2E.png">  </p>

The main important files of the project:

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.
- `index.html` - A web page to render. This is the app's **renderer process**.
- `processing.js` - The JS file which contains the functions to perform file/audio processing, DOM manipulation etc.
- `JSON/drum_JSON_template.json` - The template OP-1 JSON. This will be modified and concatenated to the final AIF kit.

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. 

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
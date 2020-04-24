const path = require('path');
const fs = require('fs');
const AudioContext = require('web-audio-api').AudioContext;
const audioContext = new AudioContext;
const fileType = require('file-type');
const toAiff = require('audiobuffer-to-aiff')

const MAX_FILE_SIZE = 20; //in MB

let filePathArray = new Array(24).fill(null);
let audioObjArray = new Array(24).fill(null);
let totalLengthSec = 0;
let outputDir = '';
let player = new Audio();

let errorMsg = document.querySelector('#error-msg');
let successMsg = document.querySelector('#success-msg');
let resultMsg = document.querySelector('#result-msg');
let deleteBtn = document.querySelectorAll('.delete-sample');
let detailsBtn = document.querySelectorAll('.sample-details-btn');
let fileInputs = document.querySelectorAll('.samples');
let uploadBtn = document.querySelectorAll('.upload-btn');
let outputDirSelect = document.querySelector('#output-dir-select');
let outputDirBtn = document.querySelector('#output-dir-btn');
let outputDirText = document.querySelector('#output-dir-text');
let octaveChecks = document.querySelectorAll('.octave-check');


fs.readFile('./config.json', (err, data) => {
    if (err) throw err;
    setOutputDirectory(JSON.parse(data).outputDirectory);
});

outputDirBtn.onclick = () => outputDirSelect.click()

outputDirSelect.onchange = function () {
    if (this.files[0]) {
        setOutputDirectory(this.files[0].path);
    }
}

uploadBtn.forEach((btn, i) => {
    btn.onclick = () => {
        fileInputs[i].click();
    }
})

octaveChecks.forEach((checkbox, i) => {
    checkbox.onclick = () => {
        let checked = checkbox.getAttribute('checked') == 'true';
        if (checked) {
            checkbox.style.background = 'transparent';
            audioObjArray[i].pitchDown = false;
        }
        else {
            checkbox.style.background = 'black';
            audioObjArray[i].pitchDown = true;
        }
        checkbox.setAttribute('checked', !checked);
    }
})


fileInputs.forEach((inputElement, i) => {
    let tempFilePath = "";
    inputElement.onchange = function () {
        if (this.files[0]) {
            tempFilePath = this.files[0].path;
            let stats = fs.statSync(tempFilePath)
            let fileSizeInBytes = stats["size"]
            if (fileSizeInBytes < (MAX_FILE_SIZE * 1000000)) {
                fs.readFile(tempFilePath, (err, buf) => {
                    if (err) {
                        console.log(err);
                        inputElement.value = "";
                        alert(err);
                    } else if (!fileType(buf) || (fileType(buf).mime != "audio/vnd.wave" && fileType(buf).mime != "audio/aiff" && fileType(buf).mime != "audio/mpeg")) {
                        console.log(fileType(buf));
                        inputElement.value = "";
                        sendError("Supported file types are WAV, MP3 and AIFF.");
                    } else {

                        processWav(tempFilePath, fileType(buf).mime, (audioObj) => {
                            if (audioObj.sampleRate != 44100) {
                                inputElement.value = "";
                                sendError("Sample rate of the WAV file must be 44.1 kHz")
                            } else {
                                filePathArray[i] = tempFilePath;
                                audioObjArray[i] = audioObj;
                                totalLengthSec = Math.ceil(getTotalLength() * 100) / 100;
                                errorMsg.innerHTML = "";
                                uploadBtn[i].style.display = "none";
                                deleteBtn[i].style.display = "block";
                                detailsBtn[i].style.display = "flex";
                                octaveChecks[i].style.display = "flex";
                                updateScreen(audioObj, detailsBtn[i], detailsBtn);
                                updateTotalLength();
                            }
                        })
                    }
                })
            } else {
                inputElement.value = "";
                sendError("Max supported file size is " + MAX_FILE_SIZE + " MB.")
            }

        }
    }
});

document.querySelectorAll('.delete-sample').forEach((deleteBtn, i) => {
    deleteBtn.onclick = function () {
        document.querySelectorAll('.samples')[i].value = "";
        deleteBtn.style.display = "none";
        detailsBtn[i].style.display = "none";
        uploadBtn[i].style.display = "flex";
        octaveChecks[i].style.display = "none"

        if (detailsBtn[i].getAttribute("selected") == "true") {
            document.querySelector('#success-msg').innerHTML = "";
        }
        filePathArray[i] = null;
        audioObjArray[i] = null;
        totalLengthSec = Math.ceil(getTotalLength() * 100) / 100;
        updateTotalLength();
    }
});

detailsBtn.forEach((btn, i) => {
    btn.onclick = function () {
        updateScreen(audioObjArray[i], btn, detailsBtn);
        if (player.paused) {
            player.currentTime = 0;
            player.src = filePathArray[i]
            player.play();
        } else {
            player.pause();
        }
    }
})

document.querySelector('#generate-btn').onclick = () => {
    if (outputDir) {
        getOpzObject((obj) => {
            joinMultipleAudio(filePathArray, (inputDir, err) => {
                if (err) {
                    console.log(err);
                } else {
                    let date = new Date();
                    let isoDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
                    //let outputDir = "./temp/OP-Z_join_" + isoDate + ".aiff";
                    joinJSONtoAIFF(inputDir, obj, (resultDir) => {
                        emptyTempDir();
                        updateResult(resultDir);
                    })
                }
            });
        });
    } else {
        sendError('Select the output folder first.')
    }
}

function setOutputDirectory(path) {
    if (fs.existsSync(path)) {
        outputDir = path;
        outputDirText.innerHTML = outputDir;
    } else {
        outputDir = '';
        outputDirText.innerHTML = 'Output folder not selected.';
    }
    fs.writeFileSync('config.json', JSON.stringify({ outputDirectory: outputDir }));
}

function emptyTempDir() {
    let tempDirectory = './temp';

    fs.readdir(tempDirectory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(tempDirectory, file), err => {
                if (err) throw err;
            });
        }
    });
}

function getOpzObject(callback) {
    let actStart = 0;
    let starts = new Array(24).fill(0);
    let ends = new Array(24).fill(0);
    let pitches = new Array(24).fill(0);
    let OpzObject = {};

    audioObjArray.forEach((obj, i) => {
        if (obj) {
            starts[i] = actStart;
            ends[i] = starts[i] + toOPTime(obj.timeLength);
            actStart = (ends[i] + 1);
            if(obj.pitchDown) pitches[i] = -6000;
        }
    })

    //in the OP json's PITCH field, the -6000 value tunes the sample ONE OCTAVE DOWN (Pitch down TODO)

    fs.readFile('./JSON/drum_JSON_template.json', (err, data) => {
        if (err) throw err;
        OpzObject = JSON.parse(data);
        OpzObject.start = starts;
        OpzObject.end = ends;
        OpzObject.pitch = pitches;
        callback(OpzObject)
    });
}

function toOPTime(seconds) {
    return Math.round(seconds / 12 * 2147483647);
}

function updateTotalLength() {
    let lengthElement = document.querySelector('#total-length');
    if (totalLengthSec > 0 && totalLengthSec <= 12) {
        lengthElement.style.color = "green";
        document.querySelector('#generate-btn').disabled = false;
    } else {
        lengthElement.style.color = "red";
        document.querySelector('#generate-btn').disabled = true;
    }
    lengthElement.innerHTML = totalLengthSec + " / 12 sec";
}

function appendBuffers(buffers) {
    let totalLength = 0;
    buffers.forEach(buffer => {
        totalLength += buffer.length;
    });
    let tmp = audioContext.createBuffer(1, totalLength, buffers[0].sampleRate);
    let currentLength = 0;
    let channel = tmp.getChannelData(0);
    buffers.forEach(buffer => {
        let bufferData = buffer.getChannelData(0);
        channel.set(bufferData, currentLength);
        currentLength += (bufferData.length);

        // changing the last 10 elements to zeros
        // to remove the peak at the end of the signal
        channel.set([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], currentLength - 10);
    });
    return tmp;
}

async function joinMultipleAudio(paths, callback) {
    buffers = [];
    for (const path of paths) {
        if (path) {
            let buffer = await getAudioBuffer(path);
            buffers.push(buffer)
        }
    }

    resultBuffer = appendBuffers(buffers);
    let aif = toAiff(resultBuffer);
    let chunk = new Uint8Array(aif);
    let isoDateString = new Date().toISOString();
    let outputDir = './temp/output-join-' + isoDateString + '.wav';
    fs.writeFile(outputDir, Buffer.from(chunk), function (err) {
        if (err) callback(null, err);
        else callback(outputDir, null);
    });
}

function getTotalLength() {
    let total = 0;
    audioObjArray.forEach((obj) => {
        if (obj) total += obj.timeLength;
    });
    return total;
}

function sendError(msg) {
    console.log(msg);
    errorMsg.innerHTML = "<br><br>" + msg;
    successMsg.innerHTML = "";
    resultMsg.innerHTML = "";
}

function updateDetails(audioObj, elementId) {
    let msg = "<br> MIME type: " + audioObj.mime + "<br>" +
        "Sample rate: " + audioObj.sampleRate + " Hz" + "<br>" +
        "Time length: " + Math.round(audioObj.timeLength * 100) / 100 + " sec" + "<br>" +
        "Sample length: " + audioObj.sampleLength + " samples" + "<br>" +
        "Channels: " + audioObj.channelNumber + " channel(s)";
    document.querySelector(elementId).innerHTML = msg;
}

function updateScreen(audioObj, button, otherButtons) {
    otherButtons.forEach((btn) => {
        btn.style.background = "transparent";
        btn.setAttribute("selected", false);
    })
    document.querySelector('#result-msg').innerHTML = "";
    button.setAttribute("selected", true);
    button.style.background = "black";
    let filename = audioObj.filename.split(".")[0];
    if (filename.length > 13) filename = "..." + filename.slice(filename.length - 9, filename.length);
    button.innerHTML = filename + " - " + (Math.round(audioObj.timeLength * 100) / 100) + " sec"
    updateDetails(audioObj, "#success-msg")
}

function updateResult(resultDir) {
    document.querySelector('#success-msg').innerHTML = "";
    document.querySelector('#error-msg').innerHTML = "";
    detailsBtn.forEach((btn) => {
        btn.style.background = "transparent";
        btn.setAttribute("selected", false);
    })
    resultMsg.innerHTML = "<br>The OP-Z sample is ready!<br><br>File location: " + resultDir;
}

function getAudioBuffer(filePath) {
    let audioContext = new AudioContext;
    let resp = fs.readFileSync(filePath);

    return new Promise((resolve, reject) => {
        audioContext.decodeAudioData(resp, buffer => {
            resolve(buffer);
        })
    })
}

async function processWav(path, mime, callback) {
    let buffer = await getAudioBuffer(path);

    let filename = path.split("/").pop();

    let data = buffer.getChannelData(0);

    let obj = {
        filename: filename,
        mime: mime,
        samples: data,
        sampleRate: buffer.sampleRate,
        sampleLength: data.length,
        timeLength: data.length / buffer.sampleRate,
        channelNumber: buffer.numberOfChannels,
        pitchDown: false
    };
    return callback(obj);
}

function joinJSONtoAIFF(aiffPath, obj, callback) {
    fs.readFile(aiffPath, (err, buf) => {
        if (err) throw err;

        let startBuf = Buffer.from(new Uint8Array([0x41, 0x50, 0x50, 0x4c]));
        let json = "op-1" + JSON.stringify(obj);

        json += String.fromCharCode(0x0a);
        if (json.length % 2 !== 0) {
            json += " ";
        }
        let jsonBuf = Buffer.from(json);
        let lenBuf = Buffer.alloc(4);
        lenBuf.writeInt32BE(jsonBuf.length);

        let applBuf = Buffer.concat([startBuf, lenBuf, jsonBuf]);

        let sndPos = buf.indexOf("SSND");
        let output = Buffer.alloc(buf.length + applBuf.length);

        buf.copy(output, 0, 0, sndPos);
        applBuf.copy(output, sndPos);
        buf.copy(output, sndPos + applBuf.length, sndPos);
        let blob = new Blob([output], { type: "audio/x-aiff; charset=binary" });

        let date = new Date();
        let isoDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
        let outputDirTemp = outputDir + "/OP-Z_JSON_" + isoDate + ".aif";

        var fileReader = new FileReader();
        fileReader.onload = function () {
            fs.writeFileSync(outputDirTemp, Buffer.from(new Uint8Array(this.result)));
            callback(outputDirTemp);
        };
        fileReader.readAsArrayBuffer(blob);
    });
}
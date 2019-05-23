const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const AudioContext = require('web-audio-api').AudioContext;
const audioContext = new AudioContext;
const fileType = require('file-type');
const toWav = require('audiobuffer-to-wav');
//const FileSaver = require("file-saver");

let filePath = '';
let filePathArray = new Array(24).fill(null);
let audioObjArray = new Array(24).fill(null);
let totalLengthSec = 0;

let aifFilePath = '';

//document.querySelector('#convert-btn').onclick = convertWavToAif;

document.querySelectorAll('.samples').forEach((inputElement, i) => {
    let tempFilePath = "";
    let sampleMsg = document.querySelectorAll('.sample-msg');

    inputElement.onchange = function () {
        if (this.files[0]) {
            tempFilePath = this.files[0].path;
            console.log(this.files[0].path);

            fs.readFile(tempFilePath, (err, buf) => {
                if (err) {
                    console.log(err);
                    //sendError(err);
                    //document.querySelector('#add-object-btn').disabled = true;
                    alert(err);
                } else if (!fileType(buf) || (fileType(buf).mime != "audio/vnd.wave" && fileType(buf).mime != "audio/aiff" && fileType(buf).mime != "audio/mpeg")) {
                    console.log(fileType(buf));
                    console.log("Supported file types are WAV, MP3 and AIFF.");
                    sampleMsg[i].innerHTML = "Supported file types are WAV, MP3 and AIFF.";
                } else {
                    //sendError("");
                    processWav(tempFilePath, (audioObj) => {
                        //updateDetails(audioObj, '#audio-details-2');
                        if (audioObj.sampleRate != 44100) {
                            console.log("Sample rate of the WAV file must be 44.1 kHz")
                            sampleMsg[i].innerHTML = "Sample rate of the WAV file must be 44.1 kHz";
                        } else {
                            filePathArray[i] = tempFilePath;
                            audioObjArray[i] = audioObj;
                            totalLengthSec = Math.ceil(getTotalLength() * 100) / 100;
                            let currentLenghtRounded = Math.round(audioObj.timeLength * 100) / 100;
                            console.log(totalLengthSec + " sec");
                            sampleMsg[i].innerHTML = currentLenghtRounded + " sec";
                            updateTotalLength();
                        }
                    })
                }
            })
        }
    }
});

document.querySelectorAll('.delete-sample').forEach((deleteBtn, i) => {
    deleteBtn.onclick = function () {
        document.querySelectorAll('.samples')[i].value = "";
        document.querySelectorAll('.sample-msg')[i].innerHTML = "";
        filePathArray[i] = null;
        audioObjArray[i] = null;
        totalLengthSec = Math.ceil(getTotalLength() * 100) / 100;
        updateTotalLength();
    }
});


document.querySelector('#generate-btn').onclick = () => {
    console.log(filePathArray);
    console.log(getTotalLength());

    getOpzObject((obj) => {
        console.log(obj);
        joinMultipleAudio(filePathArray, (inputDir, err) => {
            if (err) {
                console.log(err);
            } else {
                let date = new Date();
                let isoDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
                let outputDir = "./temp/OP-Z_join_" + isoDate + ".aiff";
                convertFile(inputDir, outputDir, (success, error) => {
                    if (error) {
                        alert(error);
                    } else {
                        //sendSuccess(success);
                        joinJSONtoAIFF(outputDir, obj, emptyTempDir)
                    }
                })
            }
        });
    });
}



/* document.querySelector('#aif-file-input').onchange = async function () {
    if (this.files[0]) {
        aifFilePath = this.files[0].path;
        console.log(this.files[0].path);

        fs.readFile(aifFilePath, (err, buf) => {
            if (err) {
                console.log(err);
                sendError(err);
                document.querySelector('#add-object-btn').disabled = true;

            } else if (fileType(buf).mime != "audio/vnd.wave") {
                console.log(fileType(buf));
                console.log("File type must be WAV / 44.1 kHz");
                sendError("File type must be WAV / 44.1 kHz");
                document.querySelector('#add-object-btn').disabled = true;
            } else {
                console.log(fileType(buf));
                sendError("");
                processWav(aifFilePath, (audioObj) => {
                    updateDetails(audioObj, '#audio-details-2');
                    if (audioObj.sampleRate != 44100) {
                        sendError("Sample rate of the WAV file must be 44.1 kHz")
                        document.querySelector('#add-object-btn').disabled = true;
                    } else if (audioObj.channelNumber > 1) {
                        sendError("Audio file must be mono.")
                        document.querySelector('#add-object-btn').disabled = true;
                    } else {
                        document.querySelector('#add-object-btn').disabled = false;
                    }
                })
            }
        })
    }
} */

/* document.querySelector('#add-object-btn').onclick = () => {
    let jsonString = document.querySelector('#aif-object').value;
    let aifObj = null;

    if (jsonString) {
        try {
            aifObj = JSON.parse(jsonString);
        } catch (e) {
            sendError("Invalid JSON.");
        }

        console.log(aifObj);

        if (aifObj) {
            let date = new Date();
            let isoDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
            let outputDir = "./outputs/OP-Z_" + isoDate + ".aiff";
            convertFile(aifFilePath, outputDir, (success, error) => {
                if (error) {
                    sendError(error);
                } else {
                    sendSuccess(success);
                    joinJSONtoAIFF(outputDir, aifObj)
                }
            })
        } else {
            sendError("Invalid JSON.")
        }
    } else {
        sendError("Invalid JSON.")
    }


}; */


/* document.querySelector('#file-upload').onchange = async function () {
    if (this.files[0]) {
        filePath = this.files[0].path;
        console.log(this.files[0].path);

        let audioObj = await processWavSync(filePath)
        updateDetails(audioObj, '#audio-details');
    }
} */

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
    let OpzObject = {};

    audioObjArray.forEach((obj, i) => {
        if (obj) {
            starts[i] = actStart;
            ends[i] = starts[i] + toOPTime(obj.timeLength);
            actStart = (ends[i] + 1);
        }
    })

    fs.readFile('./JSON/drum_JSON_template.json', (err, data) => {
        if (err) throw err;
        OpzObject = JSON.parse(data);
        OpzObject.start = starts;
        OpzObject.end = ends;
        callback(OpzObject)
    });
}

function toOPTime(seconds) {
    return Math.round(seconds / 12 * 2147483647);
}

function updateTotalLength() {
    let lenghtElement = document.querySelector('#total-lenght');
    if (totalLengthSec > 0 && totalLengthSec <= 12) {
        lenghtElement.style.color = "green";
        document.querySelector('#generate-btn').disabled = false;
    } else {
        lenghtElement.style.color = "red";
        document.querySelector('#generate-btn').disabled = true;
    }
    lenghtElement.innerHTML = totalLengthSec + " / 12 sec";
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
    //console.log(resultBuffer);

    let wav = toWav(resultBuffer);
    let chunk = new Uint8Array(wav);
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
    document.querySelector('#error-msg').innerHTML = msg;
    document.querySelector('#success-msg').innerHTML = "";
}

function sendSuccess(msg) {
    document.querySelector('#success-msg').innerHTML = msg;
    document.querySelector('#error-msg').innerHTML = "";
}

function updateDetails(audioObj, elementId) {
    let msg = "Sample rate: " + audioObj.sampleRate + " Hz" + "<br>" +
        "Time length: " + Math.round(audioObj.timeLength * 100) / 100 + " sec" + "<br>" +
        "Sample lenght: " + audioObj.sampleLength + " samples" + "<br>" +
        "Channels: " + audioObj.channelNumber + " channel(s)";

    document.querySelector(elementId).innerHTML = "<b>Audio file details:</b><br>" + msg;
}

function convertFile(inputPath, outputPath, callback) {
    let inMedia = path.resolve("" + inputPath + "");
    let outMedia = path.resolve("" + outputPath + "");
    console.log("Transcoding: " + inputPath + " > " + outputPath);

    var command = ffmpeg(inMedia).addOptions([
        '-preset veryslow'
    ]);

    command.save(outMedia).audioFilters(
        {
            filter: 'silencedetect',
            options: { n: '-50dB', d: 5 }
        }
    )
        .on('error', function (err) {
            callback(null, 'Cannot process file: ' + err.message);
        })
        .on('end', function () {
            callback('Processing finished successfully', null);
        });
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

async function processWavSync(path) {
    let buffer = await getAudioBuffer(path);


    let data = buffer.getChannelData(0);
    return {
        samples: data,
        sampleRate: buffer.sampleRate,
        sampleLength: data.length,
        timeLength: data.length / buffer.sampleRate,
        channelNumber: buffer.numberOfChannels
    }
}

async function processWav(path, callback) {
    let buffer = await getAudioBuffer(path);


    let data = buffer.getChannelData(0);
    //console.log(data);

    let obj = {
        samples: data,
        sampleRate: buffer.sampleRate,
        sampleLength: data.length,
        timeLength: data.length / buffer.sampleRate,
        channelNumber: buffer.numberOfChannels
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
        console.log("SSND position: " + sndPos);

        buf.copy(output, 0, 0, sndPos);
        applBuf.copy(output, sndPos);
        buf.copy(output, sndPos + applBuf.length, sndPos);
        let blob = new Blob([output], { type: "audio/x-aiff; charset=binary" });

        let date = new Date();
        let isoDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
        let outputDir = "./outputs/OP-Z_JSON_" + isoDate + ".aif";

        //FileSaver.saveAs(blob, outputDir + fileName);

        var fileReader = new FileReader();
        fileReader.onload = function () {
            fs.writeFileSync(outputDir, Buffer.from(new Uint8Array(this.result)));
            callback();
        };
        fileReader.readAsArrayBuffer(blob);
    });
}

function convertWavToAif() {
    if (filePath) {

        let fileName = filePath.split("/").pop().split(".");
        fileName.pop();
        fileName = fileName.join(".") + "_converted.aiff";
        let outputDir = "./outputs/";
        let testObj = { test: 123456 };
        convertFile(filePath, outputDir + fileName, (success, error) => {
            if (error) {
                sendError(error);
            } else {
                sendSuccess(success);
                joinJSONtoAIFF(outputDir + fileName, testObj)
            }
        })
    } else {
        sendError("Choose a file first.")
    }
}
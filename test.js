/**
 * Copyright 2019 Plus Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { GrovePi } = require("node-grovepi");
const LoudnessAnalogSensor = GrovePi.sensors.LoudnessAnalog;
const request = require("request");
const { spawn } = require("child_process");

const samplingInterval = 10;    // unit: ms
const loudnessThreshold = 600;
const bufferMaxLength = 20;
const bufferCountThreshold = 10;
const notifyingInterval = 10000;        // unit: ms

const fs = require("fs");

const pictureProcess = spawn("raspistill", ["-t", "1", "-e", "jpg", "-o", "-"]);

//pictureProcess.stdout.pipe(fs.createWriteStream("./test1.jpg"));

//pictureProcess.on("close", code => {
//    console.log(`raspistill finished with code ${code}`);
    request({
        url: "https://slack.com/api/files.upload",
        method: "POST",
        headers: {"Content-Type": "multipart/form-data"},
        formData: {
            token: process.env.SLACK_TOKEN,
            channels: process.env.SLACK_CHANNEL,
            filetype: "jpg",
            file: {
                value: pictureProcess.stdout,
                options: {
                    filename: "intercom.jpg",
                    contentType: "image/jpeg",
                    knownLength: 5242880
                }
            }
        }
    }, (err, response, body) => {
        console.error(err);
        console.log(response);
        console.log(body);
    });
//});

pictureProcess.on("close", () => {console.log("finished")});

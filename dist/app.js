"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const { GrovePi } = require("node-grovepi");
const LoudnessAnalogSensor = GrovePi.sensors.LoudnessAnalog;
const util_1 = require("util");
const request = util_1.promisify(require("request"));
const execFile = util_1.promisify(require("child_process").execFile);
const fs = __importStar(require("fs"));
const unlink = util_1.promisify(fs.unlink);
const moment_1 = __importDefault(require("moment"));
const samplingInterval = 10; // unit: ms
const loudnessThreshold = 600;
const bufferMaxLength = 20;
const bufferCountThreshold = 10;
const notifyingInterval = 10000; // unit: ms
const sensor = new LoudnessAnalogSensor(0);
const board = new GrovePi.board({
    debug: true,
    onError(err) {
        console.error("error on board initialization");
        console.error(err);
    },
    onInit(initialized) {
        if (initialized) {
            watch();
        }
    }
});
process.on("SIGINT", () => {
    sensor.stopStream();
    board.close();
    process.exit();
});
function watch() {
    let notifying = false;
    const buffer = [];
    sensor.stream(samplingInterval, (loudness) => {
        if (buffer.length >= bufferMaxLength) {
            buffer.shift();
        }
        // loudness は falseまたは数値を取る(はず)。
        buffer.push(loudness === false ? 0 : loudness);
        if (buffer.length >= bufferMaxLength && !notifying) {
            const count = buffer.reduce((acc, currentValue) => acc + (currentValue >= loudnessThreshold ? 1 : 0), 0);
            if (count >= bufferCountThreshold) {
                // インターホンが鳴ったと判断する
                notifying = true;
                // 誰か来たというメッセージを送る
                request({
                    url: process.env.SLACK_URL,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    json: {
                        "text": "<!channel> 誰か来たよ！"
                    }
                }).then((response, body) => {
                    if (response.statusCode != 200) {
                        throw new Error(`response status = ${response.statusCode}, body = ${body}`);
                    }
                }).catch((err) => {
                    console.error(err);
                });
                // モニターに映っている画像を撮って送る
                const pictureFilePath = `./${moment_1.default().format("YYYYMMDD-HHmmss")}.jpg`;
                execFile("raspistill", ["-t", "1", "-e", "jpg", "-o", pictureFilePath]).then(() => request({
                    url: "https://slack.com/api/files.upload",
                    method: "POST",
                    headers: {
                        "Content-Type": "multipart/form-data"
                    },
                    formData: {
                        token: process.env.SLACK_TOKEN,
                        channels: process.env.SLACK_CHANNEL,
                        filetype: "jpg",
                        file: fs.createReadStream(pictureFilePath)
                    }
                })).then(() => unlink(pictureFilePath)).catch((err) => {
                    console.error(err);
                });
                setInterval(() => {
                    notifying = false;
                }, notifyingInterval);
            }
        }
    });
}
board.init();
//# sourceMappingURL=app.js.map
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

const samplingInterval: number = 10;    // unit: ms
const loudnessThreshold: number = 600;
const bufferMaxLength: number = 20;
const bufferCountThreshold = 10;
const notifyingInterval = 10000;        // unit: ms

const sensor = new LoudnessAnalogSensor(0);

const board = new GrovePi.board({
    debug: true,
    onError(err: Error): void {
        console.error("error on board initialization");
        console.error(err);
    },
    onInit(initialized: boolean): void {
        if (initialized) {
            watch();
        }
    }
});

process.on("SIGINT", (): void => {
    sensor.stopStream();
    board.close();
    process.exit();
});

function watch(): void {
    let notifying: boolean = false;
    const buffer: Array<number> = [];
    sensor.stream(samplingInterval, (loudness: number | false): void => {
        if (buffer.length >= bufferMaxLength) {
            buffer.shift();
        }
        // loudness は falseまたは数値を取る(はず)。
        buffer.push(loudness === false ? 0 : loudness);
        if (buffer.length >= bufferMaxLength && !notifying) {
            const count: number = buffer.reduce(
                (acc: number, currentValue: number): number => acc + (currentValue >= loudnessThreshold ? 1 : 0),
                0
            );
            if (count >= bufferCountThreshold) {
                // インターホンが鳴ったと判断する
                notifying = true;
                
                request({
                    url: process.env.SLACK_URL,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    json: {
                        "text": "誰か来たよ！"
                    }
                }, (err: Error, response: any): void => {
                    if (err || response.statusCode != 200) {
                        console.error(err);
                        console.error(`status code = ${response.statusCode}`);
                    }
                });

                setInterval((): void => {
                    notifying = false;
                }, notifyingInterval);
            }
        }
    });
}

board.init();

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
import { promisify } from "util";
const request = promisify(require("request"));
const execFile = promisify(require("child_process").execFile);
import * as fs from "fs";
const unlink = promisify(fs.unlink);
const appendFile = promisify(fs.appendFile);
import moment from "moment";

const samplingInterval: number = 10;    // 音レベルを取得する時間間隔 unit: ms
const loudnessThreshold: number = 700;  // インターホンが鳴ったときの音レベル
const bufferMaxLength: number = 20;     // 音レベルを貯めるバッファのサイズ
const bufferCountThreshold = 10;        // バッファの中で、音レベルがloudnessThresholdを上回るデータがこの数以上あったら、インターホンが鳴ったと判断する
const notifyingInterval = 15000;        // 一回通知したら、最低この時間は通知しない unit: ms

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
                }).then((response: any, body: string): void => {
                    if (response.statusCode != 200) {
                        throw new Error(`response status = ${response.statusCode}, body = ${body}`);
                    }
                }).catch((err: Error): void => {
                    console.error(err);
                });

                // モニターに映っている画像を撮って送る
                const pictureFilePath: string = `./${moment().format("YYYYMMDD-HHmmss")}.jpg`;

                // カメラを置く環境に応じて、コマンドのオプションを書き換えてください
                // 画像の反転が必要ならhf, vf、回転ならrotなど
                // 詳しくは、raspistillのヘルプを見てね
                execFile("raspistill", ["-t", "1000", "-e", "jpg", "-rot", "270", "-o", pictureFilePath]).then((): Promise<any> => request({
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
                })).then((): Promise<any> => unlink(pictureFilePath)).catch((err: Error): void => {
                    console.error(err);
                });

                // ついでに、分析のため、反応したときの音レベルのバッファもファイルに書き出す(追記なので容量に注意)
                appendFile("./sensor_level.log", `[${buffer.join(", ")}]\n`, "utf-8");

                setTimeout((): void => {
                    notifying = false;
                }, notifyingInterval);
            }
        }
    });
}

board.init();

# intercom_notifier_slack

ラズパイを使い、家のインターホンが鳴ったことを、Slack経由で教えてくれるアプリ。

## Table of Contents

- [前提条件](#前提条件)
- [インストール](#インストール)
- [使い方](#使い方)
- [著作権](#著作権)

## 前提条件

1. ラズパイ、カメラモジュール、GrovePi+、Groveの音センサーをお手元に用意してね。
   ラズパイはZeroでも動くよ。ただし、WHじゃない場合は、自分でGPIOピンヘッダをつけてね。そして、カメラのケーブルをZero用に、GrovePi+の代わりにGrovePi Zeroを用意してね。
1. ラズパイ、カメラ、GrovePi+をつなげて、カメラの有効化とGrovePi+のセットアップをしといてね。
1. 音センサーをGrovePi+のA0ポートにつないでね。
1. Slackに通知するから、Slack側の準備も必要だよ。
   https://api.slack.com/apps からAppを作成して、通知をしたいワークスペースにインストールをしといてね。
   そのほか必要な設定としては、
    - Incoming Webhooksを有効にして、通知したいチャンネル用のWebhookを追加して、Webhook URLを覚えておく。
    - OAuth & PermissionsでUser Token Scopeで files:write を有効にして、OAuth Access Tokenを覚えておく。
   が必要だよ。

## インストール

GrovePi+のセットアップは、ここを読んでやってね。  
https://www.dexterindustries.com/GrovePi/get-started-with-the-grovepi/

ここを参考にして、最新のNode.jsとnpmをインストールしてね。  
https://github.com/nodesource/distributions/blob/master/README.md

    $ curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
    $ sudo apt-get install -y nodejs

まずリポジトリをクローンするよ。

    $ git clone https://github.com/reizouko/intercom_notifier_slack.git

そしたら、このコマンドでライブラリをインストールしてね。

    $ cd intercom_notifier_slack
    $ npm install

## 使い方

環境変数に、以下の通りセットして、

- SLACK_URL=(前提条件で覚えたWebhook URL)
- SLACK_TOKEN=(前提条件で覚えたOAuth Access Token)
- SLACK_CHANNEL=(通知をしたいチャンネルのID)

dist/app.jsを実行すればOKだよ。

    $ node dist/app.js

ソースコード中のパラメタやコマンドのオプションを変えたい場合は、TypeScriptのソース src/app.ts を変更して、トランスパイルしてね。

    $ npm run build

そうすると、dist/app.js が変更されるから、それを実行すればOKだよ。

起動と同時に実行したいなら、たとえば /etc/rc.local に起動コマンドを書く、なんてのもいいね。

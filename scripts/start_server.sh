#!/usr/bin/env bash
cd $1
echo "[INFO] Starting Server..."
screen -dmS server bash -c 'java -Xmx1G -Xms500M -jar forge-1.12.2.jar nogui'
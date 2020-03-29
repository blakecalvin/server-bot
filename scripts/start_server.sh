#!/usr/bin/env bash
cd $1
screen -dmS minecraft bash -c 'java -Xmx2G -Xms1G -jar forge-$2.jar nogui'
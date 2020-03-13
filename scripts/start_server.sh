#!/usr/bin/env bash
cd $1
screen -dmS minecraft bash -c 'java -Xmx1G -Xms500M -jar forge-1.12.2.jar nogui'
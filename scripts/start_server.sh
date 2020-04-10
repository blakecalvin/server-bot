#!/usr/bin/env bash
cd $1
let CMD="\'java -Xmx2G -Xms1G -jar forge-$2.jar nogui\'"
screen -dmS minecraft bash -c $CMD
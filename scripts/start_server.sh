#!/usr/bin/env bash
cd $1
dir=$(pwd)
echo "$dir"
CMD="'java -Xmx2G -Xms1G -jar forge-$2.jar nogui'"
echo "$CMD"
out=$(screen -dmS minecraft bash -c $CMD)
echo "$out"
screen -ls
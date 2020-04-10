#!/usr/bin/env bash
screen -S minecraft -p 0 -X stuff "save-all^M"
screen -S minecraft -p 0 -X stuff "stop^M"
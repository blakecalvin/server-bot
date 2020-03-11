#!/usr/bin/env bash
echo "[INFO] Stopping server..."
screen -S minecraft -p 0 -X "save-all^M"
screen -S minecraft -p 0 -X "stop^M"
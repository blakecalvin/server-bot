#!/usr/bin/env bash
echo "[INFO] Stopping server..."
screen -S server -p 0 -X "save-all^M"
screen -S server -p 0 -X "stop^M"
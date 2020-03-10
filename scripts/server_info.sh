#!/usr/bin/env bash
let TOKEN = $1
let NETWORK = $2
let MEMBER = $3

curl -H "Authorization: bearer $TOKEN" https://my.zerotier.com/api/network/$NETWORK/member/$MEMBER
#!/usr/bin/env bash
tar -czvf $1/backups/$2/$3$(date +.%m-%d-%Y_%H:%M).tar.gz $1/maps/$2/$3
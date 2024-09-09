#!/bin/bash

git pull 
git fetch --all 
git reset --hard 
npm install
node --no-deprecation index.js

'/nodeFiles/bot/push.sh'
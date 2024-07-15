#!/bin/bash

cd kde-localization
./update-all-stats-json.sh
cd ..
python3 -m http.server 9001
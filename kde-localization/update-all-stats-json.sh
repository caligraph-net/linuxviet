#!/bin/bash

list_all_files() {
    local folder="$1"
    local output_file="${2:-all-stats.json}"
    local files

    # Change to the specified directory
    cd "$folder" || { echo "Error: Cannot access folder $folder"; return 1; }

    # Find all .po files and format them as a JSON array
    files=$(ls -1rt stats-*.json | sed 's|^\./||' | jq -R . | jq -s .)

    # Save the JSON array to the output file
    echo "$files" > "$output_file"

    echo "File list saved to $output_file"
}

list_all_files . all-stats.json

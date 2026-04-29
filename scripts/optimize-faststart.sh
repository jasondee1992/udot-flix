#!/usr/bin/env bash

set -euo pipefail

input_file="${1:-}"
output_file="${2:-}"

if [[ -z "$input_file" ]]; then
  echo "Usage: $0 <input.mp4> [output-faststart.mp4]"
  exit 1
fi

if [[ ! -f "$input_file" ]]; then
  echo "Input file not found: $input_file"
  exit 1
fi

if [[ "${input_file##*.}" != "mp4" && "${input_file##*.}" != "MP4" ]]; then
  echo "Input file must be an MP4."
  exit 1
fi

if [[ -z "$output_file" ]]; then
  input_dir="$(dirname "$input_file")"
  input_name="$(basename "$input_file" .mp4)"
  output_file="${input_dir}/${input_name}.faststart.mp4"
fi

ffmpeg -i "$input_file" -c copy -movflags +faststart "$output_file"

echo "Faststart-optimized file written to:"
echo "$output_file"

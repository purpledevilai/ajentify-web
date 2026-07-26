#!/usr/bin/env bash
# Generate voice preview MP3 files for all OpenAI Realtime voices.
# Run once: OPENAI_API_KEY=sk-... ./scripts/generate-voice-previews.sh
# Outputs to public/audio/voices/<voice>.mp3

set -euo pipefail

VOICES=(alloy ash ballad coral echo sage shimmer verse marin cedar)
TEXT="Hi there! I'm your AI assistant. How can I help you today?"
OUT_DIR="$(dirname "$0")/../public/audio/voices"
mkdir -p "$OUT_DIR"

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "Error: OPENAI_API_KEY environment variable is required."
  echo "Usage: OPENAI_API_KEY=sk-... $0"
  exit 1
fi

for voice in "${VOICES[@]}"; do
  OUT_FILE="$OUT_DIR/$voice.mp3"
  if [ -f "$OUT_FILE" ]; then
    echo "Skipping $voice (already exists)"
    continue
  fi
  echo "Generating preview for: $voice"
  curl -s "https://api.openai.com/v1/audio/speech" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"gpt-4o-mini-tts\",
      \"voice\": \"$voice\",
      \"input\": \"$TEXT\",
      \"response_format\": \"mp3\"
    }" \
    --output "$OUT_FILE"
  echo "  -> $OUT_FILE"
done

echo "Done! All voice previews generated in $OUT_DIR"

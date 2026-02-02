#!/bin/bash

# Script to download free vowel sound files
# You can use this or generate them with macOS 'say' command

VOWEL_DIR="public/sounds/vowels"
mkdir -p "$VOWEL_DIR"

echo "Downloading vowel sounds..."

# Option 1: Generate with macOS 'say' command (if on Mac)
if command -v say &> /dev/null; then
    echo "Using macOS 'say' command to generate vowel sounds..."
    
    # Use Samantha voice (clear American English)
    VOICE="Samantha"
    
    # Monophthongs
    say -v "$VOICE" "fleece" -o "$VOWEL_DIR/fleece.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/fleece.aiff" "$VOWEL_DIR/fleece.mp3"
    say -v "$VOICE" "kit" -o "$VOWEL_DIR/kit.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/kit.aiff" "$VOWEL_DIR/kit.mp3"
    say -v "$VOICE" "dress" -o "$VOWEL_DIR/dress.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/dress.aiff" "$VOWEL_DIR/dress.mp3"
    say -v "$VOICE" "trap" -o "$VOWEL_DIR/trap.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/trap.aiff" "$VOWEL_DIR/trap.mp3"
    say -v "$VOICE" "strut" -o "$VOWEL_DIR/strut.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/strut.aiff" "$VOWEL_DIR/strut.mp3"
    say -v "$VOICE" "lot" -o "$VOWEL_DIR/lot.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/lot.aiff" "$VOWEL_DIR/lot.mp3"
    say -v "$VOICE" "foot" -o "$VOWEL_DIR/foot.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/foot.aiff" "$VOWEL_DIR/foot.mp3"
    say -v "$VOICE" "goose" -o "$VOWEL_DIR/goose.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/goose.aiff" "$VOWEL_DIR/goose.mp3"
    say -v "$VOICE" "thought" -o "$VOWEL_DIR/thought.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/thought.aiff" "$VOWEL_DIR/thought.mp3"
    
    # Diphthongs
    say -v "$VOICE" "price" -o "$VOWEL_DIR/price.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/price.aiff" "$VOWEL_DIR/price.mp3"
    say -v "$VOICE" "mouth" -o "$VOWEL_DIR/mouth.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/mouth.aiff" "$VOWEL_DIR/mouth.mp3"
    say -v "$VOICE" "choice" -o "$VOWEL_DIR/choice.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/choice.aiff" "$VOWEL_DIR/choice.mp3"
    say -v "$VOICE" "face" -o "$VOWEL_DIR/face.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/face.aiff" "$VOWEL_DIR/face.mp3"
    say -v "$VOICE" "goat" -o "$VOWEL_DIR/goat.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/goat.aiff" "$VOWEL_DIR/goat.mp3"
    
    # R-colored
    say -v "$VOICE" "nurse" -o "$VOWEL_DIR/nurse.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/nurse.aiff" "$VOWEL_DIR/nurse.mp3"
    say -v "$VOICE" "start" -o "$VOWEL_DIR/start.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/start.aiff" "$VOWEL_DIR/start.mp3"
    say -v "$VOICE" "force" -o "$VOWEL_DIR/force.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/force.aiff" "$VOWEL_DIR/force.mp3"
    say -v "$VOICE" "near" -o "$VOWEL_DIR/near.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/near.aiff" "$VOWEL_DIR/near.mp3"
    say -v "$VOICE" "square" -o "$VOWEL_DIR/square.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/square.aiff" "$VOWEL_DIR/square.mp3"
    say -v "$VOICE" "cure" -o "$VOWEL_DIR/cure.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/cure.aiff" "$VOWEL_DIR/cure.mp3"
    
    # Reduced
    say -v "$VOICE" "about" -o "$VOWEL_DIR/schwa.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/schwa.aiff" "$VOWEL_DIR/schwa.mp3"
    say -v "$VOICE" "happy" -o "$VOWEL_DIR/happy.aiff" && afconvert -f mp4f -d aac "$VOWEL_DIR/happy.aiff" "$VOWEL_DIR/happy.mp3"
    
    # Clean up AIFF files
    rm "$VOWEL_DIR"/*.aiff
    
    echo "✓ Vowel sounds generated with macOS 'say' command!"
else
    echo "macOS 'say' command not available."
    echo "You can:"
    echo "  1. Use online TTS services"
    echo "  2. Download from free sound libraries"
    echo "  3. Record your own voice"
fi

echo "Done! Check $VOWEL_DIR for audio files"

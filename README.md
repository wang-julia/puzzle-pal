# Puzzle Pal

This repository contains the frontend and backend for the Puzzle Pal project.

PuzzlePal is a web application that helps users complete their jigsaw puzzles. Snap or upload an image of your puzzle. As you build your puzzle, if you're not sure where a piece fits, snap a picture of the puzzle piece with PuzzlePal, and it'll show you exactly where the piece belongs!

Features:
- Upload puzzle images
- Snap puzzle pieces
- Highlights piece location
- Works for 500 and 1000 piece puzzles


## Frontend
- Built with React
- Handles uploading puzzle and pieces, showing the puzzle with detected piece locations

## Backend
- Built with Flask
- Uses OpenCV for image processing and to detect puzzle piece locations
- Returns JSON responses to the frontend
- Uses numPy for numerical operations
- Uses uuid for generating unique session IDs for each puzzle upload
- Uses base64 for image encoding


## In Progress
- Handle rotated pieces
- Improve UI
- Implement Deep Learning to improve accuracy
- Hint System rather than complete answer

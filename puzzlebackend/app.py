import os
from flask import Flask, request, jsonify # For building the web server
import cv2 # OpenCV for image processing
import numpy as np # NumPy for numerical operations
import uuid # For generating unique session IDs
import base64 # For encoding images to base64
from flask_cors import CORS # To handle CORS for frontend integration

app = Flask(__name__)
CORS(app)

# Dictionary to store puzzle images in memory
# Key: session_id, Value: puzzle_image_matrix
PUZZLE_STORE = {}

#HELPER FUNCTIONS

def find_piece_location_robust(piece, puzzle):
    orb = cv2.ORB_create(nfeatures=5000)

    kp1, des1 = orb.detectAndCompute(piece, None)
    kp2, des2 = orb.detectAndCompute(puzzle, None)

    if des1 is None or des2 is None:
        return None, None, None, None

    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    matches = bf.knnMatch(des1, des2, k=2)

    good_matches = []
    for m, n in matches:
        if m.distance < 0.75 * n.distance:
            good_matches.append(m)

    if len(good_matches) < 15:
        return None, None, None, None

    pts = np.float32([kp2[m.trainIdx].pt for m in good_matches])

    if np.std(pts[:, 0]) > 40 or np.std(pts[:, 1]) > 40:
        return None, None, None, None

    avg_x, avg_y = np.mean(pts, axis=0)
    return int(avg_x), int(avg_y), piece.shape[1], piece.shape[0]

def box_piece_on_puzzle(puzzle_img, x, y, w, h):
    """Draws a green rectangle centered on the detected coordinates."""
    boxed = puzzle_img.copy()
    top_left = (int(x - w/2), int(y - h/2))
    bottom_right = (int(x + w/2), int(y + h/2))
    cv2.rectangle(boxed, top_left, bottom_right, (0, 255, 0), 3)
    return boxed

def encode_image_to_base64(img):
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')


#ROUTES
@app.route('/upload-puzzle', methods=['POST'])
def upload_puzzle():
    if 'puzzle' not in request.files:
        return jsonify({'error': 'Missing puzzle image'}), 400

    file = request.files['puzzle']
    # Convert file stream directly to OpenCV image
    img_array = np.frombuffer(file.read(), np.uint8)
    puzzle_img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if puzzle_img is None:
        return jsonify({'error': 'Invalid image format'}), 400

    session_id = str(uuid.uuid4())
    PUZZLE_STORE[session_id] = puzzle_img

    return jsonify({
        'message': 'Puzzle uploaded successfully',
        'session_id': session_id
    })

@app.route('/upload-piece', methods=['POST'])
def upload_piece():
    session_id = request.form.get('session_id')
    if not session_id or session_id not in PUZZLE_STORE:
        return jsonify({'message': 'Please upload a puzzle first.'}), 400

    if 'piece' not in request.files:
        return jsonify({'message': 'No piece image received.'}), 400

    file = request.files['piece']
    img_array = np.frombuffer(file.read(), np.uint8)
    piece_img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if piece_img is None:
        return jsonify({'message': 'Invalid piece image format.'}), 400

    # Get the original puzzle from storage
    puzzle_img = PUZZLE_STORE[session_id]

    # 1. TRY ROBUST MATCHING (ORB)
    center_x, center_y, w, h = find_piece_location_robust(piece_img, puzzle_img)

    # 2. TRY FALLBACK (TEMPLATE MATCHING)
    if center_x is None:
        print("ORB failed, trying template matching fallback...")
        gray_puzzle = cv2.cvtColor(puzzle_img, cv2.COLOR_BGR2GRAY)
        gray_piece = cv2.cvtColor(piece_img, cv2.COLOR_BGR2GRAY)
        
        res = cv2.matchTemplate(gray_puzzle, gray_piece, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(res)
        
        print(f"DEBUG: Template match confidence: {max_val:.4f}")

        if max_val > 0.8:
            w, h = piece_img.shape[1], piece_img.shape[0]
            center_x, center_y = max_loc[0] + w//2, max_loc[1] + h//2
        else:
            # IMPORTANT: Return 404 here so the function stops and React shows the error
            print("DEBUG: Match failed both methods. Returning 404.")
            return jsonify({'message': 'Match not found. Try holding the piece flatter or improving lighting.'}), 404

    #3. FINAL VALIDATION
    # Double check we actually found coordinates before proceeding to draw
    if center_x is None or center_y is None:
        return jsonify({'message': 'Algorithm failed to generate coordinates.'}), 404

    #4. SUCCESS PATH
    try:
        # Create the visual result (Drawing the green box)
        boxed_puzzle = box_piece_on_puzzle(puzzle_img, center_x, center_y, w, h)
        
        # Check if the drawing function actually returned an image
        if boxed_puzzle is None:
            return jsonify({'message': 'Error generating the result image.'}), 500

        return jsonify({
            'message': 'Piece located!',
            'x': int(center_x),
            'y': int(center_y),
            'puzzle_image': encode_image_to_base64(boxed_puzzle)
        })
        
    except Exception as e:
        print(f"Internal Error during processing: {e}")
        return jsonify({'message': 'An internal error occurred while processing the image.'}), 500

if __name__ == '__main__':
    app.run()
    #app.run(debug=True, port=5000)

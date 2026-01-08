import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_BASE = "http://127.0.0.1:5000";

function App() {
  const [sessionId, setSessionId] = useState("Not Started");
  const [puzzleImg, setPuzzleImg] = useState(null);
  const [resultImg, setResultImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: "", type: "" });
  
  const [puzzleMode, setPuzzleMode] = useState('file'); 
  const [pieceMode, setPieceMode] = useState('file');   
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [activeStream, setActiveStream] = useState(null);

  const showMessage = (text, type) => {
    setStatus({ text, type });
  };

  // Requirement 1: Complete Reset (No alert, close cameras, clear all images)
  const startNewPuzzle = () => {
    // Stop any active camera tracks
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
    }
    
    // Reset all states to default
    setSessionId("Not Started");
    setPuzzleImg(null);
    setResultImg(null);
    setStatus({ text: "", type: "" });
    setActiveStream(null);
    setPuzzleMode('file');
    setPieceMode('file');
    setLoading(false);
  };

  const toggleCamera = async (mode) => {
    if (mode === 'camera') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setActiveStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        showMessage("Camera access denied.", "error");
      }
    } else {
      activeStream?.getTracks().forEach(t => t.stop());
      setActiveStream(null);
    }
  };

  const handleUpload = async (file, endpoint) => {
    if (!file) {
        showMessage("Please select an image first.", "error");
        return;
    }
    const formData = new FormData();
    const fieldName = endpoint === 'upload-puzzle' ? 'puzzle' : 'piece';
    formData.append(fieldName, file);
    if (fieldName === 'piece') formData.append('session_id', sessionId);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/${endpoint}`, formData);
      
      if (endpoint === 'upload-puzzle') {
        setSessionId(res.data.session_id);
        setPuzzleImg(URL.createObjectURL(file)); 
        setResultImg(null); 
        showMessage("Puzzle imported successfully!", "success");
      } else {
        setResultImg(`data:image/png;base64,${res.data.puzzle_image}`);
        showMessage("Piece located!", "success");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Match not found.";
      if (endpoint === 'upload-piece') setResultImg(null); 
      showMessage(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const captureAndUpload = (endpoint) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      handleUpload(blob, endpoint);
    }, 'image/png');
  };

  return (
    <div style={containerStyle}>
      {/*LEFT SIDE: CONTROLS*/}
      <div style={leftSideStyle}>
        {/* Requirement: Inject Google Font */}
        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');`}
        </style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          {/* Requirement: Styled Logo */}
          <h1 style={{ 
            fontSize: '2.5rem', 
            margin: 0, 
            fontWeight: '700', 
            fontFamily: "'Space Grotesk', sans-serif", 
            letterSpacing: '-0.03em',
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            Puzzle<span style={{ color: '#007bff' }}>Pal</span>
          </h1>
          <button onClick={startNewPuzzle} style={newPuzzleBtn}>New Puzzle</button>
        </div>
        
        {status.text && (
          <div style={{
            ...statusBox, 
            backgroundColor: status.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: status.type === 'error' ? '#b91c1c' : '#15803d',
            border: `1px solid ${status.type === 'error' ? '#fecaca' : '#bbf7d0'}`
          }}>
            {status.text}
          </div>
        )}

        <section style={cardStyle}>
          <h3 style={stepTitle}>1. Upload Puzzle</h3>
          <div style={toggleContainer}>
            <button onClick={() => {setPuzzleMode('file'); toggleCamera('file')}} style={puzzleMode === 'file' ? activeBtn : inactiveBtn}>File</button>
            <button onClick={() => {setPuzzleMode('camera'); toggleCamera('camera')}} style={puzzleMode === 'camera' ? activeBtn : inactiveBtn}>Camera</button>
          </div>
          {puzzleMode === 'file' ? (
            <div style={stack}>
              <input type="file" id="puzInput" accept="image/*" style={{fontSize: '12px'}} />
              <button onClick={() => handleUpload(document.getElementById('puzInput').files[0], 'upload-puzzle')} style={uploadBtn}>Import Puzzle</button>
            </div>
          ) : (
            <div style={stack}>
              <video ref={videoRef} autoPlay style={videoStyle} />
              <button onClick={() => captureAndUpload('upload-puzzle')} style={uploadBtn}>Capture & Set</button>
            </div>
          )}
          <div style={sessionBadge}>ID: {sessionId}</div>
        </section>

        <section style={cardStyle}>
          <h3 style={stepTitle}>2. Upload Piece</h3>
          <div style={toggleContainer}>
            <button onClick={() => {setPieceMode('file'); toggleCamera('file')}} style={pieceMode === 'file' ? activeBtn : inactiveBtn}>File</button>
            <button onClick={() => {setPieceMode('camera'); toggleCamera('camera')}} style={pieceMode === 'camera' ? activeBtn : inactiveBtn}>Camera</button>
          </div>
          {pieceMode === 'file' ? (
            <div style={stack}>
              <input type="file" id="pieInput" accept="image/*" style={{fontSize: '12px'}} />
              <button onClick={() => handleUpload(document.getElementById('pieInput').files[0], 'upload-piece')} style={findBtn}>
                {resultImg ? "Find Another Piece" : "Find Piece"}
              </button>
            </div>
          ) : (
            <div style={stack}>
              <video ref={videoRef} autoPlay style={videoStyle} />
              <button onClick={() => captureAndUpload('upload-piece')} style={findBtn}>
                {resultImg ? "Capture Another Piece" : "Capture & Locate"}
              </button>
            </div>
          )}
        </section>

        {loading && <div style={statusMsg}>Processing...</div>}
      </div>

      {/*RIGHT SIDE: FULL SCREEN VIEW*/}
      <div style={rightSideStyle}>
        {resultImg ? (
          <img src={resultImg} alt="Result" style={imgStyle} />
        ) : puzzleImg ? (
          <img src={puzzleImg} alt="Target" style={imgStyle} />
        ) : (
          <div style={placeholderStyle}>
            <p>Waiting for Puzzle Upload...</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

//STYLES
const containerStyle = { display: 'flex', height: '100vh', width: '100vw', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', backgroundColor: '#1a1a1a', overflow: 'hidden' };

const leftSideStyle = { 
  width: '320px', 
  padding: '25px', 
  backgroundColor: '#ffffff', 
  borderRight: '1px solid #ddd', 
  display: 'flex', 
  flexDirection: 'column', 
  zIndex: 10, 
  boxShadow: '5px 0 15px rgba(0,0,0,0.1)',
  overflowY: 'auto' 
};

const rightSideStyle = { flex: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#262626', position: 'relative', overflow: 'hidden' };
const imgStyle = { width: '100%', height: '100%', objectFit: 'contain', display: 'block' };
const placeholderStyle = { color: '#666', fontSize: '1.2rem', textAlign: 'center' };
const cardStyle = { marginBottom: '25px', flexShrink: 0 }; 
const stepTitle = { fontSize: '1rem', fontWeight: '600', marginBottom: '10px', color: '#333' };
const toggleContainer = { display: 'flex', gap: '4px', marginBottom: '12px' };
const stack = { display: 'flex', flexDirection: 'column', gap: '8px' };
const videoStyle = { width: '100%', borderRadius: '6px', background: '#000' };

const activeBtn = { flex: 1, padding: '6px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const inactiveBtn = { flex: 1, padding: '6px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const uploadBtn = { padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const findBtn = { padding: '10px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' };
const newPuzzleBtn = { padding: '5px 12px', background: '#f8f9fa', color: '#333', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' };
const sessionBadge = { marginTop: '8px', fontSize: '10px', color: '#999', textTransform: 'uppercase' };
const statusMsg = { marginTop: '20px', padding: '15px', background: '#e7f3ff', color: '#007bff', borderRadius: '8px', textAlign: 'center', fontWeight: '600' };

const statusBox = { padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '20px', fontWeight: '500', lineHeight: '1.4' };

export default App;
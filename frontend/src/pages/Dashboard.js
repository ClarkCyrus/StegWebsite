import React, { useState, useRef } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null); // to trigger file input

  const handleCreateStegoImage = () => {
    // Open the hidden file input
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);

      const newImage = {
        id: images.length + 1,
        label: file.name,
        img: imageUrl,
      };

      setImages([...images, newImage]);
    }
  };

  const renderCards = () => {
    const cards = [];
    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      cards.push(
        <div key={item.id} className="card">
          <div className="image-placeholder">
            {item.img ? (
              <img src={item.img} alt={item.label} className="uploaded-image" />
            ) : (
              <p>*Image</p>
            )}
          </div>
          <div className="card-label">{item.label}</div>
        </div>
      );
    }
    return cards;
  };

  return (
    <div className="dashboard-wrapper">
      <h1 className="dashboard-title">DASHBOARD</h1>
      <div className="dashboard-box">
        <div className="cards-container">
          {images.length > 0 ? renderCards() : <p>No stego images yet.</p>}
        </div>
        <div className="create-button-container">
          <button className="create-button" onClick={handleCreateStegoImage}>
            Create Stego Image
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

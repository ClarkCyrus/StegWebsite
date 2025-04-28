import React, { useState } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [images, setImages] = useState([]);

  const handleCreateStegoImage = () => {
    // For now, simulate adding a new image
    const newImage = {
      id: images.length + 1,
      label: `New Stego Image ${images.length + 1}`,
      img: null, // Replace null if you have an actual image URL
    };
    setImages([...images, newImage]);
  };

  return (
    <div className="dashboard-wrapper">
      <h1 className="dashboard-title">DASHBOARD</h1>
      <div className="dashboard-box">
        <div className="cards-container">
          {images.length > 0 ? (
            images.map((item) => (
              <div key={item.id} className="card">
                <div className="image-placeholder">
                  {item.img ? <img src={item.img} alt={item.label} /> : <p>*Image</p>}
                </div>
                <div className="card-label">{item.label}</div>
              </div>
            ))
          ) : (
            <p>No stego images yet.</p>
          )}
        </div>
        <div className="create-button-container">
          <button className="create-button" onClick={handleCreateStegoImage}>
            Create Stego Image
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

import React, { useState } from 'react';
import './DragDrop.css';

const DragAndDropFileUpload = ({ onFileSelect, onSubmit, loading }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'image/png'){
      setFile(selectedFile);
      onFileSelect(selectedFile);
      setError(null)
    }   else {
      setError('Please upload a valid image file.');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length) {
      handleFileChange({ target: { files: [files[0]] } });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleCancel = () => {
    setFile(null);  
    onFileSelect(null);
    document.getElementById('fileInput').value = ''; 
  };

  return (

    <div className="upload-container">
      <form onSubmit={onSubmit}>
        <div className="drag-area" onDrop={handleDrop} onDragOver={handleDragOver}>
          {file ? (
            <div className="file-preview">
              <p>File Preview: {file.name}</p>
              <img src={URL.createObjectURL(file)} alt="Preview" width="100%" />
              <button className="cancel-button" type="button" onClick={handleCancel}>Cancel</button>
              <button className="accept-button" type="submit" disabled={loading}> 
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          ) : (
            <>
              <div className="icon"><i className="bi bi-cloud-arrow-up-fill"></i></div>
              <header>Drag & Drop to Upload File</header>
              <span>OR</span>
              <button type="button" onClick={() => document.getElementById('fileInput').click()}>Browse File</button>
            </>
          )}
          <input type="file" id="fileInput" hidden onChange={handleFileChange} />
        </div>
      </form>
      {error && <p className="error-message text-danger">{error}</p>}
    </div>

  );
};

export default DragAndDropFileUpload;
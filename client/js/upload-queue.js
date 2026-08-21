// Upload Queue & Drag-and-Drop Manager
let selectedFiles = [];

function setupUploadListeners() {
  const dropZone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('file-input-element');

  if (dropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('pulse-glow');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('pulse-glow');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) handleFilesUpload(files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFilesUpload(e.target.files);
    });
  }
}

async function handleFilesUpload(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('photos', files[i]);
  }

  showToast(`Uploading ${files.length} file(s)... 🚀`, 'info');

  try {
    const response = await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      showToast(`Successfully uploaded ${data.uploadedCount} file(s)! Admin phone notified 📸`, 'success');
      if (data.duplicatesCount > 0) {
        showToast(`${data.duplicatesCount} duplicate file(s) skipped via SHA-256 hash.`, 'warning');
      }
      closeModal('upload-modal');
      loadGallery('all');
      loadStorageStats();
    } else {
      showToast(`Upload failed: ${data.error?.message || 'Server error'}`, 'error');
    }
  } catch (err) {
    showToast(`Network error during upload: ${err.message}`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', setupUploadListeners);

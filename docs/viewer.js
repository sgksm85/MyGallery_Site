const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('file');
const downloadButton = document.getElementById('download');
const container = document.getElementById('canvas-container');

let pdfDoc = null;
let scale = 1.0;

if (fileUrl) {
  let directUrl = fileUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('&dl=0', '');
  directUrl = directUrl.replace('&dl=1', '');

  console.log("Loading PDF from:", directUrl);
  downloadButton.href = directUrl;

  pdfjsLib.getDocument(directUrl).promise.then(function (pdfDoc_) {
    pdfDoc = pdfDoc_;
    renderAllPages();
  }).catch(function (error) {
    console.error('Error loading PDF:', error);
    container.innerHTML = `<div style="color:white; text-align:center; margin-top:50px;">
            <p>Error loading PDF.</p>
            <p>${error.message}</p>
            <a href="${directUrl}" style="color:#aaa;">Download File</a>
        </div>`;
  });
} else {
  container.innerHTML = '<div style="color:white; text-align:center; margin-top:50px;">No file specified.</div>';
}

function renderAllPages() {
  container.innerHTML = ''; // Clear existing

  // Create a wrapper for vertical layout
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '20px';
  wrapper.style.alignItems = 'center';
  container.appendChild(wrapper);

  for (let num = 1; num <= pdfDoc.numPages; num++) {
    const pageContainer = document.createElement('div');
    pageContainer.className = 'page-container';
    pageContainer.style.position = 'relative';

    const canvas = document.createElement('canvas');
    canvas.id = `page-${num}`;
    pageContainer.appendChild(canvas);
    wrapper.appendChild(pageContainer);

    renderPage(num, canvas);
  }
}

function renderPage(num, canvas) {
  pdfDoc.getPage(num).then(function (page) {
    const viewport = page.getViewport({ scale: scale });
    const ctx = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    page.render(renderContext);
  });
}

function onZoomIn() {
  scale += 0.2;
  renderAllPages();
}

function onZoomOut() {
  if (scale <= 0.4) return;
  scale -= 0.2;
  renderAllPages();
}

document.getElementById('zoomIn').addEventListener('click', onZoomIn);
document.getElementById('zoomOut').addEventListener('click', onZoomOut);

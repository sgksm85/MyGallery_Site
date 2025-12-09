const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('file');
const downloadButton = document.getElementById('download');
const container = document.getElementById('canvas-container');

let pdfDoc = null;
let scale = 'page-fit'; // Default to auto-fit

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
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '20px';
  wrapper.style.alignItems = 'center';
  wrapper.style.width = '100%'; // Ensure wrapper takes full width
  container.appendChild(wrapper);

  // Get first page to calculate auto-scale if needed
  pdfDoc.getPage(1).then(function (page) {
    let finalScale = 1.0;

    if (scale === 'page-fit') {
      const viewport = page.getViewport({ scale: 1.0 });
      const clientWidth = container.clientWidth;

      // Mobile check (simple width check match css media query)
      const isMobile = window.innerWidth <= 600;

      if (isMobile) {
        // 100% width for mobile (minus a small padding usually handled by css)
        finalScale = (clientWidth - 20) / viewport.width;
      } else {
        // 80% width for desktop
        finalScale = (clientWidth * 0.8) / viewport.width;
      }
      if (finalScale > 1.2) finalScale = 1.2; // Cap max auto-scale
    } else {
      finalScale = scale;
    }

    // Render all pages with the calculated scale
    for (let num = 1; num <= pdfDoc.numPages; num++) {
      const pageContainer = document.createElement('div');
      pageContainer.className = 'page-container';
      pageContainer.style.position = 'relative';

      const canvas = document.createElement('canvas');
      canvas.id = `page-${num}`;
      pageContainer.appendChild(canvas);
      wrapper.appendChild(pageContainer);

      // We pass the calculated scale explicitly
      renderPage(num, canvas, finalScale);
    }

    // Update global scale to the calculated one so zoom in/out works from there
    if (scale === 'page-fit') {
      scale = finalScale;
    }
  });
}

function renderPage(num, canvas, currentScale) {
  pdfDoc.getPage(num).then(function (page) {
    const viewport = page.getViewport({ scale: currentScale });
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
  // If scale was still 'page-fit' (should be updated by first render, but safe check)
  if (typeof scale === 'string') scale = 1.0;

  scale += 0.2;
  renderAllPages();
}

function onZoomOut() {
  if (typeof scale === 'string') scale = 1.0;

  if (scale <= 0.4) return;
  scale -= 0.2;
  renderAllPages();
}

document.getElementById('zoomIn').addEventListener('click', onZoomIn);
document.getElementById('zoomOut').addEventListener('click', onZoomOut);

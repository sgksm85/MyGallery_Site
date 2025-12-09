const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('file');
const downloadButton = document.getElementById('download');
const canvas = document.getElementById('the-canvas');
const ctx = canvas.getContext('2d');

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;

// Initial Limit for scale based on screen width
const container = document.getElementById('canvas-container');

if (fileUrl) {
  // Convert Dropbox link to direct link for CORS and raw data
  // Example: https://www.dropbox.com/scl/fi/.../file.pdf?rlkey=...&dl=0
  // To:      https://dl.dropboxusercontent.com/scl/fi/.../file.pdf?rlkey=...
  let directUrl = fileUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('&dl=0', '');

  // Fallback if 'dl=1' was used
  directUrl = directUrl.replace('&dl=1', '');

  console.log("Loading PDF from:", directUrl);
  downloadButton.href = directUrl;

  pdfjsLib.getDocument(directUrl).promise.then(function (pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('page_count').textContent = pdfDoc.numPages;

    // Perform initial render
    renderPage(pageNum);
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

function renderPage(num) {
  pageRendering = true;

  pdfDoc.getPage(num).then(function (page) {
    // Adjust scale to fit width if it's the first load or if requested
    // logic: let's start with a scale that fits the width with some margin
    const viewportUtils = page.getViewport({ scale: 1.0 }); // get unscaled viewport

    // If scale is default (1.0) and it's too wide for container, shrink it.
    // Or we can just honor the 'scale' variable.
    // Let's just use the global 'scale' variable.
    var viewport = page.getViewport({ scale: scale });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    var renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    var renderTask = page.render(renderContext);

    // Wait for render to finish
    renderTask.promise.then(function () {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  // Update page counters
  document.getElementById('page_num').textContent = num;
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}

function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}

function onZoomIn() {
  scale += 0.2;
  queueRenderPage(pageNum);
}

function onZoomOut() {
  if (scale <= 0.4) return;
  scale -= 0.2;
  queueRenderPage(pageNum);
}

document.getElementById('prev').addEventListener('click', onPrevPage);
document.getElementById('next').addEventListener('click', onNextPage);
document.getElementById('zoomIn').addEventListener('click', onZoomIn);
document.getElementById('zoomOut').addEventListener('click', onZoomOut);

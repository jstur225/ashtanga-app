const MAX_CANVAS_EDGE = 8192;

function getSystemPixelRatio() {
  try {
    const info = wx.getSystemInfoSync();
    return Math.max(2, Number(info.pixelRatio) || 2);
  } catch (error) {
    return 2;
  }
}

function getCanvasScale(width, height) {
  const maxLogicalEdge = Math.max(1, Number(width) || 1, Number(height) || 1);
  const safeScale = MAX_CANVAS_EDGE / maxLogicalEdge;
  return Math.max(1, Math.min(3, getSystemPixelRatio(), safeScale));
}

function getImageInfo(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    wx.getImageInfo({
      src,
      success: (result) => resolve({
        path: result.path || src,
        width: Math.max(1, Number(result.width) || 1),
        height: Math.max(1, Number(result.height) || 1)
      }),
      fail: () => resolve(null)
    });
  });
}

function createCanvasImage(canvas, path) {
  return new Promise((resolve) => {
    if (!canvas || !path) {
      resolve(null);
      return;
    }
    const image = canvas.createImage();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = path;
  });
}

async function loadCanvasImage(canvas, src) {
  const info = await getImageInfo(src);
  if (!info) return null;
  const image = await createCanvasImage(canvas, info.path);
  return image ? { ...info, image } : null;
}

function saveCanvasToAlbum(component, canvas, width, height, scale) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      destWidth: Math.round(width * scale),
      destHeight: Math.round(height * scale),
      fileType: 'png',
      quality: 1,
      success: (result) => {
        wx.saveImageToPhotosAlbum({
          filePath: result.tempFilePath,
          success: () => resolve(result.tempFilePath),
          fail: reject
        });
      },
      fail: reject
    }, component);
  });
}

module.exports = {
  MAX_CANVAS_EDGE,
  getCanvasScale,
  getImageInfo,
  loadCanvasImage,
  saveCanvasToAlbum
};

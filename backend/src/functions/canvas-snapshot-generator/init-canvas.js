const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({ projectId: 'serverless-tek89' });

async function initCanvas() {
  const canvasRef = firestore.collection('canvases').doc('main-canvas');
  
  const doc = await canvasRef.get();
  
  if (doc.exists) {
    console.log('Canvas already exists:', doc.data());
  } else {
    await canvasRef.set({
      id: 'main-canvas',
      width: 1000,
      height: 1000,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalPixels: 0,
    });
    console.log('Canvas initialized successfully');
  }
}

initCanvas().catch(console.error);

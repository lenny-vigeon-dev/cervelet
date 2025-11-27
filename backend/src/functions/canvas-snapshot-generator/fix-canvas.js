const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({ projectId: 'serverless-tek89' });

async function fixCanvas() {
  const canvasRef = firestore.collection('canvases').doc('main-canvas');
  
  await canvasRef.update({
    height: 1000,
  });
  
  console.log('Canvas fixed - added height field');
  
  const doc = await canvasRef.get();
  console.log('Updated canvas:', doc.data());
}

fixCanvas().catch(console.error);

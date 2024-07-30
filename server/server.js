const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Configuration de MongoDB Atlas
const mongoURI = 'mongodb+srv://ambrebarah:Recrutop123!@cluster0.ol5aoz1.mongodb.net/';
mongoose.connect(mongoURI, {
  ssl: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const recordSchema = new Schema({
  photoUrl: String,
  contactNumber: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  address: String,
  recordingUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', recordSchema);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Configuration AWS S3
const s3 = new S3Client({
  credentials: {
    accessKeyId: 'AKIAQE43JVAQCSZLN6ZB',
    secretAccessKey: '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'
  },
  region: 'eu-north-1'
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadToS3 = async (file) => {
  const fileName = uuidv4() + path.extname(file.originalname);
  const params = {
    Bucket: 'myappwac',
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  const command = new PutObjectCommand(params);
  try {
    await s3.send(command);
    console.log(`File uploaded successfully to S3: ${fileName}`);
    return `https://${params.Bucket}.s3.${s3.config.region}.amazonaws.com/${fileName}`;
  } catch (err) {
    console.error('Error uploading file to S3:', err);
    throw new Error('Failed to upload file');
  }
};

// Endpoint pour obtenir tous les enregistrements
app.get('/get_records', async (req, res) => {
  try {
    console.log('Fetching all records...');
    const records = await Record.find();
    console.log('Records fetched:', records);
    res.status(200).json({ success: true, records });
  } catch (err) {
    console.error('Error fetching records:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch records' });
  }
});

// Endpoint pour supprimer un enregistrement
app.delete('/delete_record/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Deleting record with ID: ${id}`);
  try {
    await Record.findByIdAndDelete(id);
    console.log(`Record with ID: ${id} deleted successfully`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ success: false, error: 'Failed to delete record' });
  }
});

// Endpoint pour gérer les photos, les informations de contact, la localisation, et les enregistrements
app.post('/save_data', upload.fields([{ name: 'photo' }, { name: 'recording' }]), async (req, res) => {
  const { contactNumber, location, address } = req.body;
  const photo = req.files.photo ? req.files.photo[0] : null;
  const recording = req.files.recording ? req.files.recording[0] : null;

  console.log('Received data:', { contactNumber, location, address, photo, recording });

  if (!photo || !contactNumber || !location || !address) {
    console.log('Missing required fields');
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    console.log('Uploading photo to S3...');
    const photoUrl = await uploadToS3(photo);
    console.log('Photo uploaded to S3:', photoUrl);

    const recordingUrl = recording ? await uploadToS3(recording) : null;
    if (recordingUrl) {
      console.log('Recording uploaded to S3:', recordingUrl);
    }

    // Créer une instance de Record et l'enregistrer dans MongoDB
    const newRecord = new Record({
      photoUrl,
      contactNumber,
      location: JSON.parse(location),
      address,
      recordingUrl
    });

    console.log('Saving new record to MongoDB...');
    await newRecord.save();
    console.log('New record saved successfully:', newRecord);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

// Endpoint de test pour vérifier la connexion AWS S3
app.get('/test_s3', async (req, res) => {
  const testFilePath = path.join(__dirname, 'test.jpg');
  const testFileContent = fs.readFileSync(testFilePath);
  
  const params = {
    Bucket: 'myappwac',
    Key: 'test-' + uuidv4() + '.jpg',
    Body: testFileContent,
    ContentType: 'image/jpeg',
    ACL: 'public-read'
  };

  const command = new PutObjectCommand(params);
  try {
    const data = await s3.send(command);
    console.log('Test file uploaded successfully:', data);
    res.status(200).json({ success: true, message: 'Test file uploaded successfully', data });
  } catch (err) {
    console.error('Error uploading test file to S3:', err);
    res.status(500).json({ success: false, error: 'Failed to upload test file', details: err.message });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

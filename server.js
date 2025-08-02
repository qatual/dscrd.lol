const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');
const app = express();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
};
connectDB();

const Url = mongoose.model('Url', new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortPath: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
}));

app.use(express.json());
app.use(express.static('public'));

app.post('/qatual/static/shorten', async (req, res) => {
  const { url, customPath } = req.body;
  if (!validUrl.isWebUri(url)) return res.status(400).json({ error: 'Invalid URL' });
  
  try {
    let shortPath = customPath || shortid.generate();
    while (await Url.exists({ shortPath })) {
      shortPath = shortid.generate();
    }
    
    await Url.create({ originalUrl: url, shortPath });
    res.json({ shortUrl: `https://dscrd.lol/${shortPath}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/:path', async (req, res) => {
  try {
    const url = await Url.findOne({ shortPath: req.params.path });
    url ? res.redirect(url.originalUrl) : res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

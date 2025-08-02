const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');
const app = express();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dscrdlol', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Url = mongoose.model('Url', new mongoose.Schema({
    originalUrl: { type: String, required: true },
    shortPath: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
}));

app.use(express.json());
app.use(express.static('public'));

app.post('/qatual/static/shorten', async (req, res) => {
    const { url, customPath } = req.body;
    
    if (!validUrl.isWebUri(url)) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
        let shortPath = customPath || shortid.generate();
        const existing = await Url.findOne({ shortPath });
        if (existing) shortPath = shortid.generate();

        const newUrl = new Url({ originalUrl: url, shortPath });
        await newUrl.save();

        res.json({
            originalUrl: url,
            shortPath,
            shortUrl: `https://dscrd.lol/${shortPath}`
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/:path', async (req, res) => {
    try {
        const url = await Url.findOne({ shortPath: req.params.path });
        if (url) return res.redirect(url.originalUrl);
        res.status(404).json({ error: 'URL not found' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

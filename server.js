const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');
const app = express();

// Connect to MongoDB (for permanent storage)
mongoose.connect('mongodb://localhost:27017/dscrdlol', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// URL model
const Url = mongoose.model('Url', new mongoose.Schema({
    originalUrl: { type: String, required: true },
    shortPath: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
}));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// API endpoint to shorten URL
app.post('/api/shorten', async (req, res) => {
    const { url, customPath } = req.body;
    
    // Validate URL
    if (!validUrl.isWebUri(url)) {
        return res.status(400).json({ error: 'Invalid URL' });
    }
    
    try {
        let shortPath;
        
        // Check if custom path is provided and available
        if (customPath) {
            const existing = await Url.findOne({ shortPath: customPath });
            if (existing) {
                return res.status(400).json({ error: 'Custom path already in use' });
            }
            shortPath = customPath;
        } else {
            // Generate a random path
            shortPath = shortid.generate();
            
            // Ensure it's unique (very unlikely to conflict with shortid)
            const existing = await Url.findOne({ shortPath });
            if (existing) {
                shortPath = shortid.generate(); // Try again
            }
        }
        
        // Create and save the URL
        const newUrl = new Url({
            originalUrl: url,
            shortPath
        });
        
        await newUrl.save();
        
        res.json({
            originalUrl: url,
            shortPath,
            shortUrl: `https://dscrd.lol/${shortPath}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Redirect endpoint
app.get('/:path', async (req, res) => {
    try {
        const url = await Url.findOne({ shortPath: req.params.path });
        
        if (url) {
            // Update analytics if needed (not implemented here)
            return res.redirect(url.originalUrl);
        } else {
            return res.status(404).send('URL not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
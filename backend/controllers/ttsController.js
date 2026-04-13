export const getAudio = async (req, res) => {
    try {
        const text = req.query.text;
        if (!text) return res.status(400).json({ error: "Missing text" });

        // Cắt chuỗi để đảm bảo không bị quá giới hạn của Google API
        const safeText = text.substring(0, 200);
        const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=vi&q=${encodeURIComponent(safeText)}`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Google TTS responded with ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("TTS Proxy Error:", error);
        res.status(500).json({ error: "Failed to fetch TTS" });
    }
};

// Proxy external MP3s to bypass Hotlink/CORS protections
export const proxyExternalAudio = async (req, res) => {
    try {
        const audioUrl = req.query.url;
        if (!audioUrl) return res.status(400).json({ error: "Missing url" });

        const response = await fetch(audioUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.bensound.com/'
            }
        });

        if (!response.ok) {
            throw new Error(`External Audio responded with ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error("Audio Proxy Error:", error);
        res.status(500).json({ error: "Failed to fetch audio" });
    }
};

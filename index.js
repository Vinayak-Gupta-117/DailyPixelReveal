// llm-backend/server.js
require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs'); // Node.js File System module
const path = require('path'); // Node.js Path module

const app = express();
const port = 3000; // This is the port your backend will listen on

// --- Middleware ---
app.use(cors()); // Allow requests from your frontend (e.g., localhost:8000)
app.use(express.json()); // To parse JSON bodies from frontend requests

// --- Gemini API Initialization ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Model for vision (image to text) - This remains for image description
const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Word Embeddings (Word2Vec/GloVe Integration) ---
let wordVectors = {}; // This will store our word vectors

// Path to store daily puzzle data
const DAILY_PUZZLE_DATA_FILE = path.join(__dirname, 'daily_puzzles.json');
let dailyPuzzlesCache = {}; // In-memory cache for daily puzzles

/**
 * Loads pre-trained word embeddings from a file.
 * Expects a file where each line is "word vector_value1 vector_value2 ..."
 * Example: GloVe .txt files (e.g., glove.6B.50d.txt)
 */
async function loadWordEmbeddings() {
    console.log("Attempting to load word embeddings from file...");
    // IMPORTANT: Place your downloaded Word2Vec/GloVe .txt file (e.g., glove.6B.50d.txt)
    // in the same directory as this server.js file.
    const embeddingsFileName = 'glove.6B.50d.txt'; // <--- CHANGE THIS if your file has a different name
    const embeddingsFilePath = path.join(__dirname, embeddingsFileName);

    try {
        if (!fs.existsSync(embeddingsFilePath)) {
            throw new Error(`Embedding file not found: ${embeddingsFilePath}. Please ensure it's in the same directory as server.js.`);
        }

        const data = fs.readFileSync(embeddingsFilePath, 'utf8');
        const lines = data.split('\n');
        let loadedCount = 0;

        lines.forEach(line => {
            const parts = line.split(' ');
            const word = parts[0];
            // Convert remaining parts to numbers for the vector
            const vector = parts.slice(1).map(Number);

            // Basic validation: ensure word exists and vector has at least 2 dimensions
            if (word && vector.length > 1 && !isNaN(vector[0])) {
                wordVectors[word] = vector;
                loadedCount++;
            }
        });
        console.log(`Successfully loaded ${loadedCount} word embeddings.`);
        if (loadedCount === 0) {
            console.warn("No embeddings were loaded. Please check the file format and content.");
        }
    } catch (error) {
        console.error("Critical error loading word embeddings:", error);
        console.error("Server will start without word embeddings. Closeness checks will default to 'not close'.");
        // Clear wordVectors to ensure no partial or invalid data is used
        wordVectors = {};
    }
}

/**
 * Loads daily puzzle data from the JSON file into memory cache.
 */
function loadDailyPuzzlesFromFile() {
    try {
        if (fs.existsSync(DAILY_PUZZLE_DATA_FILE)) {
            const data = fs.readFileSync(DAILY_PUZZLE_DATA_FILE, 'utf8');
            dailyPuzzlesCache = JSON.parse(data);
            console.log("Loaded daily puzzle data from file.");
        } else {
            console.log("Daily puzzle data file not found. Starting with empty cache.");
            dailyPuzzlesCache = {};
        }
    } catch (error) {
        console.error("Error loading daily puzzles from file:", error);
        dailyPuzzlesCache = {}; // Reset cache on error to prevent issues
    }
}

/**
 * Saves current daily puzzle data from memory cache to the JSON file.
 */
function saveDailyPuzzlesToFile() {
    try {
        fs.writeFileSync(DAILY_PUZZLE_DATA_FILE, JSON.stringify(dailyPuzzlesCache, null, 2), 'utf8');
        console.log("Saved daily puzzle data to file.");
    } catch (error) {
        console.error("Error saving daily puzzles to file:", error);
    }
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param {number[]} vec1
 * @param {number[]} vec2
 * @returns {number} Cosine similarity (between -1 and 1)
 */
function cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
        return 0; // Vectors must exist and have the same dimensions
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        magnitude1 += vec1[i] * vec1[i];
        magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0; // Avoid division by zero if a vector is zero (unlikely for real embeddings)
    }

    return dotProduct / (magnitude1 * magnitude2);
}

// Safety settings for Gemini responses (remains for vision model)
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Helper to convert image URL to base64 for Gemini Vision
async function getBase64Image(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

// --- API Endpoint 1: Get Daily Word (Image processing with Vision LLM) ---
app.get('/api/get-daily-word', async (req, res) => {
    // Get today's date in YYYY-MM-DD UTC format
    const todayUtc = new Date().toISOString().slice(0, 10);
    // Check for forceNew query parameter
    const forceNew = req.query.forceNew === 'true'; // Query parameters are strings

    // If not forced and puzzle for today's UTC date is already in cache, serve it
    if (!forceNew && dailyPuzzlesCache[todayUtc]) {
        console.log(`Serving puzzle for ${todayUtc} from cache.`);
        return res.json(dailyPuzzlesCache[todayUtc]);
    }

    // If forced or not in cache, generate a new puzzle
    console.log(`Generating new puzzle for ${todayUtc}... (Forced: ${forceNew})`);
    try {
        const IMAGE_WIDTH = 600; // Use a reasonable size for LLM processing
        const IMAGE_HEIGHT = 400;

        const unsplashResponse = await fetch(
            `https://api.unsplash.com/photos/random?w=${IMAGE_WIDTH}&h=${IMAGE_HEIGHT}&orientation=landscape&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
        );

        if (!unsplashResponse.ok) {
            throw new Error(`Unsplash API error: ${unsplashResponse.status} - ${unsplashResponse.statusText}`);
        }
        const unsplashData = await unsplashResponse.json();
        const imageUrl = unsplashData.urls.regular;

        const imageBase64 = await getBase64Image(imageUrl);

        const prompt = "Look at this image. Identify one prominent, single-word noun (in English, lowercase) that best describes the main subject or scene. For example, if it's a picture of a dog, respond 'dog'. If it's a mountain range, respond 'mountain'. Choose the most obvious and distinct subject. Only one word, no punctuation, no extra text.";

        const result = await visionModel.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: imageBase64,
                        },
                    },
                ],
            }],
            safetySettings: safetySettings,
        });

        let generatedWord = result.response.text().trim().toLowerCase();

        if (!generatedWord || generatedWord.includes(' ') || generatedWord.length < 3 || generatedWord.length > 15) {
            console.warn(`Gemini did not return a suitable single word ("${generatedWord}"). Falling back to a predefined word.`);
            const fallbackWords = ["sky", "tree", "water", "city", "animal", "flower", "road", "building"];
            generatedWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
        }

        if (!wordVectors[generatedWord]) {
            console.warn(`Generated word "${generatedWord}" not found in loaded embeddings. Attempting to find a close alternative or using a fallback.`);
            let alternativeWord = null;
            const knownWords = Object.keys(wordVectors);
            if (knownWords.length > 0) {
                 alternativeWord = knownWords[Math.floor(Math.random() * knownWords.length)];
                 console.warn(`Falling back to random known word: "${alternativeWord}"`);
            } else {
                const basicFallbackWords = ["photo", "image", "scene"];
                alternativeWord = basicFallbackWords[Math.floor(Math.random() * basicFallbackWords.length)];
                console.warn(`No embeddings loaded, falling back to basic word: "${alternativeWord}"`);
            }
            generatedWord = alternativeWord;
        }

        const newPuzzle = { imageUrl, correctWord: generatedWord };
        dailyPuzzlesCache[todayUtc] = newPuzzle; // Add/overwrite in cache
        saveDailyPuzzlesToFile(); // Persist to file

        res.json(newPuzzle);

    } catch (error) {
        console.error("Error in /api/get-daily-word:", error);
        res.status(500).json({ error: "Failed to generate daily puzzle word." });
    }
});

// --- API Endpoint 2: Check Guess Closeness (Using Word Embeddings) ---
app.post('/api/check-guess-closeness', async (req, res) => {
    const { correctWord, userGuess } = req.body;

    if (!correctWord || !userGuess) {
        return res.status(400).json({ error: "Missing correctWord or userGuess in request body." });
    }

    let closeness = "not close";

    if (userGuess.toLowerCase() === correctWord.toLowerCase()) {
        closeness = "exact match";
    } else {
        if (Object.keys(wordVectors).length === 0) {
            console.warn("Word embeddings not loaded. Closeness check defaulting to 'not close'.");
            return res.json({ closeness: "not close" });
        }

        const correctVector = wordVectors[correctWord.toLowerCase()];
        const guessVector = wordVectors[userGuess.toLowerCase()];

        if (correctVector && guessVector) {
            const similarity = cosineSimilarity(correctVector, guessVector);
            console.log(`Similarity between "${correctWord}" and "${userGuess}": ${similarity}`);

            if (similarity >= 0.85) {
                closeness = "very close";
            } else if (similarity >= 0.65) {
                closeness = "somewhat close";
            } else {
                closeness = "not close";
            }
        } else {
            console.warn(`No vector found for "${correctWord.toLowerCase()}" or "${userGuess.toLowerCase()}" in loaded embeddings. Defaulting to "not close".`);
            closeness = "not close";
        }
    }

    res.json({ closeness });
});

// --- Start Server ---
// Load embeddings and daily puzzles before starting the server
Promise.all([
    loadWordEmbeddings(),
    loadDailyPuzzlesFromFile() // Load existing daily puzzles on startup
]).then(() => {
    app.listen(port, () => {
        console.log(`Backend server listening at http://localhost:${port}`);
    });
}).catch(error => {
    console.error("Failed to start server due to initialization error:", error);
});

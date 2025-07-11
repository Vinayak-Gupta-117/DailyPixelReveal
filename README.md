# 🖼️ Daily Pixel Reveal 🧩
Uncover the hidden word, one pixelated guess at a time!

<img src="https://i.postimg.cc/SsLnSSVb/Screenshot-2025-07-12-000040.png">
<img src="https://i.postimg.cc/YqdmLS7p/Screenshot-2025-07-11-235743.png">

## ✨ About The Project
**Daily Pixel Reveal** is an engaging web-based guessing game where players challenge their semantic intuition and visual recognition skills. Each day, a new mystery image, heavily pixelated, awaits. Your mission? To guess the single word that best describes the image. With every incorrect guess, the image gradually de-pixelates, revealing more clues. Can you uncover the truth before your guesses run out?

This project showcases a full-stack application leveraging modern web technologies and powerful AI APIs to create a unique and interactive daily challenge.

## 🚀 Features
- **Daily Unique Puzzles**: A fresh, AI-generated pixelated image and its corresponding word are available every 24 hours.
- **Progressive Reveal**: The image becomes clearer with each incorrect guess, adding a strategic layer to the gameplay.
- **Semantic Closeness Feedback**: Beyond just "correct" or "wrong," the game provides intelligent feedback on how "close" your guess is to the actual answer, powered by advanced word embeddings.
- **Shareable Results**: After each game, generate a Wordle-style emoji grid to share your performance with friends.
- **Responsive Design**: Enjoy the game seamlessly on desktop, tablet, and mobile devices.
- **Dark Mode Toggle**: Switch between light and dark themes for comfortable viewing at any time.
- **"How to Play" Instructions**: A dedicated in-game guide to help new players get started.

## 🧠 How It Works (Under the Hood)
**Daily Pixel Reveal** is built with a clear separation between its frontend and backend, allowing for robust and scalable architecture.

### Frontend (Browser-Side)
- **HTML**: Structures the game interface.
- **Tailwind CSS**: Provides utility-first styling for a clean, responsive, and modern UI.
- **JavaScript**: Handles all client-side game logic, user interactions, canvas drawing (pixelation effects), and communication with the backend API.

### Backend (Node.js Express Server)
The backend is the brain of the operation, responsible for generating puzzles and evaluating guesses:

- **Node.js & Express**: Provides a fast and unopinionated web server.
- **Google Gemini API (Gemini 2.0 Flash - Vision Model)**:
  - **Image Description**: Used to analyze random images fetched from Unsplash and generate a single, concise noun that accurately describes the image's content. This word becomes the "correct answer" for the daily puzzle.
- **Unsplash API**: Provides a vast library of high-quality, royalty-free images, which are then fed to the Gemini Vision model.
- **Hugging Face Inference API (Sentence Transformers - all-MiniLM-L6-v2)**:
  - **Semantic Closeness**: This API is used to generate vector embeddings for both the correct word and the user's guess, and check their closeness.
  - **Cosine Similarity**: The backend calculates the cosine similarity between these two vectors to determine how semantically close the guess is to the answer (e.g., "very close," "somewhat close," "not close").
- **Supabase Database**: A database system that stores the daily puzzle and fetches it for the players.

## 🎮 How to Play
1. **Observe the Pixelated Image**: A new mystery image appears daily, initially heavily pixelated.
2. **Make Your Guess**: Type a single, common, concrete noun (e.g., "mountain", "cat") into the input field.
3. **Submit**: Click the "Guess" button or press Enter.
4. **Receive Feedback**:
    - 🟢 **Exact Match**: You nailed it! The image fully reveals.
    - 🟡 **Very Close**: Your guess is semantically very similar to the answer.
    - 🟠 **Somewhat Close**: Your guess has some semantic relation.
    - 🔴 **Not Close**: Your guess is unrelated.
5. **Progressive Reveal**: With each incorrect guess, the image de-pixelates further, giving you more clues.
6. **Track Your Guesses**: Your previous guesses and their feedback are listed on the right.
7. **Game Over**: The game ends if you guess correctly (you win!) or if you run out of 7 guesses (you lose). The correct answer is then revealed.
8. **Share Your Score**: Generate a shareable emoji grid to show off your daily challenge results!

## 💻 Technologies Used

### Frontend:
- **HTML5**
- **CSS3**
  - **Tailwind CSS**:
- **JavaScript**:

### Backend:
- **Node.js**
- **Express.js**
- **Google Gemini API (Gemini 2.0 Flash - Vision Model)**: Used to analyze pixelated images and generate concise descriptions.
- **Unsplash API**: Provides access to a collection of high-quality, royalty-free images used in the game.
- **Hugging Face Inference API**: Used to generate word embeddings and calculate semantic similarity between guesses and the correct answer.


## 🙏 Acknowledgements
- **Google Gemini**: For helping me to build this application with its Canvas feature.
- **Google Gemini API**: For providing powerful AI capabilities that enable semantic understanding and image analysis.
- **Unsplash**: For offering beautiful and free-to-use images to inspire the game puzzles.
- **Hugging Face**: For their excellent Inference API and pre-trained models that power semantic analysis and embedding generation.
- **Tailwind CSS**: For making styling a breeze and allowing for rapid prototyping and development of the UI.

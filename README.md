# PreferenceAI

> **Two answers. Your choice. Smarter conversations.**

PreferenceAI is a preference-learning AI chatbot built for demonstrating **K-Nearest Neighbors (KNN)** machine learning and **exploration–exploitation decision-making** in an interactive web interface.

For every question, PreferenceAI generates **two genuinely distinct stylistic answers** from 8 supported styles, lets the user pick their preferred answer, and learns from that choice in real time using **Scikit-learn `KNeighborsClassifier`** and **NumPy** feature vectors.

---

## Architecture Overview

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend:** Python, Flask, Flask-CORS
- **Machine Learning:** Scikit-learn (`KNeighborsClassifier`), NumPy (`8D` style feature vectors), Pairwise Preference Ranking, Epsilon-Greedy Decision Engine with Euclidean diversity constraints
- **AI Generation:** OpenAI Chat Completions API (server-side only via Python `openai` SDK)
- **Storage:** **No database** (no SQL, MongoDB, or Firebase). All preference samples live strictly in temporary Flask RAM.

### Supported 8 Answer Styles
1. `Simple Explanation`
2. `Detailed Explanation`
3. `Technical Explanation`
4. `Example-Based Explanation`
5. `Short Answer`
6. `Step-by-Step Explanation`
7. `Professional Explanation`
8. `Beginner-Friendly Explanation`

Each style is represented by a unique 8-dimensional numerical vector across `[Simple, Detailed, Technical, Examples, Step-by-step, Professional, Beginner-friendly, Short]`.

### In-Memory & Single-User Prototype Notes
- Preferences are stored only in Python backend RAM and are **lost when the Flask server restarts**.
- Clicking **Clear Prefs / Reset Preferences** (`POST /reset`) clears all learned preference samples and resets the KNN model.
- This project is designed as a **single-user learning prototype**. Supporting multiple concurrent users would require isolated per-user or per-session preference memory.

### Documented Limitations of Feature-Based KNN
1. **Context-Agnostic Style Vectors:** Static 8D style features do not depend on the question's subject domain.
2. **Cold-Start Sensitivity:** Initial turns rely on heuristic exploration before enough user choices are recorded.
3. **Uniform Euclidean Distance:** All 8 stylistic dimensions carry equal geometric weight without metric learning.
4. **Small-Sample Variance:** With very few feedback pairs, a single preference vote can shift neighbor probabilities noticeably.

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
```

Optionally create `.env` in the project root from `.env.example`:

```env
VITE_API_URL=http://127.0.0.1:5000
```

> Never commit `.env` or expose `OPENAI_API_KEY` in React/browser code.

---

## Running Frontend and Backend Separately

### 1. Start the Python Flask Backend (Port 5000)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your OPENAI_API_KEY
python app.py
```

The Flask API will run at `http://127.0.0.1:5000`.

### 2. Start the React + Vite Frontend (Port 3000)

In a second terminal from the project root:

```bash
npm install
VITE_API_URL=http://127.0.0.1:5000 npx vite --port=3000 --host=0.0.0.0
```

Or run the unified full-stack bridge (auto-starts Flask + serves Vite & `/api` proxy on port 3000):

```bash
npm run dev
```

---

## Flask API Endpoints

| Method | Endpoint  | Description |
| ------ | --------- | ----------- |
| `GET`  | `/`       | Backend health check & API key configuration status |
| `POST` | `/ask`    | Selects 2 distinct styles via DecisionEngine & generates 2 answers via OpenAI |
| `POST` | `/choose` | Records preferred answer (`A` or `B`) & refits Scikit-learn KNN |
| `GET`  | `/stats`  | Returns real comparisons, sample counts, KNN scores & recent history |
| `POST` | `/reset`  | Clears in-memory preference samples & resets decision engine |
| `POST` | `/config` | Updates runtime `n_neighbors` (`k`) and `exploration_rate` (`ε`) |

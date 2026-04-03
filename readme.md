# DocuMind — AI-Powered Document Analysis & Extraction

> Intelligent document processing system that extracts, analyses, and summarises content from PDF, DOCX, and image files using AI.

**Live Demo:** https://doc-analyzer-cbsk.onrender.com  
**GitHub:** https://github.com/coder-vishnu-176/doc-analyzer

---

## 🚀 Features

- 📄 Upload and analyse **PDF**, **DOCX**, and **Image** files
- 🤖 AI-powered **summarisation** and **entity extraction**
- 😊 **Sentiment analysis** (Positive / Negative / Neutral)
- 🏷️ Extracts **names, dates, organizations, and amounts**
- 🔐 API key authentication
- 🌐 REST API with clean JSON responses

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, Flask |
| AI / LLM | Groq API (Llama 3) |
| PDF Parsing | PyMuPDF (fitz) |
| DOCX Parsing | python-docx |
| Image Processing | Pillow (PIL) |
| Deployment | Render |
| Environment | python-dotenv |

---

## 🤖 AI Tools Used

| Tool | Purpose |
|------|---------|
| **Claude (Anthropic)** | Used for coding assistance, debugging, and development support |
| **Groq API (Llama 3)** | Used at runtime for document analysis, summarisation, entity extraction, and sentiment analysis |

> ⚠️ As per the AI Tool Policy, all AI tools used in this project are disclosed above.

---

## 🏗️ Architecture Overview

```
Client (Browser)
      │
      ▼
Flask Web App (src/main.py)
      │
      ├── POST /api/document-analyze
      │         │
      │         ├── Auth check (x-api-key header)
      │         ├── Base64 decode file
      │         ├── Detect file type (PDF / DOCX / Image)
      │         ├── Extract text
      │         │     ├── PDF  → PyMuPDF
      │         │     ├── DOCX → python-docx
      │         │     └── IMG  → Pillow + base64
      │         └── Send text to Groq (Llama 3)
      │                   │
      │                   └── Returns JSON:
      │                         summary, entities, sentiment
      │
      └── GET / → Serves frontend UI (templates/index.html)
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.9+
- Groq API Key (free at https://console.groq.com)

### 1. Clone the Repository

```bash
git clone https://github.com/coder-vishnu-176/doc-analyzer.git
cd doc-analyzer
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the project root (refer to `.env.example`):

```env
GROQ_API_KEY=your_groq_api_key_here
HACKATHON_API_KEY=sk_track2_987654321
PORT=5000
```

### 4. Run the Application

```bash
python src/main.py
```

Visit `http://localhost:5000` in your browser.

---

## 📡 API Reference

### POST `/api/document-analyze`

**Headers:**
```
x-api-key: sk_track2_987654321
Content-Type: application/json
```

**Request Body:**
```json
{
  "fileName": "sample.pdf",
  "fileData": "<base64-encoded-file-content>"
}
```

**Response:**
```json
{
  "status": "success",
  "fileName": "sample.pdf",
  "summary": "This document discusses...",
  "entities": {
    "names": ["John Doe"],
    "dates": ["2024-01-01"],
    "organizations": ["TechCorp"],
    "amounts": ["$5000"]
  },
  "sentiment": "Positive"
}
```

---

## ⚠️ Known Limitations

- Large files (>10MB) may cause slow response times on free-tier hosting
- Image-based PDFs (scanned documents) may have reduced extraction accuracy
- Groq API has rate limits on the free tier
- The app may have a cold start delay of ~30 seconds on Render's free tier

---

## 📁 Project Structure

```
doc-analyzer/
├── src/
│   └── main.py             # Main Flask application
├── static/
│   ├── script.js           # Frontend JavaScript
│   └── style.css           # Styling
├── templates/
│   └── index.html          # Frontend UI
├── .env                    # Environment variables (not committed)
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore rules
├── packages.txt            # System packages
├── render.yaml             # Render deployment config
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation
```

---

## 👨‍💻 Author

**Vishnu Vardhan N.M** — [GitHub](https://github.com/coder-vishnu-176)

---

## 📄 License

This project was built for hackathon purposes.
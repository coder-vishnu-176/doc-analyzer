# Data Extraction API

## Description
An AI-powered document analysis API that extracts key information from PDF, DOCX, and image files. It uses OCR for image text extraction and a large language model (LLaMA 3.3 70B via Groq) for summarisation, named entity extraction, and sentiment analysis.

## Tech Stack
- **Language/Framework:** Python, Flask
- **OCR:** Tesseract
- **Document Parsing:** PyMuPDF (PDF), python-docx (DOCX), Pillow (images)
- **LLM/AI Model:** LLaMA 3.3 70B via Groq API

## Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/your-username/doc-analyzer.git
cd doc-analyzer
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Install Tesseract OCR
- **Windows:** Download from https://github.com/UB-Mannheim/tesseract/wiki
- **Linux:** `sudo apt install tesseract-ocr`

4. Set environment variables
```bash
cp .env.example .env
# Edit .env and add your actual API keys
```

5. Run the application
```bash
python src/main.py
```

## API Usage

### Endpoint
```
POST /api/document-analyze
```

### Headers
```
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

### Request Body
```json
{
  "fileName": "sample.pdf",
  "fileType": "pdf",
  "fileBase64": "<base64-encoded-file>"
}
```

### Response
```json
{
  "status": "success",
  "fileName": "sample.pdf",
  "summary": "AI-generated summary of the document.",
  "entities": {
    "names": ["John Doe"],
    "dates": ["10 March 2026"],
    "organizations": ["ABC Pvt Ltd"],
    "amounts": ["₹10,000"]
  },
  "sentiment": "Neutral"
}
```

## Approach

- **PDF:** Text extracted using PyMuPDF (fitz) preserving layout
- **DOCX:** Paragraphs extracted using python-docx
- **Images:** OCR performed using Tesseract via pytesseract
- **Summary, Entities & Sentiment:** Extracted using LLaMA 3.3 70B (via Groq API) with a structured JSON prompt ensuring consistent output format
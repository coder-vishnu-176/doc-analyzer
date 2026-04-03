import os
import io
import json
import base64
import pytesseract
import fitz  # PyMuPDF
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from docx import Document
from PIL import Image
from groq import Groq
from dotenv import load_dotenv

# Load the API key from .env file
load_dotenv()

# Tesseract path — works on both Windows (local) and Linux (Render)
tesseract_path = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")
pytesseract.pytesseract.tesseract_cmd = tesseract_path

# Create the Flask app — template folder points up one level from src/
app = Flask(__name__, template_folder="../templates", static_folder="../static")
CORS(app)

# Create Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# API key for hackathon endpoint (set this in your .env as HACKATHON_API_KEY)
HACKATHON_API_KEY = os.getenv("HACKATHON_API_KEY", "sk_track2_987654321")

# ─── Text Extraction Functions ───────────────────────────────────────────────

def extract_from_pdf(file_bytes):
    text = ""
    pdf = fitz.open(stream=file_bytes, filetype="pdf")
    for page in pdf:
        text += page.get_text()
    return text

def extract_from_docx(file_bytes):
    doc = Document(io.BytesIO(file_bytes))
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

def extract_from_image(file_bytes):
    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)
    return text

# ─── Groq AI Analysis Function ───────────────────────────────────────────────

def analyze_with_groq(text):
    prompt = f"""
You are a document analysis assistant. Analyze the following text and return a JSON response with exactly these 3 fields:

1. "summary" - A clear, concise summary of the document in 3-5 sentences.
2. "entities" - An object with exactly these 4 keys:
   - "names": list of person names found
   - "dates": list of dates found
   - "organizations": list of organization names found
   - "amounts": list of monetary amounts found
3. "sentiment" - Overall sentiment: exactly one of "Positive", "Negative", or "Neutral"

Return ONLY a valid JSON object. No extra text, no markdown, no code blocks.

Text to analyze:
{text[:3000]}
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a document analysis assistant. Always respond with valid JSON only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3,
        max_tokens=1000
    )

    response_text = response.choices[0].message.content.strip()
    response_text = response_text.replace("```json", "").replace("```", "").strip()
    result = json.loads(response_text)
    return result

# ─── UI Routes ───────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    """Original UI endpoint — accepts file upload"""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename.lower()
    file_bytes = file.read()

    try:
        if filename.endswith(".pdf"):
            text = extract_from_pdf(file_bytes)
        elif filename.endswith(".docx"):
            text = extract_from_docx(file_bytes)
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            text = extract_from_image(file_bytes)
        else:
            return jsonify({"error": "Unsupported file type"}), 400
    except Exception as e:
        return jsonify({"error": f"File extraction failed: {str(e)}"}), 500

    if not text.strip():
        return jsonify({"error": "No text could be extracted from this file"}), 400

    try:
        result = analyze_with_groq(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"AI analysis failed: {str(e)}"}), 500


# ─── Hackathon API Endpoint ───────────────────────────────────────────────────

@app.route("/api/document-analyze", methods=["POST"])
def document_analyze():
    """
    Hackathon REST API endpoint.
    Accepts base64-encoded documents via JSON body.
    Requires x-api-key header for authentication.
    """

    # Step 1: Authenticate
    api_key = request.headers.get("x-api-key")
    if not api_key or api_key != HACKATHON_API_KEY:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    # Step 2: Parse request body
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

    file_name = data.get("fileName")
    file_type = data.get("fileType", "").lower()
    file_base64 = data.get("fileBase64")

    if not file_name or not file_type or not file_base64:
        return jsonify({
            "status": "error",
            "message": "Missing required fields: fileName, fileType, fileBase64"
        }), 400

    if file_type not in ("pdf", "docx", "image"):
        return jsonify({
            "status": "error",
            "message": "Unsupported fileType. Use: pdf, docx, or image"
        }), 400

    # Step 3: Decode base64
    try:
        file_bytes = base64.b64decode(file_base64)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid base64 encoding"}), 400

    # Step 4: Extract text
    try:
        if file_type == "pdf":
            text = extract_from_pdf(file_bytes)
        elif file_type == "docx":
            text = extract_from_docx(file_bytes)
        elif file_type == "image":
            text = extract_from_image(file_bytes)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Text extraction failed: {str(e)}"}), 500

    if not text.strip():
        return jsonify({"status": "error", "message": "No text could be extracted from the document"}), 400

    # Step 5: Analyze with Groq
    try:
        result = analyze_with_groq(text)
    except Exception as e:
        return jsonify({"status": "error", "message": f"AI analysis failed: {str(e)}"}), 500

    # Step 6: Return response in exact spec format
    return jsonify({
        "status": "success",
        "fileName": file_name,
        "summary": result.get("summary", ""),
        "entities": {
            "names": result.get("entities", {}).get("names", []),
            "dates": result.get("entities", {}).get("dates", []),
            "organizations": result.get("entities", {}).get("organizations", []),
            "amounts": result.get("entities", {}).get("amounts", [])
        },
        "sentiment": result.get("sentiment", "Neutral")
    })


# ─── Run the app ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=False)
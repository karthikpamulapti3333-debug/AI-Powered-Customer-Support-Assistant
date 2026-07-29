import os
import re
from typing import List
from app.config.settings import settings

def clean_text(text: str) -> str:
    """Cleans up white spaces and format characters."""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_txt(file_path: str) -> str:
    """Reads content of a plain text file."""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def extract_pdf(file_path: str) -> str:
    """Extracts text from a PDF file using pypdf if available, else throws error."""
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except ImportError:
        # Fallback if pypdf is not installed
        raise ImportError("pypdf library is required for PDF text extraction. Add it to requirements.txt.")

def extract_docx(file_path: str) -> str:
    """Extracts text from a Word DOCX file using docx if available, else throws error."""
    try:
        import docx
        doc = docx.Document(file_path)
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        return "\n".join(text)
    except ImportError:
        raise ImportError("python-docx library is required for Word document text extraction. Add it to requirements.txt.")

def extract_text_from_file(file_path: str) -> str:
    """Wrapper to detect extension and extract text."""
    _, ext = os.path.splitext(file_path.lower())
    if ext == '.txt':
        return clean_text(extract_txt(file_path))
    elif ext == '.pdf':
        return clean_text(extract_pdf(file_path))
    elif ext == '.docx':
        return clean_text(extract_docx(file_path))
    else:
        raise ValueError(f"Unsupported file type: {ext}")

def chunk_text(text: str, chunk_size: int = settings.CHUNK_SIZE, overlap: int = settings.CHUNK_OVERLAP) -> List[str]:
    """Splits long text into overlapping chunks of defined length."""
    if not text:
        return []
        
    chunks = []
    start = 0
    text_len = len(text)
    
    if text_len <= chunk_size:
        return [text]
        
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        start += chunk_size - overlap
        
    return chunks

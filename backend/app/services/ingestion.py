import fitz  # PyMuPDF
from docx import Document
from pptx import Presentation
import pytesseract
from PIL import Image
import io
import os
import re

# Point pytesseract directly at the installed binary - bypasses PATH
# entirely, which is more reliable than editing system PATH on Windows.
# Adjust this path if Tesseract was installed somewhere else.
_tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(_tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = _tesseract_path

# Matches heading-style lines like "Chapter 3", "CHAPTER III", "Unit I",
# "Ch. 5", optionally followed by a title on the same line. Numbers can be
# Arabic (3) or Roman (I, II, III, IV...) since both are common in academic
# documents (the CBSE syllabus we tested against used "Unit I" / "Unit II").
_CHAPTER_HEADING_RE = re.compile(
    r'^\s*(chapter|unit|ch\.?)\s+([0-9]+|[ivxlcdm]+)\b.*$',
    re.IGNORECASE | re.MULTILINE
)


class ContentExtractionError(Exception):
    """Raised when a file can't be parsed or read as the expected type."""
    pass


def _roman_to_int(s: str) -> int:
    """Convert a Roman numeral string to an int. Returns 0 if invalid."""
    values = {'i': 1, 'v': 5, 'x': 10, 'l': 50, 'c': 100, 'd': 500, 'm': 1000}
    s = s.lower()
    total = 0
    prev = 0
    for ch in reversed(s):
        if ch not in values:
            return 0
        val = values[ch]
        total += val if val >= prev else -val
        prev = val
    return total


def _normalize_chapter_number(token: str) -> int:
    """Turn '3' or 'III' into 3, for comparing against the user's request."""
    if token.isdigit():
        return int(token)
    return _roman_to_int(token)


class ContentIngestionService:
    @staticmethod
    def extract_chapter(full_text: str, chapter_identifier: str) -> str:
        """
        Best-effort chapter/unit extraction from already-extracted text.
        This is heuristic pattern matching on heading-like lines (e.g.
        "Chapter 3", "Unit III") - not true document structure parsing,
        since PDF/DOCX/PPTX don't expose chapter boundaries as data.
        Accuracy depends entirely on how consistently the source document
        labels its chapters/units.
        """
        target = _normalize_chapter_number(chapter_identifier.strip())
        if target == 0:
            raise ContentExtractionError(
                f"Could not understand chapter identifier '{chapter_identifier}'. "
                f"Use a number (e.g. '3') or Roman numeral (e.g. 'III')."
            )

        matches = list(_CHAPTER_HEADING_RE.finditer(full_text))
        if not matches:
            raise ContentExtractionError(
                "No chapter/unit headings were detected in this document, so "
                "chapter-based extraction isn't possible here. Try 'Entire "
                "Document' or, for PDFs, 'By Page Numbers' instead."
            )

        for i, m in enumerate(matches):
            heading_num = _normalize_chapter_number(m.group(2))
            if heading_num == target:
                start = m.start()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
                chunk = full_text[start:end].strip()
                if chunk:
                    return chunk

        raise ContentExtractionError(
            f"Chapter/unit '{chapter_identifier}' was not found in this document's "
            f"detected headings. Check the exact chapter/unit number and try again."
        )

    @staticmethod
    def extract_from_pdf(file_bytes: bytes, page_range: str = None) -> str:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise ContentExtractionError(f"Could not open file as PDF: {e}")

        try:
            extracted_text = []

            pages = range(len(doc))
            if page_range:
                try:
                    start, end = map(int, page_range.split('-'))
                    if start < 1:
                        raise ValueError("page_range start must be >= 1")
                    pages = range(start - 1, min(end, len(doc)))
                except ValueError:
                    # Malformed or out-of-range page_range - fall back to
                    # the full document rather than silently misreading it.
                    pages = range(len(doc))

            # Render at 2x zoom for OCR fallback - default 72 DPI is
            # noticeably worse for Tesseract accuracy on scanned pages.
            ocr_matrix = fitz.Matrix(2, 2)

            for page_num in pages:
                text = doc[page_num].get_text()
                if not text.strip():  # Fallback to OCR if page is scanned/image
                    pix = doc[page_num].get_pixmap(matrix=ocr_matrix)
                    img = Image.open(io.BytesIO(pix.tobytes()))
                    try:
                        text = pytesseract.image_to_string(img)
                    except Exception as e:
                        raise ContentExtractionError(
                            f"OCR failed on page {page_num + 1}: {e}. "
                            f"Check that the Tesseract OCR engine is installed and on PATH "
                            f"(pytesseract only wraps it - it doesn't include it)."
                        )
                extracted_text.append(f"--- Page {page_num + 1} ---\n" + text)

            return "\n".join(extracted_text)
        finally:
            doc.close()

    @staticmethod
    def extract_from_docx(file_bytes: bytes) -> str:
        try:
            doc = Document(io.BytesIO(file_bytes))
        except Exception as e:
            raise ContentExtractionError(f"Could not open file as DOCX: {e}")
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

    @staticmethod
    def extract_from_pptx(file_bytes: bytes) -> str:
        try:
            prs = Presentation(io.BytesIO(file_bytes))
        except Exception as e:
            raise ContentExtractionError(f"Could not open file as PPTX: {e}")

        text_runs = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    text_runs.append(shape.text)
        return "\n".join(text_runs)

    @staticmethod
    def extract_from_image(file_bytes: bytes) -> str:
        try:
            img = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            raise ContentExtractionError(f"Could not open file as an image: {e}")

        try:
            return pytesseract.image_to_string(img)
        except Exception as e:
            raise ContentExtractionError(
                f"OCR failed: {e}. Check that the Tesseract OCR engine is installed "
                f"and on PATH (pytesseract only wraps it - it doesn't include it)."
            )

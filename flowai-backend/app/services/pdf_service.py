import io
import fitz  # PyMuPDF
import pdfplumber

def extract_text_from_pdf(file_bytes: bytes) -> str:
	# Ưu tiên pdfplumber (thường giữ bố cục dòng tốt)
	try:
		texts = []
		with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
			for page in pdf.pages:
				texts.append(page.extract_text() or "")
		text = "\n".join(texts).strip()
		if text:
			return text
	except Exception:
		pass

	# Fallback: PyMuPDF
	doc = fitz.open(stream=file_bytes, filetype="pdf")
	out = []
	for page in doc:
		out.append(page.get_text("text"))
	return "\n".join(out).strip()

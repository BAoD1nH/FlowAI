from typing import List

def split_chunks(text: str, max_chars: int = 8000) -> List[str]:
	parts = []
	buf = []
	size = 0
	for para in text.split("\n"):
		if size + len(para) + 1 > max_chars:
			parts.append("\n".join(buf).strip())
			buf, size = [para], len(para) + 1
		else:
			buf.append(para)
			size += len(para) + 1
	if buf:
		parts.append("\n".join(buf).strip())
	return [p for p in parts if p]

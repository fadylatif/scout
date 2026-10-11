import magic

def detect_mime_type(file_bytes: bytes) -> str:
    """Detects the real MIME type from file content headers (not file extension)."""
    mime = magic.Magic(mime=True)
    return mime.from_buffer(file_bytes)

def is_allowed_file_type(file_bytes: bytes, allowed_mimes: list[str]) -> tuple[bool, str]:
    """Validates if the file content matches allowed MIME types."""
    detected = detect_mime_type(file_bytes)
    return (detected in allowed_mimes, detected)

import io
import qrcode

def generate_qr_png_bytes(data: str, box_size: int = 10, border: int = 2) -> bytes:
    """Generates a high-quality QR code image as PNG bytes."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#1b4332", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()

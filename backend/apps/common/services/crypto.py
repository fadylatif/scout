import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from django.conf import settings

def get_fernet_instance(custom_key: str = None) -> Fernet:
    """Returns a Fernet instance using BACKUP_ENCRYPTION_KEY or custom key."""
    raw_key = custom_key or getattr(settings, 'BACKUP_ENCRYPTION_KEY', None)
    if not raw_key:
        raw_key = "default-scout-backup-encryption-key-dev"

    # Derive a valid 32-byte url-safe base64 key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'scout_backup_salt_2026',
        iterations=100_000,
    )
    derived_key = base64.urlsafe_b64encode(kdf.derive(raw_key.encode()))
    return Fernet(derived_key)

def encrypt_bytes(data: bytes, custom_key: str = None) -> bytes:
    """Encrypts raw bytes using AES-CBC/Fernet."""
    f = get_fernet_instance(custom_key)
    return f.encrypt(data)

def decrypt_bytes(token: bytes, custom_key: str = None) -> bytes:
    """Decrypts ciphertext bytes back to plain bytes."""
    f = get_fernet_instance(custom_key)
    return f.decrypt(token)

def encrypt_file(input_path: str, output_path: str, custom_key: str = None) -> str:
    """Encrypts a file on disk."""
    with open(input_path, 'rb') as f_in:
        encrypted_data = encrypt_bytes(f_in.read(), custom_key)
    with open(output_path, 'wb') as f_out:
        f_out.write(encrypted_data)
    return output_path

def decrypt_file(input_path: str, output_path: str, custom_key: str = None) -> str:
    """Decrypts an encrypted file on disk."""
    with open(input_path, 'rb') as f_in:
        decrypted_data = decrypt_bytes(f_in.read(), custom_key)
    with open(output_path, 'wb') as f_out:
        f_out.write(decrypted_data)
    return output_path

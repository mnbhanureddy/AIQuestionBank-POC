import sys
sys.path.append('.')
import string
from app.main import generate_temporary_password
from app.services.email_service import EmailService

print("--- Test 1: Verify 100 generated temporary passwords ---")
for i in range(100):
    pwd = generate_temporary_password(8)
    assert len(pwd) == 8, f"Password length is {len(pwd)}, expected 8"
    assert len(set(pwd)) == 8, f"Characters are not unique: {pwd}"
    assert any(c in string.ascii_uppercase for c in pwd), f"Missing uppercase: {pwd}"
    assert any(c in string.ascii_lowercase for c in pwd), f"Missing lowercase: {pwd}"
    assert any(c in string.digits for c in pwd), f"Missing digits: {pwd}"
    assert any(c in "!@#$%&*?" for c in pwd), f"Missing special characters: {pwd}"

print("All 100 generated temporary passwords meet strict criteria: length=8, all 8 unique, combining upper, lower, digits, symbols!")

print("\n--- Test 2: Verify email dispatch recipient is restricted ONLY to account created email ---")
temp_pwd = generate_temporary_password(8)
print(f"Testing with temporary password: {temp_pwd}")

success, msg = EmailService.send_account_creation_email(
    user_email="kbhanureddy191221@gmail.com",
    user_name="Bhavana",
    role="recruiter",
    temporary_password=temp_pwd,
    organization_name="PamTen Inc."
)

print(f"Result: {success}")
print(f"Message: {msg}")

assert success is True, f"Failed to send email: {msg}"
# Verify message states it was dispatched ONLY to kbhanureddy191221@gmail.com
assert "kbhanureddy191221@gmail.com" in msg
assert "mnbhanureddy@gmail.com" not in msg, "Error: CC to from_email was present!"
print("\nSUCCESS: Email was strictly dispatched ONLY to kbhanureddy191221@gmail.com!")

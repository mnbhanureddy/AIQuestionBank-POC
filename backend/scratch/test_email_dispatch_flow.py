import sys
sys.path.append('.')
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Clean up before test
from app.db.database import SessionLocal
from app import models
db = SessionLocal()
db.query(models.User).filter(models.User.email == "test_dispatch_check@pamten.com").delete()
db.commit()
db.close()

print("Registering test account...")
res = requests.post(
    f"{BASE_URL}/auth/register",
    data={
        "email": "test_dispatch_check@pamten.com",
        "role": "recruiter",
        "full_name": "Test Dispatch",
        "organization_name": "PamTen Inc."
    }
)
print("Status:", res.status_code)
assert res.status_code == 200, f"Error: {res.text}"
data = res.json()
print("Temporary password:", data["temporary_password"])
print("must_reset_password:", data["must_reset_password"])
print("email_sent:", data.get("email_sent"))
assert data["must_reset_password"] is True
assert data["temporary_password"] is not None and len(data["temporary_password"]) == 8

# Clean up after test
db = SessionLocal()
db.query(models.User).filter(models.User.email == "test_dispatch_check@pamten.com").delete()
db.commit()
db.close()
print("Test completed successfully!")

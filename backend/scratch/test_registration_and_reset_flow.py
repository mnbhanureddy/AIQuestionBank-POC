import sys
sys.path.append('.')
import requests

BASE_URL = "http://localhost:8000/api/v1"

print("--- Test 1: Register user WITHOUT password (password not set upon account creation) ---")
reg_res = requests.post(
    f"{BASE_URL}/auth/register",
    data={
        "email": "test_temp_flow@pamten.com",
        "role": "recruiter",
        "full_name": "Test Temp User",
        "organization_name": "PamTen"
    }
)
assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
reg_data = reg_res.json()
temp_pw = reg_data.get("temporary_password")
print(f"Generated 8-char temporary password: {temp_pw}")
assert temp_pw is not None and len(temp_pw) == 8
assert reg_data["must_reset_password"] is True
assert reg_data["user"]["must_reset_password"] is True

print("\n--- Test 2: Log in with email & temporary password ---")
login_res = requests.post(
    f"{BASE_URL}/auth/login",
    data={
        "username": "test_temp_flow@pamten.com",
        "password": temp_pw
    }
)
assert login_res.status_code == 200, f"Login failed: {login_res.text}"
login_data = login_res.json()
token = login_data["access_token"]
print("Login successful! User payload received:")
print("must_reset_password flag:", login_data["user"]["must_reset_password"])
assert login_data["user"]["must_reset_password"] is True

print("\n--- Test 3: Submit new password on Set Password screen ---")
reset_res = requests.post(
    f"{BASE_URL}/auth/reset-temporary-password",
    headers={"Authorization": f"Bearer {token}"},
    data={"new_password": "NewPermanentPass123!"}
)
assert reset_res.status_code == 200, f"Reset password failed: {reset_res.text}"
reset_data = reset_res.json()
print("Reset successful! must_reset_password flag is now:", reset_data["user"]["must_reset_password"])
assert reset_data["user"]["must_reset_password"] is False

print("\n--- Test 4: Log in with new permanent password ---")
login_perm_res = requests.post(
    f"{BASE_URL}/auth/login",
    data={
        "username": "test_temp_flow@pamten.com",
        "password": "NewPermanentPass123!"
    }
)
assert login_perm_res.status_code == 200
login_perm_data = login_perm_res.json()
assert login_perm_data["user"]["must_reset_password"] is False
print("Direct access granted without password reset prompt!")

print("\n--- Test 5: Register user WITH password set upon account creation ---")
reg_custom_res = requests.post(
    f"{BASE_URL}/auth/register",
    data={
        "email": "test_custom_flow@pamten.com",
        "password": "CustomPassword123!",
        "role": "recruiter",
        "full_name": "Custom User",
        "organization_name": "PamTen"
    }
)
assert reg_custom_res.status_code == 200
reg_custom_data = reg_custom_res.json()
assert reg_custom_data["must_reset_password"] is False
assert reg_custom_data.get("temporary_password") is None
print("Account created with custom password, must_reset_password is False as expected!")

print("\nAll Registration and Password Reset Tests Succeeded!")

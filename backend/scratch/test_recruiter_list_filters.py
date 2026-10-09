import sys
sys.path.append('.')
from app.db.database import SessionLocal
from app import models, auth

db = SessionLocal()

# Ensure we have at least one of each role for testing
test_roles = [
    ("test_recruiter@pamten.com", "recruiter", "Test Recruiter"),
    ("test_hr@pamten.com", "hr", "Test HR"),
    ("test_am@pamten.com", "account_manager", "Test Account Manager"),
    ("test_admin@pamten.com", "admin", "Test Admin")
]

created_ids = []
for email, role, name in test_roles:
    u = db.query(models.User).filter(models.User.email == email).first()
    if not u:
        u = models.User(
            email=email,
            hashed_password=auth.hash_password("Password123!"),
            full_name=name,
            role=role,
            is_active=True
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        created_ids.append(u.id)
    else:
        u.role = role
        db.commit()

import requests

def get_token(email, password="Password123!"):
    resp = requests.post("http://localhost:8000/api/v1/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    raise Exception(f"Login failed for {email}: {resp.text}")

try:
    admin_token = get_token("test_admin@pamten.com")
    am_token = get_token("test_am@pamten.com")
    hr_token = get_token("test_hr@pamten.com")

    # 1. Admin tests
    print("--- Testing Admin Access ---")
    res_admin_all = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=all", headers={"Authorization": f"Bearer {admin_token}"}).json()
    print("Admin role=all count:", len(res_admin_all["recruiters"]))
    
    res_admin_am = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=account_manager", headers={"Authorization": f"Bearer {admin_token}"}).json()
    am_roles = {r["role"] for r in res_admin_am["recruiters"]}
    print("Admin role=account_manager roles returned:", am_roles)
    assert all(r == "account_manager" for r in am_roles)

    res_admin_hr = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=hr", headers={"Authorization": f"Bearer {admin_token}"}).json()
    hr_roles = {r["role"] for r in res_admin_hr["recruiters"]}
    print("Admin role=hr roles returned:", hr_roles)
    assert all(r == "hr" for r in hr_roles)

    res_admin_rec = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=recruiter", headers={"Authorization": f"Bearer {admin_token}"}).json()
    rec_roles = {r["role"] for r in res_admin_rec["recruiters"]}
    print("Admin role=recruiter roles returned:", rec_roles)
    assert all(r == "recruiter" for r in rec_roles)

    # 2. Account Manager tests
    print("\n--- Testing Account Manager Access ---")
    res_am_all = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=all", headers={"Authorization": f"Bearer {am_token}"}).json()
    am_all_roles = {r["role"] for r in res_am_all["recruiters"]}
    print("Account Manager role=all roles returned:", am_all_roles)
    assert "admin" not in am_all_roles
    assert "account_manager" not in am_all_roles
    assert am_all_roles.issubset({"hr", "recruiter"})

    res_am_hr = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=hr", headers={"Authorization": f"Bearer {am_token}"}).json()
    am_hr_roles = {r["role"] for r in res_am_hr["recruiters"]}
    print("Account Manager role=hr roles returned:", am_hr_roles)
    assert all(r == "hr" for r in am_hr_roles)

    res_am_rec = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=recruiter", headers={"Authorization": f"Bearer {am_token}"}).json()
    am_rec_roles = {r["role"] for r in res_am_rec["recruiters"]}
    print("Account Manager role=recruiter roles returned:", am_rec_roles)
    assert all(r == "recruiter" for r in am_rec_roles)

    # 3. HR tests
    print("\n--- Testing HR Access ---")
    res_hr_all = requests.get("http://localhost:8000/api/v1/admin/recruiters-list", headers={"Authorization": f"Bearer {hr_token}"}).json()
    hr_seen_roles = {r["role"] for r in res_hr_all["recruiters"]}
    print("HR access roles returned:", hr_seen_roles)
    assert hr_seen_roles == {"recruiter"}

    print("\nAll Backend Tests Passed Successfully!")
finally:
    # Cleanup test users created for this test
    db.query(models.User).filter(models.User.email.in_([
        "test_recruiter@pamten.com",
        "test_hr@pamten.com",
        "test_am@pamten.com",
        "test_admin@pamten.com"
    ])).delete()
    db.commit()
    db.close()

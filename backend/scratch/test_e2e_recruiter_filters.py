import sys
sys.path.append('.')
from app.db.database import SessionLocal
from app import models, auth
import requests

db = SessionLocal()

# Setup accounts with explicit roles
accounts = [
    ("recruiter_e2e@pamten.com", "recruiter", "Recruiter Alice"),
    ("hr_e2e@pamten.com", "hr", "HR Bob"),
    ("am_e2e@pamten.com", "account_manager", "AM Charlie"),
    ("admin_e2e@pamten.com", "admin", "Admin Diana")
]

for email, role, name in accounts:
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
    else:
        u.role = role
    db.commit()

def login(email):
    res = requests.post("http://localhost:8000/api/v1/auth/login", data={"username": email, "password": "Password123!"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

try:
    admin_tok = login("admin_e2e@pamten.com")
    am_tok = login("am_e2e@pamten.com")

    # 1. Admin Login Tests
    print("--- 1. Testing Admin Recruiter List Filters ---")
    # All
    r_all = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=all", headers={"Authorization": f"Bearer {admin_tok}"}).json()
    all_roles = {x["role"] for x in r_all["recruiters"]}
    print("Admin: role=all roles returned:", all_roles)
    assert "account_manager" in all_roles and "hr" in all_roles and "recruiter" in all_roles

    # AM filter
    r_am = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=account_manager", headers={"Authorization": f"Bearer {admin_tok}"}).json()
    am_roles = {x["role"] for x in r_am["recruiters"]}
    print("Admin: role=account_manager filter result:", am_roles)
    assert am_roles == {"account_manager"}

    # HR filter
    r_hr = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=hr", headers={"Authorization": f"Bearer {admin_tok}"}).json()
    hr_roles = {x["role"] for x in r_hr["recruiters"]}
    print("Admin: role=hr filter result:", hr_roles)
    assert hr_roles == {"hr"}

    # Recruiter filter
    r_rec = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=recruiter", headers={"Authorization": f"Bearer {admin_tok}"}).json()
    rec_roles = {x["role"] for x in r_rec["recruiters"]}
    print("Admin: role=recruiter filter result:", rec_roles)
    assert rec_roles == {"recruiter"}

    # 2. Account Manager Login Tests
    print("\n--- 2. Testing Account Manager Recruiter List Filters ---")
    # All (should only include HR and Recruiter)
    r_am_all = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=all", headers={"Authorization": f"Bearer {am_tok}"}).json()
    am_all_roles = {x["role"] for x in r_am_all["recruiters"]}
    print("Account Manager: role=all roles returned:", am_all_roles)
    assert am_all_roles.issubset({"hr", "recruiter"})
    assert "admin" not in am_all_roles
    assert "account_manager" not in am_all_roles

    # HR filter
    r_am_hr = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=hr", headers={"Authorization": f"Bearer {am_tok}"}).json()
    am_hr_roles = {x["role"] for x in r_am_hr["recruiters"]}
    print("Account Manager: role=hr filter result:", am_hr_roles)
    assert am_hr_roles == {"hr"}

    # Recruiter filter
    r_am_rec = requests.get("http://localhost:8000/api/v1/admin/recruiters-list?role=recruiter", headers={"Authorization": f"Bearer {am_tok}"}).json()
    am_rec_roles = {x["role"] for x in r_am_rec["recruiters"]}
    print("Account Manager: role=recruiter filter result:", am_rec_roles)
    assert am_rec_roles == {"recruiter"}

    print("\nSUCCESS! All filter assertions passed perfectly for Admin and Account Manager!")

finally:
    # Cleanup test accounts
    db.query(models.User).filter(models.User.email.in_([
        "recruiter_e2e@pamten.com",
        "hr_e2e@pamten.com",
        "am_e2e@pamten.com",
        "admin_e2e@pamten.com"
    ])).delete()
    db.commit()
    db.close()

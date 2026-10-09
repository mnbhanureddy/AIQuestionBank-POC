import sys
sys.path.append('.')
from app.db.database import SessionLocal, engine
from sqlalchemy import text, inspect

db = SessionLocal()

tables = [
    'recruiter_notifications',
    'candidate_evaluation_reports',
    'assessment_invitations',
    'job_match_results',
    'assessment_generations',
    'candidate_resumes',
    'jd_uploads',
    'users'
]

print("Starting clean truncation of all tables in database...")
table_str = ", ".join(tables)
db.execute(text(f"TRUNCATE TABLE {table_str} RESTART IDENTITY CASCADE;"))
db.commit()

print("\n--- Verifying Row Counts in All Tables ---")
all_zero = True
for t in tables:
    count = db.execute(text(f"SELECT COUNT(*) FROM {t};")).scalar()
    print(f"Table '{t}': {count} records")
    if count != 0:
        all_zero = False

db.close()

if all_zero:
    print("\nSUCCESS: All database tables have been completely cleared (0 records across all tables)!")
else:
    print("\nERROR: Some tables still contain records.")
    sys.exit(1)

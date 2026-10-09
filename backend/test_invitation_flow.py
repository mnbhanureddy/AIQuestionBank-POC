import requests
import json

BASE_URL = "http://localhost:8000"

def run_test():
    print("--- 1. Recruiter Login/Registration ---")
    session = requests.Session()
    login_data = {"username": "testrecruiter@pamten.com", "password": "Password123!"}
    res = session.post(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    if res.status_code != 200:
        # Try register
        reg_data = {
            "email": "testrecruiter@pamten.com",
            "password": "Password123!",
            "full_name": "Test Recruiter",
            "organization_name": "Pamten Inc"
        }
        res = session.post(f"{BASE_URL}/api/v1/auth/register", data=reg_data)
        assert res.status_code == 200, f"Register failed: {res.text}"
        token = res.json()["access_token"]
    else:
        token = res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    print("Recruiter authenticated successfully.")

    print("\n--- 2. Ingest Source JD ---")
    jd_content = """Job Title: Senior Full-Stack Python & React Engineer
Requirements:
- 5+ years building web applications with Python, FastAPI, and PostgreSQL.
- Strong proficiency with React, TypeScript, Next.js, and CSS.
- Experience designing RESTful APIs, database schemas, and background tasks.
- Excellent communication, teamwork, and code review practices."""

    res = session.post(
        f"{BASE_URL}/api/v1/content/topic",
        data={"topic": "Senior Python & React Engineer", "content": jd_content},
        headers=headers
    )
    assert res.status_code == 200, f"JD ingestion failed: {res.text}"
    source_id = res.json()["source_id"]
    print(f"Source JD ingested with ID: {source_id}")

    print("\n--- 3. Ingest Candidate Resumes ---")
    c1_resume = """Alice Walker
Email: alice.walker@techlead.io
Experience: 6 years Full Stack Engineer.
Skills: Python, FastAPI, React, Next.js, PostgreSQL, TypeScript, REST APIs, Microservices, Git, Agile.
Senior software engineer leading frontend and backend teams."""

    c2_resume = """Bob Smith
Email: bob.smith@devmasters.org
Experience: 5 years Python Backend Developer.
Skills: Python, FastAPI, Django, PostgreSQL, Docker, AWS, GraphQL, Redis, Testing.
Backend specialist focused on high performance databases and APIs."""

    res1 = session.post(
        f"{BASE_URL}/api/v1/candidate/resume/text",
        data={"resume_text": c1_resume, "candidate_name": "Alice Walker", "source_id": source_id},
        headers=headers
    )
    assert res1.status_code == 200, f"Resume 1 failed: {res1.text}"
    r1_id = res1.json()["resume_id"]
    print(f"Candidate 1 ingested: {r1_id}, email={res1.json().get('candidate_email')}")

    res2 = session.post(
        f"{BASE_URL}/api/v1/candidate/resume/text",
        data={"resume_text": c2_resume, "candidate_name": "Bob Smith", "source_id": source_id},
        headers=headers
    )
    assert res2.status_code == 200, f"Resume 2 failed: {res2.text}"
    r2_id = res2.json()["resume_id"]
    print(f"Candidate 2 ingested: {r2_id}, email={res2.json().get('candidate_email')}")

    print("\n--- 4. Analyze Batch Job Match ---")
    res = session.post(
        f"{BASE_URL}/api/v1/job-match/analyze-batch",
        data={"source_id": source_id, "resume_ids": json.dumps([r1_id, r2_id])},
        headers=headers
    )
    assert res.status_code == 200, f"Batch match failed: {res.text}"
    matches = res.json()
    print(f"Analyzed {len(matches)} matches:")
    for m in matches:
        print(f"  - {m['candidate_name']}: Score={m['match_score']}%, Email={m.get('candidate_email')}")

    print("\n--- 5. Generate Assessment ---")
    res = session.post(
        f"{BASE_URL}/api/v1/questions/generate",
        data={
            "content": jd_content,
            "num_questions": 3,
            "difficulty": "Mid-Level",
            "question_type": "MCQ",
            "source_id": source_id
        },
        headers=headers
    )
    assert res.status_code == 200, f"Question generation failed: {res.text}"
    gen_data = res.json()
    assessment_id = gen_data["assessment_id"]
    print(f"Generated assessment ID: {assessment_id} with {len(gen_data['questions'])} questions.")

    print("\n--- 6. Dispatch Invitations to Candidates ---")
    candidates_to_invite = [
        {"resume_id": r1_id, "candidate_name": "Alice Walker", "candidate_email": "alice.walker@techlead.io"},
        {"resume_id": r2_id, "candidate_name": "Bob Smith", "candidate_email": "bob.smith@devmasters.org"}
    ]
    res = session.post(
        f"{BASE_URL}/api/v1/assessment/invite-candidates",
        data={"assessment_id": assessment_id, "candidates": json.dumps(candidates_to_invite)},
        headers=headers
    )
    assert res.status_code == 200, f"Invite failed: {res.text}"
    inv_data = res.json()
    print(f"Invited {inv_data['total_invited']} candidates.")
    alice_inv = inv_data["invitations"][0]
    alice_token = alice_inv["invitation_token"]
    print(f"Alice's invite token: {alice_token}")
    print(f"Alice's invite link: {alice_inv['invitation_link']}")

    print("\n--- 7. Candidate (Alice) Accesses Assessment (Public - No Auth) ---")
    candidate_session = requests.Session()
    res = candidate_session.get(f"{BASE_URL}/api/v1/assessment/invitation/{alice_token}")
    assert res.status_code == 200, f"Public access failed: {res.text}"
    public_assessment = res.json()
    print(f"Candidate assessment loaded: {public_assessment['candidate_name']}, questions={len(public_assessment['questions'])}")
    # Verify answers are sanitized / hidden
    for q in public_assessment["questions"]:
        assert "correct_answer" not in q, "Security issue: correct_answer exposed to candidate!"

    print("\n--- 8. Candidate Submits Assessment ---")
    answers = {}
    for idx, q in enumerate(public_assessment["questions"]):
        options = q.get("options", [])
        answers[str(idx)] = options[0] if options else "Sample technical answer"

    res = candidate_session.post(
        f"{BASE_URL}/api/v1/assessment/submit-candidate-assessment",
        data={"invite_token": alice_token, "candidate_answers": json.dumps(answers)}
    )
    assert res.status_code == 200, f"Candidate submit failed: {res.text}"
    submit_result = res.json()
    print(f"Candidate submitted successfully! Result: {submit_result}")
    assert "score_percentage" in submit_result, "Score percentage missing from submit response!"
    print(f"Score percentage: {submit_result['score_percentage']}%")

    print("\n--- 9. Recruiter Views Invitations & Reports on Dashboard ---")
    res = session.get(f"{BASE_URL}/api/v1/assessment/invitations", headers=headers)
    assert res.status_code == 200
    invitations = res.json()
    print(f"Recruiter fetched {len(invitations)} invitations:")
    for inv in invitations:
        print(f"  - {inv['candidate_name']} ({inv['candidate_email']}): status={inv['status']}, score_pct={inv.get('score_percentage')}%")

    res = session.get(f"{BASE_URL}/api/v1/reports", headers=headers)
    assert res.status_code == 200
    reports = res.json()
    print(f"Recruiter fetched {len(reports)} evaluation reports:")
    for rep in reports:
        print(f"  - Report #{rep['report_id']}: Candidate={rep['candidate_name']}, Score={rep['total_score']}/{rep['max_score']}, Pct={rep.get('score_percentage')}%")

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_test()

from fastapi import FastAPI, Form, File, UploadFile, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, extract
from typing import Optional, List, Dict, Any
import json
import os
import re
import uuid
import csv
import io
import secrets
import string
import datetime

from app.services.ingestion import ContentIngestionService, ContentExtractionError
from app.services.generator import QuestionGeneratorService
from app.services.evaluator import EvaluationEngine
from app.services.job_matcher import JobMatchingService
from app.services.email_service import EmailService
from app.services.dimension_skills import DimensionSkillsService
from app.db.database import Base, engine, get_db
from app import models
from app.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional
from pydantic import BaseModel

app = FastAPI(title="AI Recruitment & Training Assessment Platform")

# Allow requests from your Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables if they don't exist yet. Fine for a dev tool like this -
# for production, use Alembic migrations instead (already in requirements.txt).
Base.metadata.create_all(bind=engine)

# Instantiate services
generator_service = QuestionGeneratorService()
evaluator_service = EvaluationEngine()
job_matching_service = JobMatchingService()
dimension_skills_service = DimensionSkillsService()


def _check_source_ownership(source_record: models.SourceMaterial, current_user: models.User):
    """Raise 403 if this source material belongs to a different user.
    Rows with no owner (user_id is None) are legacy/pre-auth data and are
    left accessible rather than orphaned."""
    if source_record.user_id is not None and source_record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have access to this source material.")


@app.get("/")
def read_root():
    return {"message": "AI Recruitment & Training Assessment Platform is running!"}

# --- Auth ---

def generate_temporary_password(length: int = 8) -> str:
    """
    Generates an exactly 8-character temporary password
    guaranteeing a unique combination of uppercase, lowercase, numbers, and special characters.
    """
    upper = string.ascii_uppercase
    lower = string.ascii_lowercase
    digits = string.digits
    specials = "!@#$%&*?"

    # Guarantee at least one of each required category
    chosen = [
        secrets.choice(upper),
        secrets.choice(lower),
        secrets.choice(digits),
        secrets.choice(specials),
    ]

    # Fill remaining characters ensuring unique pool of characters
    all_pool = list((set(upper) | set(lower) | set(digits) | set(specials)) - set(chosen))
    chosen += secrets.SystemRandom().sample(all_pool, length - len(chosen))

    secrets.SystemRandom().shuffle(chosen)
    return "".join(chosen)


class CandidateRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


@app.post("/api/v1/auth/register-candidate")
def register_candidate(
    payload: CandidateRegisterRequest,
    db: Session = Depends(get_db)
):
    clean_email = payload.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    user = models.User(
        email=clean_email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip() if payload.full_name else clean_email.split("@")[0],
        organization_name=None,
        role="candidate",
        must_reset_password=False,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Automatically associate any existing AssessmentInvitation and CandidateEvaluationReport matching this email
    invitations = db.query(models.AssessmentInvitation).filter(
        func.lower(models.AssessmentInvitation.candidate_email) == clean_email
    ).all()
    for inv in invitations:
        inv.candidate_user_id = user.id
        if inv.evaluation_report_id:
            rep = db.query(models.CandidateEvaluationReport).filter(models.CandidateEvaluationReport.id == inv.evaluation_report_id).first()
            if rep:
                rep.candidate_user_id = user.id
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "organization_name": user.organization_name,
            "role": "candidate",
            "must_reset_password": False
        }
    }


@app.post("/api/v1/auth/register")
def register(
    email: str = Form(...),
    password: Optional[str] = Form(None),
    full_name: Optional[str] = Form(None),
    organization_name: Optional[str] = Form(None),
    role: str = Form("recruiter"),
    db: Session = Depends(get_db)
):
    clean_email = email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    valid_roles = ["recruiter", "hr", "account_manager", "admin", "candidate"]
    clean_role = role.lower().strip() if role else "recruiter"
    if clean_role not in valid_roles:
        clean_role = "recruiter"

    raw_pw = password.strip() if password else ""
    if (
        raw_pw
        and len(raw_pw) == 8
        and any(c in string.ascii_uppercase for c in raw_pw)
        and any(c in string.ascii_lowercase for c in raw_pw)
        and any(c in string.digits for c in raw_pw)
        and any(c in "!@#$%&*?" for c in raw_pw)
        and len(set(raw_pw)) == 8
    ):
        temp_password = raw_pw
    else:
        temp_password = generate_temporary_password(8)

    user = models.User(
        email=clean_email,
        hashed_password=hash_password(temp_password),
        full_name=full_name.strip() if full_name else None,
        organization_name=organization_name.strip() if organization_name else None,
        role=clean_role,
        must_reset_password=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Automated email notification with temporary password & login instructions
    email_sent = False
    email_err = None
    try:
        email_sent, email_err = EmailService.send_account_creation_email(
            user_email=user.email,
            user_name=user.full_name or user.email,
            role=user.role,
            temporary_password=temp_password,
            organization_name=user.organization_name or "TalentAssess AI"
        )
        if not email_sent:
            print(f"Warning: Account creation email was not sent: {email_err}")
    except Exception as e:
        print(f"Warning: Could not dispatch account creation email: {e}")

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "temporary_password": temp_password,
        "must_reset_password": True,
        "email_sent": email_sent,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "organization_name": user.organization_name,
            "role": user.role,
            "must_reset_password": True
        },
    }


@app.post("/api/v1/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses "username" as the field name by spec -
    # we treat that value as the email.
    user = db.query(models.User).filter(models.User.email == form_data.username.strip().lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Link candidate invitations/reports if candidate logs in
    if user.role == "candidate":
        invitations = db.query(models.AssessmentInvitation).filter(
            func.lower(models.AssessmentInvitation.candidate_email) == user.email.lower()
        ).all()
        for inv in invitations:
            if not inv.candidate_user_id:
                inv.candidate_user_id = user.id
            if inv.evaluation_report_id:
                rep = db.query(models.CandidateEvaluationReport).filter(models.CandidateEvaluationReport.id == inv.evaluation_report_id).first()
                if rep and not rep.candidate_user_id:
                    rep.candidate_user_id = user.id
        db.commit()

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "organization_name": user.organization_name,
            "role": getattr(user, "role", "recruiter") or "recruiter",
            "must_reset_password": bool(getattr(user, "must_reset_password", False))
        },
    }


@app.get("/api/v1/auth/me")
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "organization_name": current_user.organization_name,
        "role": getattr(current_user, "role", "recruiter") or "recruiter",
        "must_reset_password": bool(getattr(current_user, "must_reset_password", False))
    }


@app.post("/api/v1/auth/reset-temporary-password")
def reset_temporary_password(
    new_password: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")
    current_user.hashed_password = hash_password(new_password)
    current_user.must_reset_password = False
    db.commit()
    db.refresh(current_user)
    return {
        "status": "success",
        "message": "Password reset successfully. You now have full access to your portal.",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "organization_name": current_user.organization_name,
            "role": getattr(current_user, "role", "recruiter") or "recruiter",
            "must_reset_password": False
        }
    }


@app.put("/api/v1/auth/me")
def update_profile(
    full_name: Optional[str] = Form(None),
    organization_name: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if full_name is not None:
        current_user.full_name = full_name
    if organization_name is not None:
        current_user.organization_name = organization_name
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "organization_name": current_user.organization_name,
        "role": getattr(current_user, "role", "recruiter") or "recruiter",
        "must_reset_password": bool(getattr(current_user, "must_reset_password", False))
    }


@app.post("/api/v1/auth/change-password")
def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    current_user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password updated successfully."}


@app.post("/api/v1/auth/forgot-password")
def forgot_password(
    email: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    email_clean = email.strip()
    user = db.query(models.User).filter(func.lower(models.User.email) == email_clean.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now log in with your new password."}

# 1. Source Material Ingestion Endpoint (job description, resume, skill
# area, or training material as a file)
@app.post("/api/v1/content/upload")
async def upload_content(
    file: UploadFile = File(...),
    page_range: Optional[str] = Form(None),
    content_scope: Optional[str] = Form(None),  # "entire" | "chapter" | "pages"
    chapter: Optional[str] = Form(None),
    organization_name: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            extracted_text = ContentIngestionService.extract_from_pdf(contents, page_range)
        elif filename.endswith(".docx"):
            extracted_text = ContentIngestionService.extract_from_docx(contents)
        elif filename.endswith(".pptx"):
            extracted_text = ContentIngestionService.extract_from_pptx(contents)
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            extracted_text = ContentIngestionService.extract_from_image(contents)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format.")

        # Chapter scope is applied as a post-processing filter on whatever
        # was extracted above - useful for multi-section training material.
        if content_scope == "chapter" and chapter:
            extracted_text = ContentIngestionService.extract_chapter(extracted_text, chapter)
    except ContentExtractionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    org_val = organization_name.strip() if organization_name and organization_name.strip() else current_user.organization_name
    record = models.SourceMaterial(
        user_id=current_user.id,
        organization_name=org_val,
        filename=file.filename,
        role_or_topic=None,
        extracted_text=extracted_text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "source_id": record.id,
        "filename": file.filename,
        "extracted_text_preview": extracted_text[:500],
    }


# 1b. Ingestion endpoint for a typed role/skill area/job description text
# instead of an uploaded file.
@app.post("/api/v1/content/topic")
def submit_topic(
    topic: str = Form(...),
    organization_name: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    org_val = organization_name.strip() if organization_name and organization_name.strip() else current_user.organization_name
    record = models.SourceMaterial(
        user_id=current_user.id,
        organization_name=org_val,
        filename=None,
        role_or_topic=topic,
        extracted_text=topic,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "source_id": record.id,
        "extracted_text_preview": topic[:500],
    }


# 1c. Candidate Resume Ingestion Endpoint (file upload)
@app.post("/api/v1/candidate/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    source_id: int = Form(...),
    candidate_name: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    source_record = db.query(models.SourceMaterial).filter(
        models.SourceMaterial.id == source_id
    ).first()
    if not source_record:
        raise HTTPException(status_code=404, detail="source_id not found.")
    _check_source_ownership(source_record, current_user)

    contents = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            resume_text = ContentIngestionService.extract_from_pdf(contents)
        elif filename.endswith(".docx"):
            resume_text = ContentIngestionService.extract_from_docx(contents)
        elif filename.endswith(".pptx"):
            resume_text = ContentIngestionService.extract_from_pptx(contents)
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            resume_text = ContentIngestionService.extract_from_image(contents)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format.")
    except ContentExtractionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    record = models.CandidateResume(
        source_material_id=source_id,
        candidate_name=candidate_name,
        filename=file.filename,
        resume_text=resume_text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "resume_id": record.id,
        "filename": file.filename,
        "resume_text_preview": resume_text[:500],
    }


# 1c-2. Candidate Resumes Ingestion Endpoint (multiple file upload)
@app.post("/api/v1/candidate/resume/upload-multiple")
async def upload_multiple_resumes(
    files: List[UploadFile] = File(...),
    source_id: int = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    source_record = db.query(models.SourceMaterial).filter(
        models.SourceMaterial.id == source_id
    ).first()
    if not source_record:
        raise HTTPException(status_code=404, detail="source_id not found.")
    _check_source_ownership(source_record, current_user)

    uploaded_results = []
    for file in files:
        contents = await file.read()
        filename = file.filename.lower()
        try:
            if filename.endswith(".pdf"):
                resume_text = ContentIngestionService.extract_from_pdf(contents)
            elif filename.endswith(".docx"):
                resume_text = ContentIngestionService.extract_from_docx(contents)
            elif filename.endswith(".pptx"):
                resume_text = ContentIngestionService.extract_from_pptx(contents)
            elif filename.endswith((".png", ".jpg", ".jpeg")):
                resume_text = ContentIngestionService.extract_from_image(contents)
            else:
                continue
        except Exception:
            continue

        clean_name = os.path.splitext(file.filename)[0].replace('_', ' ').replace('-', ' ')
        clean_name = re.sub(r'(?i)\b(resume|cv|profile)\b', '', clean_name).strip() or file.filename

        email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', resume_text)
        candidate_email = email_match.group(0).lower() if email_match else None

        record = models.CandidateResume(
            source_material_id=source_id,
            candidate_name=clean_name,
            candidate_email=candidate_email,
            filename=file.filename,
            resume_text=resume_text,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        uploaded_results.append({
            "resume_id": record.id,
            "filename": file.filename,
            "candidate_name": clean_name,
            "candidate_email": candidate_email,
            "resume_text_preview": resume_text[:500],
        })

    return uploaded_results


# 1d. Candidate Resume Ingestion Endpoint (pasted text)
@app.post("/api/v1/candidate/resume/text")
def submit_resume_text(
    resume_text: str = Form(...),
    source_id: int = Form(...),
    candidate_name: Optional[str] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    source_record = db.query(models.SourceMaterial).filter(
        models.SourceMaterial.id == source_id
    ).first()
    if not source_record:
        raise HTTPException(status_code=404, detail="source_id not found.")
    _check_source_ownership(source_record, current_user)

    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', resume_text)
    candidate_email = email_match.group(0).lower() if email_match else None

    record = models.CandidateResume(
        source_material_id=source_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        filename=None,
        resume_text=resume_text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "resume_id": record.id,
        "candidate_email": candidate_email,
        "resume_text_preview": resume_text[:500],
    }


# 1e. Job-Candidate Match Analysis - AI comparison of the job description
# (source_material) against the candidate's resume.
@app.post("/api/v1/job-match/analyze")
def analyze_job_match(
    source_id: int = Form(...),
    resume_id: int = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    source_record = db.query(models.SourceMaterial).filter(
        models.SourceMaterial.id == source_id
    ).first()
    if not source_record:
        raise HTTPException(status_code=404, detail="source_id not found.")
    _check_source_ownership(source_record, current_user)

    resume_record = db.query(models.CandidateResume).filter(
        models.CandidateResume.id == resume_id
    ).first()
    if not resume_record:
        raise HTTPException(status_code=404, detail="resume_id not found.")

    try:
        result = job_matching_service.match(source_record.extracted_text, resume_record.resume_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    record = models.JobMatchResult(
        source_material_id=source_id,
        candidate_resume_id=resume_id,
        match_score=result.match_score,
        matched_skills=result.matched_skills,
        skill_gaps=result.skill_gaps,
        seniority_assessment=result.seniority_assessment,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "job_match_id": record.id,
        "match_score": result.match_score,
        "matched_skills": result.matched_skills,
        "skill_gaps": result.skill_gaps,
        "seniority_assessment": result.seniority_assessment,
    }


# 1f. Batch Job-Candidate Match Analysis - compare multiple resumes at once
@app.post("/api/v1/job-match/analyze-batch")
def analyze_job_match_batch(
    source_id: int = Form(...),
    resume_ids: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    source_record = db.query(models.SourceMaterial).filter(
        models.SourceMaterial.id == source_id
    ).first()
    if not source_record:
        raise HTTPException(status_code=404, detail="source_id not found.")
    _check_source_ownership(source_record, current_user)

    try:
        parsed_ids = json.loads(resume_ids)
        if not isinstance(parsed_ids, list):
            parsed_ids = [int(parsed_ids)]
    except Exception:
        raise HTTPException(status_code=400, detail="resume_ids must be a valid JSON list of integers.")

    results = []
    for r_id in parsed_ids:
        resume_record = db.query(models.CandidateResume).filter(
            models.CandidateResume.id == int(r_id)
        ).first()
        if not resume_record:
            continue

        try:
            match_res = job_matching_service.match(source_record.extracted_text, resume_record.resume_text)
            record = models.JobMatchResult(
                source_material_id=source_id,
                candidate_resume_id=resume_record.id,
                match_score=match_res.match_score,
                matched_skills=match_res.matched_skills,
                skill_gaps=match_res.skill_gaps,
                seniority_assessment=match_res.seniority_assessment,
            )
            db.add(record)
            db.commit()
            db.refresh(record)

            results.append({
                "job_match_id": record.id,
                "resume_id": resume_record.id,
                "filename": resume_record.filename or "Pasted Resume",
                "candidate_name": resume_record.candidate_name or resume_record.filename or f"Candidate #{resume_record.id}",
                "candidate_email": resume_record.candidate_email,
                "match_score": match_res.match_score,
                "matched_skills": match_res.matched_skills,
                "skill_gaps": match_res.skill_gaps,
                "seniority_assessment": match_res.seniority_assessment,
            })
        except Exception as e:
            results.append({
                "job_match_id": None,
                "resume_id": resume_record.id,
                "filename": resume_record.filename or "Resume",
                "candidate_name": resume_record.candidate_name or f"Candidate #{resume_record.id}",
                "candidate_email": resume_record.candidate_email,
                "match_score": 0.0,
                "matched_skills": [],
                "skill_gaps": [f"Analysis error: {str(e)}"],
                "seniority_assessment": "Could not complete match analysis.",
            })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results


# 1g. Get Latest Job-Candidate Matches - retrieve latest match results and scores for the current user
@app.get("/api/v1/job-match/latest")
def get_latest_job_matches(
    source_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_source = None
    if source_id is not None:
        target_source = db.query(models.SourceMaterial).filter(
            models.SourceMaterial.id == source_id
        ).first()
        if not target_source:
            raise HTTPException(status_code=404, detail="source_id not found.")
        _check_source_ownership(target_source, current_user)
    else:
        # Find the most recent source material of the current user that has job match results
        target_source = (
            db.query(models.SourceMaterial)
            .join(models.JobMatchResult, models.JobMatchResult.source_material_id == models.SourceMaterial.id)
            .filter(models.SourceMaterial.user_id == current_user.id)
            .order_by(models.JobMatchResult.id.desc())
            .first()
        )

    if not target_source:
        return {
            "source_id": None,
            "source_title": None,
            "total_candidates": 0,
            "average_score": None,
            "top_score": None,
            "results": [],
        }

    match_records = (
        db.query(models.JobMatchResult)
        .filter(models.JobMatchResult.source_material_id == target_source.id)
        .order_by(models.JobMatchResult.match_score.desc())
        .all()
    )

    results = []
    scores = []
    for mr in match_records:
        resume_record = db.query(models.CandidateResume).filter(
            models.CandidateResume.id == mr.candidate_resume_id
        ).first()
        candidate_name = (
            (resume_record.candidate_name if resume_record else None)
            or (resume_record.filename if resume_record else None)
            or f"Candidate #{mr.candidate_resume_id}"
        )
        filename = (resume_record.filename if resume_record else None) or "Resume"
        scores.append(mr.match_score)
        results.append({
            "job_match_id": mr.id,
            "resume_id": mr.candidate_resume_id,
            "candidate_name": candidate_name,
            "candidate_email": resume_record.candidate_email if resume_record else None,
            "filename": filename,
            "match_score": mr.match_score,
            "matched_skills": mr.matched_skills or [],
            "skill_gaps": mr.skill_gaps or [],
            "seniority_assessment": mr.seniority_assessment or "",
            "created_at": mr.created_at.isoformat() if mr.created_at else None,
        })

    avg_score = round(sum(scores) / len(scores), 1) if scores else None
    top_score = max(scores) if scores else None

    return {
        "source_id": target_source.id,
        "source_title": target_source.filename or target_source.role_or_topic or f"Job Description #{target_source.id}",
        "total_candidates": len(results),
        "average_score": avg_score,
        "top_score": top_score,
        "results": results,
    }


# ==============================================================================
# 1h. Dimensions & Skills Matrix Endpoints
# ==============================================================================

class RoleTemplateRequest(BaseModel):
    role_title: str
    description: Optional[str] = ""
    dimensions: List[Dict[str, Any]]


@app.get("/api/v1/dimensions-skills/templates")
def get_dimension_skill_templates(
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Returns library of role templates: system standard presets + custom recruiter templates."""
    # Ensure all system templates are synchronized and up-to-date in DB
    existing_sys_map = {
        t.template_key: t
        for t in db.query(models.RoleTemplate).filter(models.RoleTemplate.is_system == True).all()
        if t.template_key
    }
    for tpl in dimension_skills_service.get_templates():
        tpl_key = tpl.get("id")
        if tpl_key in existing_sys_map:
            existing_t = existing_sys_map[tpl_key]
            existing_t.role_title = tpl.get("role_title")
            existing_t.description = tpl.get("description", "")
            existing_t.dimensions = tpl.get("dimensions", [])
        else:
            sys_entry = models.RoleTemplate(
                template_key=tpl_key,
                role_title=tpl.get("role_title"),
                description=tpl.get("description", ""),
                dimensions=tpl.get("dimensions", []),
                is_system=True,
                user_id=None,
            )
            db.add(sys_entry)
    db.commit()

    # Query all system templates + user custom templates
    query = db.query(models.RoleTemplate)
    if current_user:
        query = query.filter((models.RoleTemplate.is_system == True) | (models.RoleTemplate.user_id == current_user.id))
    else:
        query = query.filter(models.RoleTemplate.is_system == True)

    db_templates = query.order_by(models.RoleTemplate.is_system.desc(), models.RoleTemplate.id.asc()).all()
    results = []
    for t in db_templates:
        results.append({
            "id": t.id,
            "template_key": t.template_key or f"custom-{t.id}",
            "role_title": t.role_title,
            "description": t.description or "",
            "dimensions": t.dimensions or [],
            "is_system": t.is_system,
            "is_owner": (current_user and t.user_id == current_user.id),
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        })
    return {"templates": results}


@app.post("/api/v1/dimensions-skills/templates")
def create_role_template(
    payload: RoleTemplateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recruiter creates a new reusable role template with custom dimensions, skills, and desired scores."""
    new_tpl = models.RoleTemplate(
        user_id=current_user.id,
        template_key=f"tpl-{uuid.uuid4().hex[:8]}",
        role_title=payload.role_title,
        description=payload.description or "",
        dimensions=payload.dimensions,
        is_system=False,
    )
    db.add(new_tpl)
    db.commit()
    db.refresh(new_tpl)
    return {
        "success": True,
        "message": "Role template created successfully.",
        "template": {
            "id": new_tpl.id,
            "template_key": new_tpl.template_key,
            "role_title": new_tpl.role_title,
            "description": new_tpl.description,
            "dimensions": new_tpl.dimensions,
            "is_system": False,
            "is_owner": True,
            "updated_at": new_tpl.updated_at.isoformat() if new_tpl.updated_at else None,
        }
    }


@app.put("/api/v1/dimensions-skills/templates/{template_id}")
def update_role_template(
    template_id: int,
    payload: RoleTemplateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recruiter updates an existing role template (or customizes a system template)."""
    tpl = db.query(models.RoleTemplate).filter(models.RoleTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Role template not found.")

    # If it's a system template and the user is not admin, duplicate it as a user custom template
    if tpl.is_system and current_user.role != "admin":
        forked = models.RoleTemplate(
            user_id=current_user.id,
            template_key=f"tpl-{uuid.uuid4().hex[:8]}",
            role_title=payload.role_title,
            description=payload.description or "",
            dimensions=payload.dimensions,
            is_system=False,
        )
        db.add(forked)
        db.commit()
        db.refresh(forked)
        return {
            "success": True,
            "message": "System template customized and saved to your personal templates library.",
            "template": {
                "id": forked.id,
                "template_key": forked.template_key,
                "role_title": forked.role_title,
                "description": forked.description,
                "dimensions": forked.dimensions,
                "is_system": False,
                "is_owner": True,
                "updated_at": forked.updated_at.isoformat() if forked.updated_at else None,
            }
        }

    # Otherwise update directly
    if not tpl.is_system and tpl.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You do not have permission to modify this template.")

    tpl.role_title = payload.role_title
    tpl.description = payload.description or ""
    tpl.dimensions = payload.dimensions
    tpl.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(tpl)

    return {
        "success": True,
        "message": "Role template updated successfully.",
        "template": {
            "id": tpl.id,
            "template_key": tpl.template_key,
            "role_title": tpl.role_title,
            "description": tpl.description,
            "dimensions": tpl.dimensions,
            "is_system": tpl.is_system,
            "is_owner": (tpl.user_id == current_user.id),
            "updated_at": tpl.updated_at.isoformat() if tpl.updated_at else None,
        }
    }


@app.delete("/api/v1/dimensions-skills/templates/{template_id}")
def delete_role_template(
    template_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a custom role template."""
    tpl = db.query(models.RoleTemplate).filter(models.RoleTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Role template not found.")

    if tpl.is_system and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Cannot delete default system templates.")
    if not tpl.is_system and tpl.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You do not have permission to delete this template.")

    db.delete(tpl)
    db.commit()
    return {"success": True, "message": "Role template deleted successfully."}



@app.get("/api/v1/dimensions-skills")
def get_dimensions_and_skills(
    source_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the recruiter's saved dimensions and skills matrix.
    If source_id is specified, finds matrix linked to that JD, or falls back to
    the user's latest saved matrix, or defaults to Full-Stack Engineer template.
    """
    matrix = None
    if source_id is not None:
        matrix = db.query(models.SkillMatrix).filter(
            models.SkillMatrix.user_id == current_user.id,
            models.SkillMatrix.source_material_id == source_id
        ).order_by(models.SkillMatrix.updated_at.desc()).first()

    if not matrix:
        # Check user's latest saved matrix
        matrix = db.query(models.SkillMatrix).filter(
            models.SkillMatrix.user_id == current_user.id
        ).order_by(models.SkillMatrix.updated_at.desc()).first()

    if matrix:
        return {
            "id": matrix.id,
            "source_material_id": matrix.source_material_id,
            "role_title": matrix.role_title,
            "dimensions": matrix.dimensions,
            "updated_at": matrix.updated_at.isoformat() if matrix.updated_at else None,
            "is_default": False
        }

    # Return default full-stack template
    default_tpl = dimension_skills_service.get_template_by_id("fullstack")
    return {
        "id": None,
        "source_material_id": source_id,
        "role_title": default_tpl["role_title"],
        "dimensions": default_tpl["dimensions"],
        "updated_at": None,
        "is_default": True
    }


class SaveSkillMatrixRequest(BaseModel):
    role_title: str
    dimensions: List[Dict[str, Any]]
    source_material_id: Optional[int] = None


@app.post("/api/v1/dimensions-skills")
def save_dimensions_and_skills(
    payload: SaveSkillMatrixRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save or update the recruiter's dimensions & skills matrix.
    """
    source_id = payload.source_material_id
    if source_id is not None:
        source_rec = db.query(models.SourceMaterial).filter(models.SourceMaterial.id == source_id).first()
        if source_rec:
            _check_source_ownership(source_rec, current_user)

    # Check if an existing matrix exists for this user and source_id
    existing = None
    if source_id is not None:
        existing = db.query(models.SkillMatrix).filter(
            models.SkillMatrix.user_id == current_user.id,
            models.SkillMatrix.source_material_id == source_id
        ).first()

    if not existing:
        existing = db.query(models.SkillMatrix).filter(
            models.SkillMatrix.user_id == current_user.id
        ).order_by(models.SkillMatrix.updated_at.desc()).first()

    if existing:
        existing.role_title = payload.role_title
        existing.dimensions = payload.dimensions
        if source_id is not None:
            existing.source_material_id = source_id
        existing.updated_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        new_matrix = models.SkillMatrix(
            user_id=current_user.id,
            source_material_id=source_id,
            role_title=payload.role_title,
            dimensions=payload.dimensions,
        )
        db.add(new_matrix)
        db.commit()
        db.refresh(new_matrix)
        target = new_matrix

    return {
        "success": True,
        "id": target.id,
        "role_title": target.role_title,
        "dimensions": target.dimensions,
        "source_material_id": target.source_material_id,
        "updated_at": target.updated_at.isoformat() if target.updated_at else None,
        "message": "Dimensions & skills matrix saved successfully."
    }


class AIExtractSkillMatrixRequest(BaseModel):
    content: Optional[str] = None
    role_title: Optional[str] = None
    source_id: Optional[int] = None


@app.post("/api/v1/dimensions-skills/ai-extract")
def ai_extract_dimensions_and_skills(
    payload: AIExtractSkillMatrixRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI Auto-Extractor: Analyzes JD text or role title to generate a complete
    dimension and skill blueprint with weights, proficiencies, and importance.
    """
    jd_text = payload.content or ""
    role_title = payload.role_title

    if payload.source_id is not None:
        source_rec = db.query(models.SourceMaterial).filter(models.SourceMaterial.id == payload.source_id).first()
        if source_rec:
            _check_source_ownership(source_rec, current_user)
            if not jd_text:
                jd_text = source_rec.extracted_text
            if not role_title:
                role_title = source_rec.filename or source_rec.role_or_topic

    if not jd_text and not role_title:
        raise HTTPException(status_code=400, detail="Please provide JD content, role title, or a valid source_id.")

    result = dimension_skills_service.extract_dimensions_and_skills_with_ai(
        job_description=jd_text,
        role_title=role_title
    )
    return result


# 2. Assessment Generation Endpoint
@app.post("/api/v1/questions/generate")
def generate_questions(
    content: Optional[str] = Form(None),
    num_questions: int = Form(10),
    difficulty: str = Form("Mid-Level"),
    question_type: str = Form("MCQ"),
    source_id: Optional[int] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Prefer the full text stored server-side by source_id (set by
    # /content/upload or /content/topic) over whatever the client sends in
    # `content` - the client only ever has a 500-char preview for uploaded
    # files, so trusting it here would silently truncate every document.
    if source_id is not None:
        source_record = db.query(models.SourceMaterial).filter(
            models.SourceMaterial.id == source_id
        ).first()
        if not source_record:
            raise HTTPException(status_code=404, detail="source_id not found.")
        _check_source_ownership(source_record, current_user)
        content_text = source_record.extracted_text
    elif content:
        content_text = content
    else:
        raise HTTPException(status_code=400, detail="Either source_id or content must be provided.")

    # Augment with recruiter-defined dimensions & skills if available
    try:
        active_matrix = None
        if source_id is not None:
            active_matrix = db.query(models.SkillMatrix).filter(
                models.SkillMatrix.user_id == current_user.id,
                models.SkillMatrix.source_material_id == source_id
            ).first()
        if not active_matrix:
            active_matrix = db.query(models.SkillMatrix).filter(
                models.SkillMatrix.user_id == current_user.id
            ).order_by(models.SkillMatrix.updated_at.desc()).first()

        if active_matrix and active_matrix.dimensions:
            skills_summary_lines = []
            for d in active_matrix.dimensions:
                d_name = d.get("name", "Dimension")
                d_skills = [s.get("name") for s in d.get("skills", []) if s.get("name")]
                if d_skills:
                    skills_summary_lines.append(f"- {d_name} (Weight {d.get('weight', 0)}%): {', '.join(d_skills)}")
            if skills_summary_lines:
                content_text = (
                    f"{content_text}\n\n"
                    f"### Recruiter-Defined Evaluation Dimensions & Target Skills Rubric:\n"
                    + "\n".join(skills_summary_lines)
                )
    except Exception as matrix_err:
        print(f"Notice: Could not load skill matrix for question generation: {matrix_err}")

    try:
        result = generator_service.generate(content_text, num_questions, difficulty, question_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    result_dict = result.model_dump() if hasattr(result, "model_dump") else result.dict()

    if source_id is None:
        # No source_id was provided (e.g. an older frontend build) -
        # create a minimal record here so this generation still has
        # something to link to.
        fallback = models.SourceMaterial(user_id=current_user.id, organization_name=None, filename=None, role_or_topic=None, extracted_text=content_text)
        db.add(fallback)
        db.commit()
        db.refresh(fallback)
        source_id = fallback.id

    record = models.AssessmentGeneration(
        source_material_id=source_id,
        num_questions=num_questions,
        difficulty=difficulty,
        question_type=question_type,
        questions=result_dict,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "assessment_id": record.id,
        **result_dict,
    }

# 3. Per-question subjective evaluation (used while a candidate answers
# short-answer/scenario questions, before the full report is saved)
@app.post("/api/v1/assessment/evaluate-subjective")
def evaluate_answer(
    question: str = Form(...),
    reference_answer: str = Form(...),
    user_answer: str = Form(...),
    max_marks: int = Form(10),
    current_user: models.User = Depends(get_current_user)
):
    try:
        evaluation = evaluator_service.evaluate_subjective(question, reference_answer, user_answer, max_marks)
        return evaluation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 4. Save a completed candidate assessment as an Evaluation Report
@app.post("/api/v1/assessment/submit-report")
def submit_report(
    assessment_id: int = Form(...),
    candidate_name: Optional[str] = Form(None),
    candidate_answers: str = Form(...),  # JSON string: {questionIndex: answerText}
    evaluations: str = Form(...),        # JSON string: {questionIndex: {overall_score, feedback, ...}}
    previous_employers: Optional[str] = Form(None),  # JSON string: [{company_name, employee_count, linkedin_verified}, ...]
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        parsed_answers = json.loads(candidate_answers)
        parsed_evaluations = json.loads(evaluations)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="candidate_answers and evaluations must be valid JSON strings.")

    parsed_employers = None
    if previous_employers:
        try:
            parsed_employers = json.loads(previous_employers)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="previous_employers must be a valid JSON string.")

    assessment = db.query(models.AssessmentGeneration).filter(
        models.AssessmentGeneration.id == assessment_id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="assessment_id not found.")
    _check_source_ownership(assessment.source_material, current_user)

    # Look up each question's actual type so max_score is computed correctly
    # (MCQ = 1 point, subjective = 10 points, per evaluator.py's max_marks)
    stored_questions = (assessment.questions or {}).get("questions", [])

    total_score = 0.0
    max_score = 0.0
    accuracy_scores = []
    clarity_scores = []
    for idx_str, ev in parsed_evaluations.items():
        score = float(ev.get("overall_score", 0) or 0)
        total_score += score

        try:
            q_type = stored_questions[int(idx_str)].get("question_type", "")
        except (ValueError, IndexError, AttributeError):
            q_type = ""
        max_score += 1.0 if q_type == "MCQ" else 10.0

        # accuracy/clarity_and_grammar only exist on subjective-question
        # evaluations (EvaluationRubric) - MCQ results only have
        # overall_score/feedback, so these are naturally skipped for MCQs.
        if "accuracy" in ev:
            accuracy_scores.append(float(ev["accuracy"]))
        if "clarity_and_grammar" in ev:
            clarity_scores.append(float(ev["clarity_and_grammar"]))

    # Scale 0-10 rubric averages to a 0-100% match/score. None if there
    # were no subjective questions to compute these from.
    job_knowledge_match = (sum(accuracy_scores) / len(accuracy_scores) * 10) if accuracy_scores else None
    communication_score = (sum(clarity_scores) / len(clarity_scores) * 10) if clarity_scores else None

    # Employer eligibility - self-attested by the recruiter, not verified
    # by us. "yes" only if every listed employer has >50 employees AND was
    # marked as LinkedIn-verified; "unverified" if employer data exists but
    # some entries aren't marked verified; "no" if any verified employer
    # has <=50 employees; null if no employer data was provided at all.
    meets_employer_criteria = None
    if parsed_employers:
        all_verified = all(e.get("linkedin_verified") for e in parsed_employers)
        any_too_small = any(
            e.get("linkedin_verified") and int(e.get("employee_count", 0) or 0) <= 50
            for e in parsed_employers
        )
        if any_too_small:
            meets_employer_criteria = "no"
        elif all_verified:
            meets_employer_criteria = "yes"
        else:
            meets_employer_criteria = "unverified"

    record = models.CandidateEvaluationReport(
        assessment_generation_id=assessment_id,
        candidate_name=candidate_name,
        candidate_answers=parsed_answers,
        evaluations=parsed_evaluations,
        total_score=total_score,
        max_score=max_score,
        job_knowledge_match=job_knowledge_match,
        communication_score=communication_score,
        previous_employers=parsed_employers,
        meets_employer_criteria=meets_employer_criteria,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    score_pct = round((total_score / max_score * 100) if max_score > 0 else 0, 1)

    # 1. Update any corresponding AssessmentInvitation for this assessment/candidate
    invitation = db.query(models.AssessmentInvitation).filter(
        models.AssessmentInvitation.assessment_generation_id == assessment_id,
        (models.AssessmentInvitation.candidate_name == candidate_name) |
        (models.AssessmentInvitation.status == "pending")
    ).first()

    if invitation:
        invitation.status = "submitted"
        invitation.submitted_at = func.now()
        invitation.evaluation_report_id = record.id
        invitation.score_percentage = score_pct
        db.commit()

    # 2. Trigger in-app notifications for all staff members
    sm = assessment.source_material
    job_title = (sm.filename or sm.role_or_topic) if sm else "Role Assessment"
    org_name = (sm.organization_name if sm and sm.organization_name else None) or current_user.organization_name or "TalentAssess AI"

    staff_users = db.query(models.User).filter(
        models.User.role.in_(["recruiter", "admin", "hr", "account_manager"]),
        models.User.is_active == True
    ).all()
    target_staff = list(staff_users)
    if current_user not in target_staff:
        target_staff.append(current_user)

    for staff in target_staff:
        try:
            notif = models.RecruiterNotification(
                user_id=staff.id,
                invitation_id=invitation.id if invitation else None,
                report_id=record.id,
                type="assessment_submitted",
                title=f"Assessment Completed: {candidate_name or 'Candidate'}",
                message=f"Assessment for {job_title} has been evaluated and recorded for {candidate_name or 'Candidate'} with an overall score of {score_pct}%.",
                candidate_name=candidate_name or "Candidate",
                candidate_email=(invitation.candidate_email if invitation else None) or f"{(candidate_name or 'candidate').lower().replace(' ', '.')}@example.com",
                job_title=job_title,
                score_percentage=score_pct,
                is_read=False
            )
            db.add(notif)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Warning: Could not record notification for staff user_id={staff.id}: {e}")

    # 3. Trigger email notification if SMTP configured
    if current_user.email:
        try:
            EmailService.send_recruiter_submission_notification(
                recruiter_email=current_user.email,
                recruiter_name=current_user.full_name or current_user.organization_name or "Recruiter",
                candidate_name=candidate_name or "Candidate",
                candidate_email=(invitation.candidate_email if invitation else None) or f"{(candidate_name or 'candidate').lower().replace(' ', '.')}@example.com",
                job_title=job_title,
                organization_name=org_name,
                score_percentage=score_pct,
                total_score=total_score,
                max_score=max_score,
                job_knowledge_match=job_knowledge_match,
                communication_score=communication_score,
                report_id=record.id
            )
        except Exception as e:
            print(f"Warning: Recruiter submission email notification failed: {e}")

    return {"report_id": record.id, "total_score": total_score, "max_score": max_score}


# 5. List past candidate evaluation reports - scoped to recruiter's own data (or all for managers/admin)
@app.get("/api/v1/reports")
def list_reports(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = (
        db.query(models.CandidateEvaluationReport)
        .join(models.AssessmentGeneration, models.CandidateEvaluationReport.assessment_generation_id == models.AssessmentGeneration.id)
        .join(models.SourceMaterial, models.AssessmentGeneration.source_material_id == models.SourceMaterial.id)
    )
    if getattr(current_user, "role", "recruiter") == "recruiter":
        query = query.filter(models.SourceMaterial.user_id == current_user.id)
    reports = query.order_by(desc(models.CandidateEvaluationReport.created_at)).all()

    result = []
    for r in reports:
        ag = r.assessment_generation
        sm = ag.source_material if ag else None
        pct = round((r.total_score / r.max_score * 100) if (r.max_score and r.max_score > 0) else 0, 1)
        result.append({
            "report_id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "candidate_name": r.candidate_name,
            "total_score": r.total_score,
            "max_score": r.max_score,
            "score_percentage": pct,
            "job_knowledge_match": r.job_knowledge_match,
            "communication_score": r.communication_score,
            "meets_employer_criteria": r.meets_employer_criteria,
            "is_onboarded": bool(r.is_onboarded),
            "onboarded_at": r.onboarded_at.isoformat() if r.onboarded_at else None,
            "difficulty": ag.difficulty if ag else None,
            "question_type": ag.question_type if ag else None,
            "num_questions": ag.num_questions if ag else None,
            "source": (sm.filename or sm.role_or_topic or "")[:80] if sm else None,
            "organization_name": sm.organization_name if sm else None,
        })
    return result


# 6. View a single candidate evaluation report in full - ownership-checked.
@app.get("/api/v1/reports/{report_id}")
def get_report(report_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.query(models.CandidateEvaluationReport).filter(
        models.CandidateEvaluationReport.id == report_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Evaluation report not found.")
    ag = report.assessment_generation
    if getattr(current_user, "role", "recruiter") == "recruiter":
        _check_source_ownership(ag.source_material if ag else None, current_user)

    sm = ag.source_material if ag else None
    pct = round((report.total_score / report.max_score * 100) if report.max_score > 0 else 0, 1)
    return {
        "report_id": report.id,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "candidate_name": report.candidate_name,
        "total_score": report.total_score,
        "max_score": report.max_score,
        "score_percentage": pct,
        "job_knowledge_match": report.job_knowledge_match,
        "communication_score": report.communication_score,
        "meets_employer_criteria": report.meets_employer_criteria,
        "previous_employers": report.previous_employers or [],
        "is_onboarded": bool(report.is_onboarded),
        "onboarded_at": report.onboarded_at.isoformat() if report.onboarded_at else None,
        "candidate_answers": report.candidate_answers,
        "evaluations": report.evaluations,
        "questions": (ag.questions or {}).get("questions", []) if ag else [],
        "difficulty": ag.difficulty if ag else None,
        "question_type": ag.question_type if ag else None,
        "source": sm.filename or sm.role_or_topic if sm else None,
        "organization_name": sm.organization_name if sm else None,
    }


# 7. Candidate Assessment Invitation Endpoints

# 7a. Send / create invitations for selected candidates
@app.post("/api/v1/assessment/invite-candidates")
def invite_candidates(
    assessment_id: int = Form(...),
    candidates: str = Form(...),  # JSON string: [{"candidate_name": "...", "candidate_email": "...", "resume_id": 123}]
    duration_minutes: Optional[int] = Form(15),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assessment = db.query(models.AssessmentGeneration).filter(
        models.AssessmentGeneration.id == assessment_id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    _check_source_ownership(assessment.source_material, current_user)

    try:
        candidate_list = json.loads(candidates)
        if not isinstance(candidate_list, list):
            candidate_list = [candidate_list]
    except Exception:
        raise HTTPException(status_code=400, detail="candidates must be a valid JSON array of objects.")

    inv_duration = duration_minutes if (duration_minutes and duration_minutes > 0) else 15
    sm = assessment.source_material if assessment else None
    owner = (sm.owner if sm else None) or current_user
    org_name = (sm.organization_name if sm and sm.organization_name else None) or (current_user.organization_name if current_user and current_user.organization_name else None) or (owner.organization_name if owner else None) or "TalentAssess AI"
    job_title = (sm.filename or sm.role_or_topic) if sm else "Role Assessment"
    num_q = assessment.num_questions or 5
    diff = assessment.difficulty or "Intermediate"
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")

    invitations = []
    for c in candidate_list:
        c_name = (c.get("candidate_name") or "Candidate").strip()
        c_email = (c.get("candidate_email") or f"{c_name.lower().replace(' ', '.')}@example.com").strip()
        r_id = c.get("resume_id")

        # 1. Automatically create candidate user login account if not exists
        candidate_user = db.query(models.User).filter(models.User.email == c_email).first()
        temp_password = None
        if not candidate_user:
            temp_password = f"Pass@{uuid.uuid4().hex[:6]}"
            candidate_user = models.User(
                email=c_email,
                hashed_password=hash_password(temp_password),
                full_name=c_name,
                organization_name=org_name,
                role="candidate",
                is_active=True,
                must_reset_password=False
            )
            db.add(candidate_user)
            db.commit()
            db.refresh(candidate_user)
        elif candidate_user.role == "candidate":
            temp_password = f"Pass@{uuid.uuid4().hex[:6]}"
            candidate_user.hashed_password = hash_password(temp_password)
            db.commit()

        token = str(uuid.uuid4())
        invite_link = f"{frontend_url}?invite_token={token}"

        # Real email delivery attempt with candidate credentials & direct assessment link
        email_sent, email_detail = EmailService.send_assessment_invitation(
            candidate_name=c_name,
            candidate_email=c_email,
            invitation_link=invite_link,
            job_title=job_title,
            organization_name=org_name,
            num_questions=num_q,
            duration_minutes=inv_duration,
            difficulty=diff,
            candidate_login_email=c_email,
            candidate_password=temp_password,
            portal_link=frontend_url
        )

        invitation = models.AssessmentInvitation(
            assessment_generation_id=assessment.id,
            candidate_resume_id=r_id,
            candidate_name=c_name,
            candidate_email=c_email,
            invitation_token=token,
            status="pending",
            duration_minutes=inv_duration,
            invited_by_user_id=current_user.id,
            candidate_user_id=candidate_user.id if candidate_user else None,
            candidate_temp_password=temp_password,
            email_sent=email_sent,
            email_delivery_status="sent" if email_sent else ("smtp_not_configured" if not EmailService.is_configured() else f"failed: {email_detail}"),
            email_sent_at=func.now() if email_sent else None
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)

        invitations.append({
            "invitation_id": invitation.id,
            "candidate_name": invitation.candidate_name,
            "candidate_email": invitation.candidate_email,
            "candidate_user_id": candidate_user.id if candidate_user else None,
            "candidate_login_email": c_email,
            "candidate_temp_password": temp_password,
            "candidate_portal_url": frontend_url,
            "invitation_token": invitation.invitation_token,
            "invitation_link": invite_link,
            "job_title": job_title,
            "organization_name": org_name,
            "num_questions": num_q,
            "difficulty": diff,
            "duration_minutes": invitation.duration_minutes or inv_duration,
            "status": invitation.status,
            "email_sent": invitation.email_sent,
            "email_delivery_status": invitation.email_delivery_status,
            "email_status_detail": email_detail,
            "created_at": invitation.created_at.isoformat() if invitation.created_at else None,
        })

    return {
        "assessment_id": assessment.id,
        "total_invited": len(invitations),
        "smtp_configured": EmailService.is_configured(),
        "invitations": invitations
    }


# 7a-2. Resend assessment invitation email to candidate
@app.post("/api/v1/assessment/resend-invitation")
def resend_invitation(
    invitation_id: int = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invitation = db.query(models.AssessmentInvitation).filter(
        models.AssessmentInvitation.id == invitation_id
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    ag = invitation.assessment_generation
    _check_source_ownership(ag.source_material if ag else None, current_user)

    sm = ag.source_material if ag else None
    owner = sm.owner if sm else current_user
    org_name = (sm.organization_name if sm and sm.organization_name else None) or (owner.organization_name if owner else None) or "TalentAssess AI"
    job_title = (sm.filename or sm.role_or_topic) if sm else "Role Assessment"
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    invitation_link = f"{frontend_url}?invite_token={invitation.invitation_token}"

    inv_duration = invitation.duration_minutes or 15
    email_sent, email_detail = EmailService.send_assessment_invitation(
        candidate_name=invitation.candidate_name,
        candidate_email=invitation.candidate_email,
        invitation_link=invitation_link,
        job_title=job_title,
        organization_name=org_name,
        num_questions=ag.num_questions if ag else 5,
        duration_minutes=inv_duration,
        difficulty=ag.difficulty if ag else "Intermediate"
    )

    invitation.email_sent = email_sent
    invitation.email_delivery_status = "sent" if email_sent else ("smtp_not_configured" if not EmailService.is_configured() else f"failed: {email_detail}")
    if email_sent:
        invitation.email_sent_at = func.now()
    db.commit()
    db.refresh(invitation)

    return {
        "success": email_sent,
        "message": email_detail,
        "email_sent": invitation.email_sent,
        "email_delivery_status": invitation.email_delivery_status,
        "invitation_id": invitation.id,
        "candidate_email": invitation.candidate_email
    }


# 7a-3. SMTP configuration status check
@app.get("/api/v1/assessment/smtp-status")
def get_smtp_status(current_user: models.User = Depends(get_current_user)):
    config = EmailService.get_smtp_config()
    return {
        "configured": EmailService.is_configured(),
        "server": config["server"] if config["server"] else None,
        "port": config["port"],
        "from_email": config["from_email"],
        "from_name": config["from_name"]
    }


# 7a-4. Invitation email preview endpoint
@app.get("/api/v1/assessment/invitation-preview/{invitation_id}")
def get_invitation_preview(
    invitation_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invitation = db.query(models.AssessmentInvitation).filter(
        models.AssessmentInvitation.id == invitation_id
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    ag = invitation.assessment_generation
    _check_source_ownership(ag.source_material if ag else None, current_user)

    sm = ag.source_material if ag else None
    owner = (sm.owner if sm else None) or current_user
    org_name = (sm.organization_name if sm and sm.organization_name else None) or (current_user.organization_name if current_user and current_user.organization_name else None) or (owner.organization_name if owner else None) or "TalentAssess AI"
    job_title = (sm.filename or sm.role_or_topic) if sm else "Role Assessment"
    frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    invitation_link = f"{frontend_url}?invite_token={invitation.invitation_token}"

    inv_duration = invitation.duration_minutes or 15
    subject, text_body, html_body = EmailService.generate_email_content(
        candidate_name=invitation.candidate_name,
        invitation_link=invitation_link,
        job_title=job_title,
        organization_name=org_name,
        num_questions=ag.num_questions if ag else 5,
        duration_minutes=inv_duration,
        difficulty=ag.difficulty if ag else "Standard"
    )

    return {
        "invitation_id": invitation.id,
        "candidate_name": invitation.candidate_name,
        "candidate_email": invitation.candidate_email,
        "job_title": job_title,
        "organization_name": org_name,
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "invitation_link": invitation_link,
        "email_sent": invitation.email_sent,
        "email_delivery_status": invitation.email_delivery_status,
        "smtp_configured": EmailService.is_configured()
    }


# 7b. Candidate Public Assessment Access Endpoint (no recruiter auth required)
@app.get("/api/v1/assessment/invitation/{invite_token}")
def get_assessment_by_token(invite_token: str, db: Session = Depends(get_db)):
    invitation = db.query(models.AssessmentInvitation).filter(
        models.AssessmentInvitation.invitation_token == invite_token
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Assessment invitation not found or link has expired.")

    ag = invitation.assessment_generation
    sm = ag.source_material if ag else None
    owner = sm.owner if sm else None

    # If already submitted, return status so candidate sees completed view
    if invitation.status == "submitted":
        rep = invitation.evaluation_report
        return {
            "invitation_id": invitation.id,
            "submitted": True,
            "candidate_name": invitation.candidate_name,
            "candidate_email": invitation.candidate_email,
            "total_score": rep.total_score if rep else None,
            "max_score": rep.max_score if rep else None,
            "score_percentage": round((rep.total_score / rep.max_score * 100) if (rep and rep.max_score > 0) else 0, 1) if rep else None,
            "organization_name": sm.organization_name if sm and sm.organization_name else (owner.organization_name if owner else "TalentAssess AI"),
            "job_title": sm.filename or sm.role_or_topic or "Role Assessment" if sm else "Assessment",
            "submitted_at": invitation.submitted_at.isoformat() if invitation.submitted_at else None
        }

    raw_questions = (ag.questions or {}).get("questions", [])
    # Strip correct answers so candidate cannot inspect DOM / network to cheat!
    candidate_questions = []
    for q in raw_questions:
        candidate_questions.append({
            "question_type": q.get("question_type", "MCQ"),
            "question_text": q.get("question_text", ""),
            "options": q.get("options", []),
        })

    return {
        "invitation_id": invitation.id,
        "submitted": False,
        "candidate_name": invitation.candidate_name,
        "candidate_email": invitation.candidate_email,
        "organization_name": sm.organization_name if sm and sm.organization_name else (owner.organization_name if owner else "TalentAssess AI"),
        "job_title": sm.filename or sm.role_or_topic or "Role Assessment" if sm else "Assessment",
        "difficulty": ag.difficulty,
        "num_questions": len(candidate_questions),
        "duration_minutes": invitation.duration_minutes or 15,
        "questions": candidate_questions,
    }


# 7c. Candidate Public Assessment Submission Endpoint (no recruiter auth required, links candidate if authenticated or registered)
@app.post("/api/v1/assessment/submit-candidate-assessment")
def submit_candidate_assessment(
    invite_token: str = Form(...),
    candidate_answers: str = Form(...),  # JSON string: {questionIndex: answerText}
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    invitation = db.query(models.AssessmentInvitation).filter(
        models.AssessmentInvitation.invitation_token == invite_token
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation token.")

    if invitation.status == "submitted":
        raise HTTPException(status_code=400, detail="This assessment has already been submitted.")

    try:
        parsed_answers = json.loads(candidate_answers)
    except Exception:
        raise HTTPException(status_code=400, detail="candidate_answers must be a valid JSON object.")

    ag = invitation.assessment_generation
    stored_questions = (ag.questions or {}).get("questions", [])

    total_score = 0.0
    max_score = 0.0
    accuracy_scores = []
    clarity_scores = []
    evaluations = {}

    for idx, q in enumerate(stored_questions):
        idx_str = str(idx)
        user_ans = parsed_answers.get(idx_str, "").strip()
        q_type = q.get("question_type", "MCQ")
        correct_ans = q.get("correct_answer", "").strip()

        if q_type == "MCQ":
            max_score += 1.0
            # Compare normalized options
            is_correct = (user_ans.lower() == correct_ans.lower()) or (
                len(user_ans) > 0 and correct_ans.lower().startswith(user_ans.lower())
            )
            q_score = 1.0 if is_correct else 0.0
            total_score += q_score
            evaluations[idx_str] = {
                "overall_score": q_score,
                "feedback": "Correct answer!" if is_correct else f"Incorrect. Correct answer: {correct_ans}",
                "correct": is_correct
            }
        else:
            # Subjective / Scenario question
            max_score += 10.0
            try:
                sub_eval = evaluator_service.evaluate_subjective(
                    q.get("question_text", ""),
                    correct_ans or q.get("explanation", ""),
                    user_ans,
                    max_marks=10
                )
                q_score = float(sub_eval.get("overall_score", 0) or 0)
                total_score += q_score
                if "accuracy" in sub_eval:
                    accuracy_scores.append(float(sub_eval["accuracy"]))
                if "clarity_and_grammar" in sub_eval:
                    clarity_scores.append(float(sub_eval["clarity_and_grammar"]))
                evaluations[idx_str] = sub_eval
            except Exception as e:
                evaluations[idx_str] = {
                    "overall_score": 5.0,
                    "feedback": f"Evaluated with default criteria: {str(e)}",
                    "accuracy": 5.0,
                    "clarity_and_grammar": 5.0
                }
                total_score += 5.0
                accuracy_scores.append(5.0)
                clarity_scores.append(5.0)

    job_knowledge_match = (sum(accuracy_scores) / len(accuracy_scores) * 10) if accuracy_scores else round((total_score / max_score * 100) if max_score > 0 else 0, 1)
    communication_score = (sum(clarity_scores) / len(clarity_scores) * 10) if clarity_scores else 85.0

    # Determine candidate user id
    cand_user = current_user if (current_user and current_user.role == "candidate") else None
    if not cand_user:
        cand_user = db.query(models.User).filter(
            func.lower(models.User.email) == invitation.candidate_email.lower().strip()
        ).first()
    candidate_user_id = cand_user.id if cand_user else None

    report = models.CandidateEvaluationReport(
        assessment_generation_id=ag.id,
        candidate_name=invitation.candidate_name,
        candidate_answers=parsed_answers,
        evaluations=evaluations,
        total_score=total_score,
        max_score=max_score,
        job_knowledge_match=job_knowledge_match,
        communication_score=communication_score,
        previous_employers=None,
        meets_employer_criteria=None,
        candidate_user_id=candidate_user_id
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    invitation.status = "submitted"
    invitation.submitted_at = func.now()
    invitation.evaluation_report_id = report.id
    if candidate_user_id:
        invitation.candidate_user_id = candidate_user_id
    db.commit()

    score_pct = round((total_score / max_score * 100) if max_score > 0 else 0, 1)

    # Trigger recruiter notification (both in-app notification and automated email alert)
    sm = ag.source_material if ag else None

    # 1. Gather all staff recipients for in-app notification (exclude candidates)
    staff_users = db.query(models.User).filter(
        models.User.role.in_(["recruiter", "admin", "hr", "account_manager"]),
        models.User.is_active == True
    ).all()

    inviting_user = None
    if invitation.invited_by_user_id:
        inviting_user = db.query(models.User).filter(models.User.id == invitation.invited_by_user_id).first()
    if not inviting_user and sm and sm.owner:
        inviting_user = sm.owner
    elif not inviting_user and sm and sm.user_id:
        inviting_user = db.query(models.User).filter(models.User.id == sm.user_id).first()

    target_staff = list(staff_users)
    if inviting_user and inviting_user not in target_staff:
        target_staff.append(inviting_user)

    # Fallback if no staff users found in db
    if not target_staff:
        fallback_u = db.query(models.User).filter(models.User.is_active == True).first()
        if fallback_u:
            target_staff.append(fallback_u)

    org_name = (sm.organization_name if sm and sm.organization_name else None) or (inviting_user.organization_name if inviting_user else None) or "TalentAssess AI"
    job_title = (sm.filename or sm.role_or_topic) if sm else "Role Assessment"

    # 2. Record in-app recruiter notifications for all staff members
    for staff in target_staff:
        try:
            notif = models.RecruiterNotification(
                user_id=staff.id,
                invitation_id=invitation.id,
                report_id=report.id,
                type="assessment_submitted",
                title=f"Assessment Completed: {invitation.candidate_name}",
                message=f"{invitation.candidate_name} has completed the assessment for {job_title} with an overall score of {score_pct}%.",
                candidate_name=invitation.candidate_name,
                candidate_email=invitation.candidate_email,
                job_title=job_title,
                score_percentage=score_pct,
                is_read=False
            )
            db.add(notif)
            db.commit()
            print(f"Recorded in-app recruiter notification for user_id={staff.id} ({staff.email}), candidate={invitation.candidate_name}")
        except Exception as e:
            db.rollback()
            print(f"Warning: Could not record in-app recruiter notification for user_id={staff.id}: {e}")

    # 3. Send automated recruiter alert email via SMTP to the primary recruiter
    email_recruiter = inviting_user or (staff_users[0] if staff_users else None)
    recruiter_email_sent = False
    recruiter_email_msg = "No active recruiter email configured"

    if email_recruiter and email_recruiter.email:
        try:
            ok, msg = EmailService.send_recruiter_submission_notification(
                recruiter_email=email_recruiter.email,
                recruiter_name=email_recruiter.full_name or email_recruiter.organization_name or "Recruiter",
                candidate_name=invitation.candidate_name,
                candidate_email=invitation.candidate_email,
                job_title=job_title,
                organization_name=org_name,
                score_percentage=score_pct,
                total_score=total_score,
                max_score=max_score,
                job_knowledge_match=job_knowledge_match,
                communication_score=communication_score,
                report_id=report.id
            )
            recruiter_email_sent = ok
            recruiter_email_msg = msg
            print(f"[RECRUITER NOTIFICATION EMAIL] Dispatched to {email_recruiter.email}: {ok} - {msg}")
        except Exception as e:
            recruiter_email_msg = f"Failed to dispatch: {str(e)}"
            print(f"Warning: Could not dispatch recruiter submission notification email: {e}")

    # 4. Also send candidate submission confirmation email
    if invitation.candidate_email:
        try:
            cand_ok, cand_msg = EmailService.send_candidate_submission_confirmation(
                candidate_email=invitation.candidate_email,
                candidate_name=invitation.candidate_name,
                job_title=job_title,
                organization_name=org_name,
                score_percentage=score_pct,
                report_id=report.id,
                portal_url="http://localhost:3000"
            )
            print(f"[CANDIDATE CONFIRMATION EMAIL] Dispatched to {invitation.candidate_email}: {cand_ok} - {cand_msg}")
        except Exception as e:
            print(f"Warning: Could not dispatch candidate submission confirmation email: {e}")

    return {
        "status": "success",
        "message": "Assessment submitted and evaluated successfully!",
        "report_id": report.id,
        "candidate_name": invitation.candidate_name,
        "total_score": total_score,
        "max_score": max_score,
        "score_percentage": score_pct,
        "job_knowledge_match": job_knowledge_match,
        "communication_score": communication_score,
        "job_title": job_title,
        "organization_name": org_name,
        "candidate_user_id": candidate_user_id,
        "evaluations": evaluations,
        "recruiter_email_sent": recruiter_email_sent,
        "recruiter_email_message": recruiter_email_msg
    }


# --------------------------------------------------------------------------
# Candidate Portal & Self-Service Report Endpoints
# --------------------------------------------------------------------------

@app.get("/api/v1/candidate/my-assessments")
def get_candidate_assessments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all assessment invitations assigned to this candidate."""
    invitations = db.query(models.AssessmentInvitation).filter(
        (models.AssessmentInvitation.candidate_user_id == current_user.id) |
        (func.lower(models.AssessmentInvitation.candidate_email) == current_user.email.lower().strip())
    ).order_by(desc(models.AssessmentInvitation.created_at)).all()

    results = []
    for inv in invitations:
        ag = inv.assessment_generation
        sm = ag.source_material if ag else None
        rep = inv.evaluation_report
        pct = round((rep.total_score / rep.max_score * 100) if (rep and rep.max_score > 0) else 0, 1) if rep else None
        job_title = sm.filename or sm.role_or_topic or "Role Assessment" if sm else "Assessment"
        org_name = sm.organization_name if sm and sm.organization_name else "TalentAssess AI"
        q_count = ag.num_questions if ag else (len(ag.questions.get("questions", [])) if ag and ag.questions else 0)
        results.append({
            "invitation_id": inv.id,
            "invitation_token": inv.invitation_token,
            "job_title": job_title,
            "organization_name": org_name,
            "status": inv.status,
            "duration_minutes": inv.duration_minutes or 15,
            "num_questions": q_count,
            "difficulty": ag.difficulty if ag else "Intermediate",
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "submitted_at": inv.submitted_at.isoformat() if inv.submitted_at else None,
            "evaluation_report_id": inv.evaluation_report_id,
            "score_percentage": pct,
        })
    return {"assessments": results}


@app.get("/api/v1/candidate/my-reports")
def get_candidate_reports(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns all completed evaluation reports for this candidate."""
    reports = db.query(models.CandidateEvaluationReport).filter(
        (models.CandidateEvaluationReport.candidate_user_id == current_user.id) |
        (models.CandidateEvaluationReport.id.in_(
            db.query(models.AssessmentInvitation.evaluation_report_id).filter(
                func.lower(models.AssessmentInvitation.candidate_email) == current_user.email.lower().strip()
            )
        ))
    ).order_by(desc(models.CandidateEvaluationReport.created_at)).all()

    results = []
    for r in reports:
        ag = r.assessment_generation
        sm = ag.source_material if ag else None
        pct = round((r.total_score / r.max_score * 100) if r.max_score > 0 else 0, 1)
        job_title = sm.filename or sm.role_or_topic or "Role Assessment" if sm else "Assessment"
        org_name = sm.organization_name if sm and sm.organization_name else "TalentAssess AI"
        num_q = len((ag.questions or {}).get("questions", [])) if ag else len(r.candidate_answers or {})
        results.append({
            "report_id": r.id,
            "job_title": job_title,
            "organization_name": org_name,
            "total_score": r.total_score,
            "max_score": r.max_score,
            "score_percentage": pct,
            "job_knowledge_match": r.job_knowledge_match,
            "communication_score": r.communication_score,
            "difficulty": ag.difficulty if ag else "Standard",
            "num_questions": num_q,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return {"reports": results}


@app.get("/api/v1/candidate/my-reports/{report_id}")
def get_candidate_report_detail(
    report_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns full question-by-question evaluation details for a candidate report."""
    report = db.query(models.CandidateEvaluationReport).filter(
        models.CandidateEvaluationReport.id == report_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Evaluation report not found.")

    # Ownership check
    is_owner = (report.candidate_user_id == current_user.id)
    if not is_owner and report.assessment_invitation:
        is_owner = (report.assessment_invitation.candidate_email.lower().strip() == current_user.email.lower().strip())
    if not is_owner and current_user.role not in ["recruiter", "admin", "hr"]:
        raise HTTPException(status_code=403, detail="You do not have access to this report.")

    ag = report.assessment_generation
    sm = ag.source_material if ag else None
    stored_questions = (ag.questions or {}).get("questions", []) if ag else []
    answers = report.candidate_answers or {}
    evals = report.evaluations or {}

    questions_detailed = []
    for idx, q in enumerate(stored_questions):
        idx_str = str(idx)
        cand_ans = answers.get(idx_str, "")
        q_eval = evals.get(idx_str, {})
        questions_detailed.append({
            "index": idx + 1,
            "question_text": q.get("question_text", ""),
            "question_type": q.get("question_type", "MCQ"),
            "options": q.get("options", []),
            "candidate_answer": cand_ans,
            "correct_answer": q.get("correct_answer", ""),
            "explanation": q.get("explanation", ""),
            "score": q_eval.get("overall_score", 0),
            "max_marks": 1.0 if q.get("question_type") == "MCQ" else 10.0,
            "feedback": q_eval.get("feedback", ""),
            "correct": q_eval.get("correct", None),
            "accuracy": q_eval.get("accuracy", None),
            "clarity_and_grammar": q_eval.get("clarity_and_grammar", None),
        })

    pct = round((report.total_score / report.max_score * 100) if report.max_score > 0 else 0, 1)
    return {
        "report_id": report.id,
        "candidate_name": report.candidate_name,
        "candidate_email": current_user.email,
        "job_title": sm.filename or sm.role_or_topic or "Role Assessment" if sm else "Assessment",
        "organization_name": sm.organization_name if sm and sm.organization_name else "TalentAssess AI",
        "difficulty": ag.difficulty if ag else "Standard",
        "total_score": report.total_score,
        "max_score": report.max_score,
        "score_percentage": pct,
        "job_knowledge_match": report.job_knowledge_match,
        "communication_score": report.communication_score,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "questions": questions_detailed
    }


@app.get("/api/v1/assessment/public-report/{invite_token}")
def get_public_report_by_token(invite_token: str, db: Session = Depends(get_db)):
    """Allows candidate to immediately view their evaluation report after submission using their token."""
    invitation = db.query(models.AssessmentInvitation).filter(
        models.AssessmentInvitation.invitation_token == invite_token
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation token not found.")
    if invitation.status != "submitted" or not invitation.evaluation_report_id:
        raise HTTPException(status_code=400, detail="Assessment has not been evaluated or submitted yet.")

    report = invitation.evaluation_report
    if not report:
        raise HTTPException(status_code=404, detail="Evaluation report record not found.")

    ag = invitation.assessment_generation
    sm = ag.source_material if ag else None
    stored_questions = (ag.questions or {}).get("questions", []) if ag else []
    answers = report.candidate_answers or {}
    evals = report.evaluations or {}

    questions_detailed = []
    for idx, q in enumerate(stored_questions):
        idx_str = str(idx)
        cand_ans = answers.get(idx_str, "")
        q_eval = evals.get(idx_str, {})
        questions_detailed.append({
            "index": idx + 1,
            "question_text": q.get("question_text", ""),
            "question_type": q.get("question_type", "MCQ"),
            "options": q.get("options", []),
            "candidate_answer": cand_ans,
            "correct_answer": q.get("correct_answer", ""),
            "explanation": q.get("explanation", ""),
            "score": q_eval.get("overall_score", 0),
            "max_marks": 1.0 if q.get("question_type") == "MCQ" else 10.0,
            "feedback": q_eval.get("feedback", ""),
            "correct": q_eval.get("correct", None),
            "accuracy": q_eval.get("accuracy", None),
            "clarity_and_grammar": q_eval.get("clarity_and_grammar", None),
        })

    pct = round((report.total_score / report.max_score * 100) if report.max_score > 0 else 0, 1)
    return {
        "report_id": report.id,
        "candidate_name": invitation.candidate_name,
        "candidate_email": invitation.candidate_email,
        "job_title": sm.filename or sm.role_or_topic or "Role Assessment" if sm else "Assessment",
        "organization_name": sm.organization_name if sm and sm.organization_name else "TalentAssess AI",
        "difficulty": ag.difficulty if ag else "Standard",
        "total_score": report.total_score,
        "max_score": report.max_score,
        "score_percentage": pct,
        "job_knowledge_match": report.job_knowledge_match,
        "communication_score": report.communication_score,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "questions": questions_detailed
    }


# 7d. Recruiter Invitations List Endpoint
@app.get("/api/v1/assessment/invitations")
def list_assessment_invitations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(models.AssessmentInvitation)
        .join(models.AssessmentGeneration, models.AssessmentInvitation.assessment_generation_id == models.AssessmentGeneration.id)
        .join(models.SourceMaterial, models.AssessmentGeneration.source_material_id == models.SourceMaterial.id)
    )
    if getattr(current_user, "role", "recruiter") == "recruiter":
        query = query.filter(models.SourceMaterial.user_id == current_user.id)
    invitations = query.order_by(desc(models.AssessmentInvitation.created_at)).all()

    results = []
    for inv in invitations:
        ag = inv.assessment_generation
        sm = ag.source_material if ag else None
        owner = (sm.owner if sm else None) or inv.invited_by
        org_name = (sm.organization_name if sm and sm.organization_name else None) or (owner.organization_name if owner else None) or (current_user.organization_name if current_user else None) or "TalentAssess AI"
        rep = inv.evaluation_report
        score_pct = round((rep.total_score / rep.max_score * 100) if (rep and rep.max_score > 0) else 0, 1) if rep else None

        results.append({
            "invitation_id": inv.id,
            "candidate_name": inv.candidate_name,
            "candidate_email": inv.candidate_email,
            "candidate_user_id": inv.candidate_user_id,
            "candidate_login_email": inv.candidate_email,
            "candidate_temp_password": getattr(inv, "candidate_temp_password", None),
            "candidate_portal_url": "http://localhost:3000",
            "invitation_token": inv.invitation_token,
            "invitation_link": f"http://localhost:3000?invite_token={inv.invitation_token}",
            "status": inv.status,
            "email_sent": inv.email_sent,
            "email_delivery_status": inv.email_delivery_status,
            "email_sent_at": inv.email_sent_at.isoformat() if inv.email_sent_at else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "submitted_at": inv.submitted_at.isoformat() if inv.submitted_at else None,
            "report_id": inv.evaluation_report_id,
            "is_onboarded": bool(inv.is_onboarded),
            "onboarded_at": inv.onboarded_at.isoformat() if inv.onboarded_at else None,
            "job_title": sm.filename or sm.role_or_topic or "Job Role" if sm else "Job Role",
            "organization_name": org_name,
            "num_questions": len((ag.questions or {}).get("questions", [])) if ag else 5,
            "difficulty": ag.difficulty if ag else "Standard",
            "duration_minutes": inv.duration_minutes or 15,
            "score_percentage": score_pct,
            "total_score": rep.total_score if rep else None,
            "max_score": rep.max_score if rep else None,
            "job_knowledge_match": rep.job_knowledge_match if rep else None,
            "communication_score": rep.communication_score if rep else None,
        })

    return results


# --- 8. Recruiter Notifications Endpoints ---

@app.get("/api/v1/notifications")
def get_notifications(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all notifications for the authenticated recruiter, ordered newest first.
    """
    notifs = (
        db.query(models.RecruiterNotification)
        .filter(models.RecruiterNotification.user_id == current_user.id)
        .order_by(desc(models.RecruiterNotification.created_at))
        .limit(100)
        .all()
    )

    # For recruiters/admins/HR: if this specific user has no notifications assigned,
    # fallback to all system notifications so team members see submissions
    if not notifs and current_user.role in ["recruiter", "admin", "hr", "account_manager"]:
        notifs = (
            db.query(models.RecruiterNotification)
            .order_by(desc(models.RecruiterNotification.created_at))
            .limit(100)
            .all()
        )

    unread_count = sum(1 for n in notifs if not n.is_read)

    items = []
    for n in notifs:
        items.append({
            "id": n.id,
            "invitation_id": n.invitation_id,
            "report_id": n.report_id,
            "type": n.type or "assessment_submitted",
            "title": n.title,
            "message": n.message,
            "candidate_name": n.candidate_name,
            "candidate_email": n.candidate_email,
            "job_title": n.job_title,
            "score_percentage": n.score_percentage,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    return {
        "unread_count": unread_count,
        "total_count": len(items),
        "notifications": items
    }


@app.get("/api/v1/notifications/unread-count")
def get_unread_notification_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lightweight endpoint for polling unread notification count.
    """
    unread_count = (
        db.query(models.RecruiterNotification)
        .filter(
            models.RecruiterNotification.user_id == current_user.id,
            models.RecruiterNotification.is_read == False
        )
        .count()
    )

    if unread_count == 0 and current_user.role in ["recruiter", "admin", "hr", "account_manager"]:
        total_for_user = db.query(models.RecruiterNotification).filter(models.RecruiterNotification.user_id == current_user.id).count()
        if total_for_user == 0:
            unread_count = db.query(models.RecruiterNotification).filter(models.RecruiterNotification.is_read == False).count()

    return {"unread_count": unread_count}


@app.post("/api/v1/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a single notification as read.
    """
    notif = db.query(models.RecruiterNotification).filter(
        models.RecruiterNotification.id == notification_id,
        models.RecruiterNotification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    return {"status": "success", "notification_id": notif.id, "is_read": True}


@app.post("/api/v1/notifications/mark-all-read")
def mark_all_notifications_as_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all unread notifications as read for current recruiter.
    """
    updated_count = (
        db.query(models.RecruiterNotification)
        .filter(
            models.RecruiterNotification.user_id == current_user.id,
            models.RecruiterNotification.is_read == False
        )
        .update({"is_read": True})
    )
    db.commit()
    return {"status": "success", "marked_read_count": updated_count}


@app.delete("/api/v1/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a notification for the current recruiter.
    """
    notif = db.query(models.RecruiterNotification).filter(
        models.RecruiterNotification.id == notification_id,
        models.RecruiterNotification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    db.delete(notif)
    db.commit()
    return {"status": "success", "deleted_id": notification_id}


# --- 9. Candidate Onboarding & Admin / Executive Dashboard Endpoints ---

@app.post("/api/v1/assessment/toggle-onboard")
def toggle_onboard(
    invitation_id: Optional[int] = Form(None),
    report_id: Optional[int] = Form(None),
    is_onboarded: bool = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invitation = None
    report = None
    if invitation_id:
        invitation = db.query(models.AssessmentInvitation).filter(models.AssessmentInvitation.id == invitation_id).first()
    if report_id:
        report = db.query(models.CandidateEvaluationReport).filter(models.CandidateEvaluationReport.id == report_id).first()
    if not report and invitation and invitation.evaluation_report_id:
        report = db.query(models.CandidateEvaluationReport).filter(models.CandidateEvaluationReport.id == invitation.evaluation_report_id).first()
    if not invitation and report and report.assessment_invitation:
        invitation = report.assessment_invitation

    if not invitation and not report:
        raise HTTPException(status_code=404, detail="Assessment invitation or evaluation report not found.")

    now_time = datetime.datetime.now(datetime.timezone.utc) if is_onboarded else None
    if invitation:
        invitation.is_onboarded = is_onboarded
        invitation.onboarded_at = now_time
    if report:
        report.is_onboarded = is_onboarded
        report.onboarded_at = now_time
        report.onboarded_by_user_id = current_user.id if is_onboarded else None

    db.commit()
    return {
        "status": "success",
        "is_onboarded": is_onboarded,
        "invitation_id": invitation.id if invitation else None,
        "report_id": report.id if report else None,
        "candidate_name": report.candidate_name if report else (invitation.candidate_name if invitation else "")
    }


def _get_recruiter_for_report(
    report: models.CandidateEvaluationReport,
    users_dict: dict,
    default_recruiter: Optional[models.User] = None
) -> Optional[models.User]:
    """Helper to attribute a CandidateEvaluationReport to the responsible recruiter user."""
    # 1. From invitation's invited_by_user_id
    if report.assessment_invitation and report.assessment_invitation.invited_by_user_id:
        u = users_dict.get(report.assessment_invitation.invited_by_user_id)
        if u:
            return u

    # 2. From source material's creator user_id
    if report.assessment_generation and report.assessment_generation.source_material:
        sm_uid = report.assessment_generation.source_material.user_id
        if sm_uid and sm_uid in users_dict:
            return users_dict[sm_uid]

    # 3. From who onboarded the candidate
    if report.onboarded_by_user_id and report.onboarded_by_user_id in users_dict:
        return users_dict[report.onboarded_by_user_id]

    # 4. Fallback to default recruiter
    return default_recruiter


@app.get("/api/v1/admin/dashboard-stats")
def get_admin_dashboard_stats(
    month: Optional[str] = None,  # e.g. "2026-10" or "all"
    year: Optional[int] = 2026,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users_dict = {u.id: u for u in db.query(models.User).all()}
    default_recruiter = next((u for u in users_dict.values() if u.role == "recruiter" and u.is_active), None)

    target_year = year or datetime.datetime.now().year
    query = db.query(models.CandidateEvaluationReport)

    if month and month.lower() != "all" and "-" in month:
        try:
            parts = month.split("-")
            y = int(parts[0])
            m = int(parts[1])
            query = query.filter(
                extract("year", models.CandidateEvaluationReport.created_at) == y,
                extract("month", models.CandidateEvaluationReport.created_at) == m
            )
        except Exception:
            pass
    elif target_year:
        query = query.filter(extract("year", models.CandidateEvaluationReport.created_at) == target_year)

    reports = query.order_by(desc(models.CandidateEvaluationReport.created_at)).all()
    total_submissions = len(reports)
    total_onboards = sum(1 for r in reports if r.is_onboarded or (r.assessment_invitation and r.assessment_invitation.is_onboarded))

    recruiter_stats = {}
    for r in reports:
        r_user = _get_recruiter_for_report(r, users_dict, default_recruiter)
        r_id = r_user.id if r_user else 0
        r_name = (r_user.full_name or r_user.email) if r_user else "Team Recruiter"
        r_email = r_user.email if r_user else "recruiter@pamten.com"

        if r_id not in recruiter_stats:
            recruiter_stats[r_id] = {
                "user_id": r_id,
                "name": r_name,
                "email": r_email,
                "submissions": 0,
                "onboards": 0
            }
        recruiter_stats[r_id]["submissions"] += 1
        if r.is_onboarded or (r.assessment_invitation and r.assessment_invitation.is_onboarded):
            recruiter_stats[r_id]["onboards"] += 1

    top_recruiter = None
    if recruiter_stats:
        sorted_recruiters = sorted(
            recruiter_stats.values(),
            key=lambda x: (x["onboards"], x["submissions"]),
            reverse=True
        )
        top = sorted_recruiters[0]
        conv_rate = round((top["onboards"] / top["submissions"] * 100) if top["submissions"] > 0 else 0, 1)
        top_recruiter = {
            "name": top["name"],
            "email": top["email"],
            "submissions": top["submissions"],
            "submissions_count": top["submissions"],
            "onboards": top["onboards"],
            "onboards_count": top["onboards"],
            "conversion_rate": conv_rate
        }

    active_recruiters_count = db.query(models.User).filter(
        models.User.is_active == True,
        models.User.role.in_(["recruiter", "hr"])
    ).count()

    scores = [
        round((r.total_score / r.max_score * 100) if (r.max_score and r.max_score > 0) else 0, 1)
        for r in reports
    ]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    recent_activity = []
    for r in reports[:10]:
        ag = r.assessment_generation
        sm = ag.source_material if ag else None
        inv = r.assessment_invitation
        r_user = _get_recruiter_for_report(r, users_dict, default_recruiter)

        score_pct = round((r.total_score / r.max_score * 100) if (r.max_score and r.max_score > 0) else 0, 1)
        job_title = (sm.filename or sm.role_or_topic) if sm else "Assessment"
        is_onb = bool(r.is_onboarded or (inv and inv.is_onboarded))

        cand_name = r.candidate_name or (inv.candidate_name if inv else "Candidate")
        cand_email = (inv.candidate_email if inv else None) or (r.candidate_user.email if r.candidate_user else None) or ""

        recent_activity.append({
            "report_id": r.id,
            "invitation_id": inv.id if inv else None,
            "candidate_name": cand_name,
            "candidate_email": cand_email,
            "job_title": job_title,
            "recruiter_name": r_user.full_name or r_user.email if r_user else "Recruiter",
            "recruiter_email": r_user.email if r_user else "",
            "score": score_pct,
            "is_onboarded": is_onb,
            "submitted_at": r.created_at.isoformat() if r.created_at else None
        })

    return {
        "selected_month": month or f"{target_year}-All",
        "selected_year": target_year,
        "total_submissions": total_submissions,
        "total_onboards": total_onboards,
        "conversion_rate": round((total_onboards / total_submissions * 100) if total_submissions > 0 else 0, 1),
        "top_recruiter": top_recruiter,
        "active_recruiters_count": active_recruiters_count,
        "avg_assessment_score": avg_score,
        "recent_activity": recent_activity
    }


@app.get("/api/v1/admin/recruiters-list")
def get_admin_recruiters_list(
    month: Optional[str] = None,
    year: Optional[int] = 2026,
    role: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_query = db.query(models.User).filter(
        models.User.is_active == True,
        models.User.role != "admin"
    )

    # Scoped permissions:
    # - Admin: Can filter by account_manager, hr, recruiter (or all)
    # - Account Manager: Can filter by hr, recruiter (or all permitted: hr, recruiter)
    # - HR: Can view recruiter
    user_role = (current_user.role or "recruiter").lower()
    selected_role = (role or "all").lower()

    if user_role == "account_manager":
        if selected_role in ["hr", "recruiter"]:
            user_query = user_query.filter(models.User.role == selected_role)
        else:
            user_query = user_query.filter(models.User.role.in_(["hr", "recruiter"]))
    elif user_role == "hr":
        user_query = user_query.filter(models.User.role == "recruiter")
    elif user_role == "admin":
        if selected_role != "all":
            user_query = user_query.filter(models.User.role == selected_role)
    else:
        user_query = user_query.filter(models.User.id == current_user.id)

    users = user_query.order_by(models.User.id.asc()).all()
    users_dict = {u.id: u for u in db.query(models.User).all()}
    default_recruiter = next((u for u in users_dict.values() if u.role == "recruiter" and u.is_active), None)

    all_reports = db.query(models.CandidateEvaluationReport).all()

    target_year = year or datetime.datetime.now().year
    target_month_num = None
    if month and month.lower() != "all" and "-" in month:
        try:
            target_month_num = int(month.split("-")[1])
        except Exception:
            pass

    recruiters_data = []
    for u in users:
        u_reports = []
        for r in all_reports:
            r_user = _get_recruiter_for_report(r, users_dict, default_recruiter)
            if r_user and r_user.id == u.id:
                u_reports.append(r)

        yearly_reports = [
            r for r in u_reports
            if r.created_at and r.created_at.year == target_year
        ]
        yearly_submissions = len(yearly_reports)
        yearly_onboards = sum(1 for r in yearly_reports if r.is_onboarded or (r.assessment_invitation and r.assessment_invitation.is_onboarded))

        if target_month_num:
            monthly_reports = [
                r for r in yearly_reports
                if r.created_at and r.created_at.month == target_month_num
            ]
        else:
            monthly_reports = yearly_reports

        monthly_submissions = len(monthly_reports)
        monthly_onboards = sum(1 for r in monthly_reports if r.is_onboarded or (r.assessment_invitation and r.assessment_invitation.is_onboarded))

        scores = [
            round(r.total_score / r.max_score * 100, 1)
            for r in yearly_reports
            if r.max_score and r.max_score > 0
        ]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
        conversion_rate = round((yearly_onboards / yearly_submissions * 100) if yearly_submissions > 0 else 0, 1)

        recruiters_data.append({
            "id": u.id,
            "full_name": u.full_name or u.email.split("@")[0],
            "email": u.email,
            "organization_name": u.organization_name or "",
            "role": u.role or "recruiter",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "monthly_submissions": monthly_submissions,
            "monthly_onboards": monthly_onboards,
            "yearly_submissions": yearly_submissions,
            "yearly_onboards": yearly_onboards,
            "avg_score": avg_score,
            "conversion_rate": conversion_rate
        })

    return {
        "selected_month": month or f"{target_year}-All",
        "selected_year": target_year,
        "selected_role": selected_role,
        "recruiters": recruiters_data
    }


@app.get("/api/v1/admin/yearly-performance")
def get_yearly_performance(
    year: Optional[int] = 2026,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_year = year or datetime.datetime.now().year
    reports = db.query(models.CandidateEvaluationReport).filter(
        extract("year", models.CandidateEvaluationReport.created_at) == target_year
    ).all()

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    users_dict = {u.id: u for u in db.query(models.User).all()}
    default_recruiter = next((u for u in users_dict.values() if u.role == "recruiter" and u.is_active), None)

    monthly_stats = []
    total_yearly_subs = len(reports)
    total_yearly_onboards = sum(1 for r in reports if r.is_onboarded or (r.assessment_invitation and r.assessment_invitation.is_onboarded))

    for m_idx in range(1, 13):
        m_reports = [r for r in reports if r.created_at and r.created_at.month == m_idx]
        m_subs = len(m_reports)
        m_onb = sum(1 for r in m_reports if r.is_onboarded or (r.assessment_invitation and r.assessment_invitation.is_onboarded))
        conv = round((m_onb / m_subs * 100) if m_subs > 0 else 0, 1)

        top_name = "--"
        if m_reports:
            r_counts = {}
            for r in m_reports:
                r_user = _get_recruiter_for_report(r, users_dict, default_recruiter)
                uid = r_user.id if r_user else 0
                r_counts[uid] = r_counts.get(uid, 0) + 1
            best_uid = max(r_counts, key=r_counts.get)
            best_u = users_dict.get(best_uid)
            if best_u:
                top_name = best_u.full_name or best_u.email

        monthly_stats.append({
            "month_num": m_idx,
            "month_name": month_names[m_idx - 1],
            "month_key": f"{target_year}-{m_idx:02d}",
            "submissions": m_subs,
            "onboards": m_onb,
            "conversion_rate": conv,
            "top_recruiter_name": top_name
        })

    return {
        "year": target_year,
        "total_submissions": total_yearly_subs,
        "total_onboards": total_yearly_onboards,
        "yearly_conversion_rate": round((total_yearly_onboards / total_yearly_subs * 100) if total_yearly_subs > 0 else 0, 1),
        "months": monthly_stats
    }


@app.get("/api/v1/admin/export-yearly-performance")
def export_yearly_performance(
    year: Optional[int] = 2026,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_year = year or datetime.datetime.now().year
    users = db.query(models.User).filter(
        models.User.is_active == True,
        models.User.role != "admin"
    ).all()
    users_dict = {u.id: u for u in db.query(models.User).all()}
    default_recruiter = next((u for u in users_dict.values() if u.role == "recruiter" and u.is_active), None)

    reports = db.query(models.CandidateEvaluationReport).filter(
        extract("year", models.CandidateEvaluationReport.created_at) == target_year
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Year", "Recruiter Name", "Recruiter Email", "Organization", "Role",
        "Total Submissions", "Total Onboards", "Conversion Rate (%)", "Avg Candidate Score (%)"
    ])

    for u in users:
        u_reports = []
        for r in reports:
            r_user = _get_recruiter_for_report(r, users_dict, default_recruiter)
            if r_user and r_user.id == u.id:
                u_reports.append(r)

        subs = len(u_reports)
        onb = sum(1 for r in u_reports if r.is_onboarded or (r.assessment_invitation and r.assessment_invitation.is_onboarded))
        conv = round((onb / subs * 100) if subs > 0 else 0, 1)
        scores = [round(r.total_score / r.max_score * 100, 1) for r in u_reports if r.max_score and r.max_score > 0]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        writer.writerow([
            target_year,
            u.full_name or "Team Member",
            u.email,
            u.organization_name or "—",
            (u.role or "recruiter").replace("_", " ").title(),
            subs,
            onb,
            f"{conv}%",
            f"{avg_score}%"
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=yearly_performance_{target_year}.csv"}
    )
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    """A recruiter/employer account. Owns the source materials, resumes,
    and assessments they create - login scopes each recruiter to their
    own data only."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    organization_name = Column(String, nullable=True)
    role = Column(String, default="recruiter", nullable=False)  # "recruiter", "hr", "account_manager", "admin"
    must_reset_password = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source_materials = relationship("JDUpload", back_populates="owner")
    notifications = relationship("RecruiterNotification", back_populates="user", cascade="all, delete-orphan", order_by="desc(RecruiterNotification.created_at)")
    skill_matrices = relationship("SkillMatrix", back_populates="user", cascade="all, delete-orphan", order_by="desc(SkillMatrix.updated_at)")

    @property
    def jd_uploads(self):
        return self.source_materials


class JDUpload(Base):
    """A job description (JD), role topic, or training material that
    candidate resumes are matched against and assessments get generated from."""
    __tablename__ = "jd_uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for pre-auth rows
    organization_name = Column(String, nullable=True)
    filename = Column(String, nullable=True)         # null if role/skill text was used instead
    role_or_topic = Column(Text, nullable=True)       # null if a file was uploaded instead
    extracted_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="source_materials")
    assessment_generations = relationship("AssessmentGeneration", back_populates="source_material")
    candidate_resumes = relationship("CandidateResume", back_populates="source_material")


# Backward compatibility alias
SourceMaterial = JDUpload


class CandidateResume(Base):
    """A candidate's resume, uploaded or pasted, linked to the JD upload
    it will be matched against."""
    __tablename__ = "candidate_resumes"

    id = Column(Integer, primary_key=True, index=True)
    source_material_id = Column(Integer, ForeignKey("jd_uploads.id"), nullable=False)
    candidate_name = Column(String, nullable=True)
    candidate_email = Column(String, nullable=True)
    filename = Column(String, nullable=True)
    resume_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source_material = relationship("JDUpload", back_populates="candidate_resumes")

    @property
    def jd_upload(self):
        return self.source_material

    job_match_results = relationship("JobMatchResult", back_populates="candidate_resume")
    assessment_invitations = relationship("AssessmentInvitation", back_populates="candidate_resume")


class JobMatchResult(Base):
    """AI-generated comparison of a candidate's resume against a JD
    upload - matched skills, gaps, and an overall match score.
    Distinct from CandidateEvaluationReport.job_knowledge_match, which is
    derived from actual assessment answers after the fact; this is a
    pre-assessment screening signal based on resume text alone."""
    __tablename__ = "job_match_results"

    id = Column(Integer, primary_key=True, index=True)
    source_material_id = Column(Integer, ForeignKey("jd_uploads.id"), nullable=False)
    candidate_resume_id = Column(Integer, ForeignKey("candidate_resumes.id"), nullable=False)
    match_score = Column(Float, nullable=False)          # 0-100
    matched_skills = Column(JSON, nullable=False)          # list[str]
    skill_gaps = Column(JSON, nullable=False)              # list[str]
    seniority_assessment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate_resume = relationship("CandidateResume", back_populates="job_match_results")


class AssessmentGeneration(Base):
    """One generated set of assessment questions, tied to the JD
    upload and generation config used to produce it."""
    __tablename__ = "assessment_generations"

    id = Column(Integer, primary_key=True, index=True)
    source_material_id = Column(Integer, ForeignKey("jd_uploads.id"), nullable=False)
    num_questions = Column(Integer, nullable=False)
    difficulty = Column(String, nullable=False)
    question_type = Column(String, nullable=False)
    questions = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source_material = relationship("JDUpload", back_populates="assessment_generations")

    @property
    def jd_upload(self):
        return self.source_material
    evaluation_reports = relationship("CandidateEvaluationReport", back_populates="assessment_generation")
    assessment_invitations = relationship("AssessmentInvitation", back_populates="assessment_generation")


class CandidateEvaluationReport(Base):
    """A completed assessment attempt by a specific candidate/employee,
    with their answers, AI-scored evaluations, and total score."""
    __tablename__ = "candidate_evaluation_reports"

    id = Column(Integer, primary_key=True, index=True)
    assessment_generation_id = Column(Integer, ForeignKey("assessment_generations.id"), nullable=False)
    candidate_name = Column(String, nullable=True)
    candidate_answers = Column(JSON, nullable=False)   # {questionIndex: answerText}
    evaluations = Column(JSON, nullable=False)          # {questionIndex: {overall_score, feedback, ...}}
    total_score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)

    # Aggregate scores computed from the per-question evaluations
    job_knowledge_match = Column(Float, nullable=True)   # avg "accuracy" across subjective questions, as %
    communication_score = Column(Float, nullable=True)   # avg "clarity_and_grammar" across subjective questions, as %

    # Employer eligibility check - MANUALLY entered and self-attested by
    # the recruiter (there is no automated LinkedIn verification here -
    # LinkedIn's API requires partner approval we don't have, and scraping
    # violates their ToS). previous_employers is a JSON list of objects:
    # [{"company_name": str, "employee_count": int, "linkedin_verified": bool}, ...]
    previous_employers = Column(JSON, nullable=True)
    meets_employer_criteria = Column(String, nullable=True)  # "yes" | "unverified" | "no" | null
    is_onboarded = Column(Boolean, default=False)
    onboarded_at = Column(DateTime(timezone=True), nullable=True)
    onboarded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assessment_generation = relationship("AssessmentGeneration", back_populates="evaluation_reports")
    assessment_invitation = relationship("AssessmentInvitation", back_populates="evaluation_report", uselist=False)
    onboarded_by = relationship("User", foreign_keys=[onboarded_by_user_id])
    candidate_user = relationship("User", foreign_keys=[candidate_user_id])


class AssessmentInvitation(Base):
    """An invitation sent to a specific candidate email with a unique link/token
    allowing them to complete and submit an assessment."""
    __tablename__ = "assessment_invitations"

    id = Column(Integer, primary_key=True, index=True)
    assessment_generation_id = Column(Integer, ForeignKey("assessment_generations.id"), nullable=False)
    candidate_resume_id = Column(Integer, ForeignKey("candidate_resumes.id"), nullable=True)
    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, nullable=False)
    invitation_token = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="pending")  # "pending", "submitted"
    email_sent = Column(Boolean, default=False)
    email_delivery_status = Column(String, nullable=True)  # "sent", "failed", "smtp_not_configured"
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    evaluation_report_id = Column(Integer, ForeignKey("candidate_evaluation_reports.id"), nullable=True)
    duration_minutes = Column(Integer, default=15)
    invited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    candidate_temp_password = Column(String, nullable=True)
    is_onboarded = Column(Boolean, default=False)
    onboarded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    assessment_generation = relationship("AssessmentGeneration", back_populates="assessment_invitations")
    candidate_resume = relationship("CandidateResume", back_populates="assessment_invitations")
    evaluation_report = relationship("CandidateEvaluationReport", back_populates="assessment_invitation")
    invited_by = relationship("User", foreign_keys=[invited_by_user_id])
    candidate_user = relationship("User", foreign_keys=[candidate_user_id])


class RecruiterNotification(Base):
    """An in-app notification for recruiters (e.g. when a candidate completes an assessment)."""
    __tablename__ = "recruiter_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invitation_id = Column(Integer, ForeignKey("assessment_invitations.id"), nullable=True)
    report_id = Column(Integer, ForeignKey("candidate_evaluation_reports.id"), nullable=True)
    type = Column(String, default="assessment_submitted")
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    candidate_name = Column(String, nullable=True)
    candidate_email = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    score_percentage = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
    invitation = relationship("AssessmentInvitation")
    evaluation_report = relationship("CandidateEvaluationReport")


class SkillMatrix(Base):
    """Recruiter-defined evaluation dimensions and skills matrix.
    Can be tied to a recruiter user_id, and optionally to a specific source JD."""
    __tablename__ = "skill_matrices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    source_material_id = Column(Integer, ForeignKey("jd_uploads.id"), nullable=True)
    role_title = Column(String, nullable=True)
    dimensions = Column(JSON, nullable=False)  # List of dimension objects, each containing its skills
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="skill_matrices")
    source_material = relationship("JDUpload")


class RoleTemplate(Base):
    """A role template defining evaluation dimensions, skills, and desired scores.
    Can be created/customized by recruiters or provided as system presets."""
    __tablename__ = "role_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null for system presets
    template_key = Column(String, unique=True, index=True, nullable=True)
    role_title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    dimensions = Column(JSON, nullable=False)  # List of dimensions with skills and desired scores
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")



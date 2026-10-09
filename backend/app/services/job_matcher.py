from pydantic import BaseModel, Field
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os

load_dotenv()

class JobMatchSchema(BaseModel):
    match_score: float = Field(description="Overall match score from 0 to 100, weighing required skills most heavily, preferred skills and experience/seniority alignment secondarily")
    matched_skills: List[str] = Field(description="Skills/requirements from the job description that the candidate's resume clearly demonstrates")
    skill_gaps: List[str] = Field(description="Skills/requirements from the job description that the candidate's resume does not demonstrate")
    seniority_assessment: str = Field(description="One or two sentences on how well the candidate's experience level matches the role's seniority requirements")

class JobMatchingService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Sign up free at https://console.groq.com "
                "(no credit card required) and add GROQ_API_KEY=... to your .env file."
            )

        self.llm = ChatOpenAI(
            model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            temperature=0.0,
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        ).with_structured_output(JobMatchSchema)

    def match(self, job_description: str, resume_text: str) -> JobMatchSchema:
        system_prompt = (
            "You are an experienced technical recruiter. Compare a candidate's "
            "resume against a job description and assess fit. Be evidence-based: "
            "only count a skill as matched if the resume text actually supports "
            "it, don't assume skills the candidate didn't mention. Be fair and "
            "consistent, as you would when screening a real candidate."
        )

        user_prompt = f"""
        Job Description:
        {job_description[:8000]}

        Candidate Resume:
        {resume_text[:8000]}

        Compare the resume against the job description's required and preferred
        skills and experience level. Identify matched_skills (clearly
        demonstrated in the resume) and skill_gaps (required/preferred by the
        role but not evidenced in the resume). Give an overall match_score
        (0-100) and a brief seniority_assessment.
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_prompt)
        ])

        chain = prompt | self.llm
        return chain.invoke({})

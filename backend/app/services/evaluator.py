from pydantic import BaseModel, Field
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os

# Load .env as early as possible, regardless of whether main.py already did.
load_dotenv()

class EvaluationRubric(BaseModel):
    accuracy: float = Field(description="Score from 0 to 10 on factual/technical correctness")
    completeness: float = Field(description="Score from 0 to 10 on coverage of key points expected in a strong answer")
    relevance: float = Field(description="Score from 0 to 10 on addressing the prompt directly")
    clarity_and_grammar: float = Field(description="Score from 0 to 10 on communication quality")
    overall_score: float = Field(description="Final calculated score scaled to max allocated points")
    feedback: str = Field(description="Constructive explanation of the score, written as hiring/assessment feedback")
    missing_concepts: List[str] = Field(description="Key concepts or points the candidate omitted")
    improvement_suggestions: List[str] = Field(description="Actionable points for the candidate to improve")

class EvaluationEngine:
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
        ).with_structured_output(EvaluationRubric)

    def evaluate_subjective(self, question: str, reference_answer: str, user_answer: str, max_marks: int) -> EvaluationRubric:
        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are an experienced technical recruiter and hiring assessor. "
             "Evaluate the candidate's response against the reference answer as "
             "you would when scoring a real job assessment or training "
             "evaluation - fair, consistent, and focused on job-relevant "
             "competence rather than academic phrasing."),
            ("user", f"""
            Question: {question}
            Reference Answer: {reference_answer}
            Candidate's Answer: {user_answer}
            Maximum Points: {max_marks}

            Evaluate the candidate's answer across accuracy, completeness, relevance, and clarity.
            Calculate overall_score proportional to Maximum Points ({max_marks}).
            """)
        ])

        chain = prompt | self.llm
        return chain.invoke({})

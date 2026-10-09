from pydantic import BaseModel, Field
from typing import List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os

load_dotenv()

class GeneratedQuestion(BaseModel):
    question_type: str = Field(description="MCQ, True_False, Fill_In_Blank, Short_Answer, Long_Answer, or Scenario")
    question_text: str = Field(description="The question prompt")
    options: Optional[List[str]] = Field(default=[], description="Options if MCQ, otherwise empty")
    correct_answer: str = Field(description="The exact answer or reference model answer")
    explanation: str = Field(description="Detailed explanation of the answer")
    difficulty: str = Field(description="Entry-Level, Mid-Level, or Senior-Level")
    competency: str = Field(description="The competency this question assesses: Technical Knowledge, Problem Solving, Communication, Leadership, or Culture Fit")
    topic: str = Field(description="Specific skill area or role requirement being assessed")
    estimated_time_seconds: int = Field(description="Recommended duration to answer")
    points: int = Field(description="Points allocated to this question")
    confidence_score: float = Field(description="AI confidence score between 0.0 and 1.0")

class QuestionSetSchema(BaseModel):
    title: str
    questions: List[GeneratedQuestion]

class QuestionGeneratorService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Sign up free at https://console.groq.com "
                "(no credit card required) and add GROQ_API_KEY=... to your .env file."
            )

        self.llm = ChatOpenAI(
            model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            temperature=float(os.getenv("GENERATOR_TEMPERATURE", "0.9")),
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        ).with_structured_output(QuestionSetSchema)

    def generate(self, content: str, num_questions: int, difficulty: str, q_type: str, language: str = "English") -> QuestionSetSchema:
        import random
        variation_seed = random.randint(1, 1_000_000)

        system_prompt = (
            "You are an expert technical recruiter and hiring assessment designer. "
            "You create assessments used to evaluate job candidates during hiring, "
            "or employees during training and onboarding. Generate high-quality "
            "questions strictly adhering to the specified role, skill area, or "
            "training material provided as context. Never generate facts outside "
            "the context. Favor questions that reveal real job-relevant competence "
            "(technical accuracy, problem-solving approach, communication clarity) "
            "over trivia. "
            "IMPORTANT: at least one question in every set must have competency "
            "set to 'Communication' and must specifically require the candidate to "
            "explain, describe, or summarize something clearly in their own words "
            "(e.g. 'Explain X to a non-technical stakeholder' or 'Describe how you "
            "would communicate Y to your team') - this is a mandatory requirement, "
            "not optional, regardless of question_type distribution requested. "
            "Each time you are called, vary your selection of sub-topics, angles, and "
            "specific facts as much as the context allows - avoid defaulting to only the "
            "most commonly cited or obvious facts every time."
        )

        user_prompt = f"""
        Role / Skill Area / Training Material:
        {content[:12000]}

        Requirements:
        - Number of questions: {num_questions}
        - Primary Difficulty Level: {difficulty}
        - Question Types Allowed: {q_type}
        - Language: {language}
        - Variation seed (ignore the number itself, just use it to pick a fresh angle
          and avoid repeating the same questions as previous generations): {variation_seed}
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", user_prompt)
        ])

        chain = prompt | self.llm
        return chain.invoke({})

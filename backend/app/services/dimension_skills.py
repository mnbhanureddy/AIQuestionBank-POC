from typing import List, Optional, Dict, Any
import os
import json
import uuid
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


class SkillItem(BaseModel):
    id: str = Field(default_factory=lambda: f"skill-{uuid.uuid4().hex[:8]}")
    name: str = Field(description="Skill or competency name, e.g. Python, REST APIs, System Design")
    proficiency: str = Field(default="Intermediate", description="Beginner, Intermediate, Advanced, or Expert")
    importance: str = Field(default="High", description="Critical, High, Medium, or Nice-to-Have")
    question_type: str = Field(default="MCQ", description="MCQ, Short_Answer, Scenario, or Coding")
    benchmark_score: int = Field(default=70, description="Minimum benchmark passing percentage (0-100)")
    desired_score: int = Field(default=75, description="Desired score / target benchmark percentage (0-100)")
    weight: int = Field(default=25, description="Relative weight within the dimension (1-100)")
    description: str = Field(default="", description="Brief focus area or evaluation criteria")


class DimensionItem(BaseModel):
    id: str = Field(default_factory=lambda: f"dim-{uuid.uuid4().hex[:8]}")
    name: str = Field(description="Dimension category name, e.g. Core Technical Skills, System Architecture")
    description: str = Field(default="", description="Goal and scope of this evaluation dimension")
    weight: int = Field(default=25, description="Overall percentage weight in assessment (sum of all dimensions should be 100)")
    desired_score: int = Field(default=75, description="Desired / Target score percentage for this dimension (0-100)")
    color: str = Field(default="#2563eb", description="Hex color accent code for UI badges")
    skills: List[SkillItem] = Field(default_factory=list, description="List of skills under this dimension")


class SkillMatrixSchema(BaseModel):
    role_title: str = Field(description="Target role or profile title")
    dimensions: List[DimensionItem] = Field(description="Evaluation dimensions and associated skills")


# Predefined Industry Standard Templates spanning Junior to Management Levels
DEFAULT_ROLE_TEMPLATES: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------
    # 1. JUNIOR / ASSOCIATE SOFTWARE ENGINEER
    # -------------------------------------------------------------
    "junior_swe": {
        "id": "junior_swe",
        "role_title": "Junior / Associate Software Engineer",
        "description": "Entry-level engineering evaluation covering foundational programming, data structures, Git collaboration, problem-solving, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-jswe-1",
                "name": "Foundational Programming & Data Structures",
                "description": "Core language syntax, memory basics, fundamental data structures, and algorithmic complexity.",
                "weight": 35,
                "desired_score": 70,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-jswe-101",
                        "name": "Data Structures & Big-O Fundamentals",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 65,
                        "desired_score": 75,
                        "weight": 40,
                        "description": "Arrays, hash maps, linked lists, stacks/queues, and time/space complexity analysis."
                    },
                    {
                        "id": "skill-jswe-102",
                        "name": "Core Language Syntax & OOP Principles",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 35,
                        "description": "Variables, scoping, classes/interfaces, error handling, and standard library usage."
                    },
                    {
                        "id": "skill-jswe-103",
                        "name": "Applied Code Debugging & Logic",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 25,
                        "description": "Reading stack traces, isolating edge cases, and validating corner inputs."
                    }
                ]
            },
            {
                "id": "dim-jswe-2",
                "name": "Version Control & Development Practices",
                "description": "Git workflows, branch hygiene, unit testing basics, and CI/CD awareness.",
                "weight": 25,
                "desired_score": 70,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-jswe-201",
                        "name": "Git Branching & Pull Request Workflows",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Git commit conventions, branching, resolving merge conflicts, and PR descriptions."
                    },
                    {
                        "id": "skill-jswe-202",
                        "name": "Unit Testing & Test Coverage Basics",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "Writing test assertions, running test runners (Jest, PyTest), and edge case testing."
                    }
                ]
            },
            {
                "id": "dim-jswe-3",
                "name": "System Fundamentals & Web/DB Basics",
                "description": "Client-server communication, HTTP protocols, and basic relational queries.",
                "weight": 20,
                "desired_score": 65,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-jswe-301",
                        "name": "SQL & Relational Queries",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "SELECT, WHERE, JOINs, GROUP BY, and basic table schema relationships."
                    },
                    {
                        "id": "skill-jswe-302",
                        "name": "HTTP Protocols & REST Concepts",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "HTTP request methods (GET, POST), headers, response codes, and JSON serialization."
                    }
                ]
            },
            {
                "id": "dim-jswe-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Technical articulation, asking clarifying questions, constructive PR discussions, and teamwork.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-jswe-401",
                        "name": "Technical Articulation & Inquiry",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Formulating clear questions when blocked and summarizing technical progress succinctly."
                    },
                    {
                        "id": "skill-jswe-402",
                        "name": "Team Collaboration & Feedback Reception",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Receiving code review feedback constructively and participating in sprint standups."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 2. JUNIOR QA & TEST AUTOMATION ENGINEER
    # -------------------------------------------------------------
    "junior_qa": {
        "id": "junior_qa",
        "role_title": "Junior QA & Test Automation Engineer",
        "description": "Quality assurance assessment focusing on test case design, defect tracking, automation fundamentals, and cross-team communication.",
        "dimensions": [
            {
                "id": "dim-jqa-1",
                "name": "Manual Testing & Test Case Design",
                "description": "Requirement analysis, test case creation, boundary value analysis, and exploratory testing.",
                "weight": 35,
                "desired_score": 75,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-jqa-101",
                        "name": "Test Case Authoring & Equivalence Partitioning",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Writing clear preconditions, steps, expected results, and positive/negative test sets."
                    },
                    {
                        "id": "skill-jqa-102",
                        "name": "Exploratory & Regression Testing Strategies",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Validating critical user journeys, smoke testing builds, and regression execution."
                    }
                ]
            },
            {
                "id": "dim-jqa-2",
                "name": "Automation Fundamentals & Scripting",
                "description": "Basic UI/API test scripting, locator strategies, and automation tool concepts.",
                "weight": 25,
                "desired_score": 70,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-jqa-201",
                        "name": "Web & API Automation Basics (Playwright/Postman)",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "DOM selector identification (CSS, XPath), API request validations, and assertion writing."
                    },
                    {
                        "id": "skill-jqa-202",
                        "name": "Test Execution & Reporting",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "Running test scripts, interpreting failure traces, and generating test run reports."
                    }
                ]
            },
            {
                "id": "dim-jqa-3",
                "name": "Defect Tracking & SDLC Quality Gates",
                "description": "Bug lifecycle, reproduction steps, severity vs. priority, and agile QA workflows.",
                "weight": 20,
                "desired_score": 70,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-jqa-301",
                        "name": "Defect Reporting & Triage (Jira/Bugzilla)",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Documenting reproducible steps, environment details, logs, screenshots, and impact analysis."
                    },
                    {
                        "id": "skill-jqa-302",
                        "name": "Agile QA Workflows & Acceptance Criteria",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "Reviewing user story acceptance criteria (Given-When-Then) and verifying Definition of Done."
                    }
                ]
            },
            {
                "id": "dim-jqa-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Articulating defect impact, collaborating with developers, and documentation clarity.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-jqa-401",
                        "name": "Cross-Functional Defect Communication",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Discussing root causes and bug severity with developers diplomatically and constructively."
                    },
                    {
                        "id": "skill-jqa-402",
                        "name": "Test Plan Documentation & Release Notes",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Authoring concise test summary reports, sign-off notes, and known issue matrices."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 3. JUNIOR DATA ANALYST / ASSOCIATE SCIENTIST
    # -------------------------------------------------------------
    "junior_data": {
        "id": "junior_data",
        "role_title": "Junior Data Analyst / Associate Scientist",
        "description": "Foundational data role evaluation covering SQL, exploratory data analysis, business dashboarding, and technical communication.",
        "dimensions": [
            {
                "id": "dim-jda-1",
                "name": "SQL & Relational Data Extraction",
                "description": "Querying relational data, aggregations, windowing basics, and joins.",
                "weight": 35,
                "desired_score": 75,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-jda-101",
                        "name": "Complex Joins, Aggregations & Grouping",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "INNER/LEFT/FULL OUTER joins, GROUP BY, HAVING, and multi-condition filtering."
                    },
                    {
                        "id": "skill-jda-102",
                        "name": "Subqueries & Basic Window Functions",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "CTEs, nested subqueries, ROW_NUMBER(), and running totals."
                    }
                ]
            },
            {
                "id": "dim-jda-2",
                "name": "Data Wrangling & Analysis (Python/Pandas)",
                "description": "Data manipulation, missing value treatment, and descriptive statistics.",
                "weight": 25,
                "desired_score": 70,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-jda-201",
                        "name": "Pandas Data Cleaning & Transformation",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Handling missing data, deduplication, date-time parsing, and pivoting."
                    },
                    {
                        "id": "skill-jda-202",
                        "name": "Exploratory Data Analysis & Statistics",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "Mean, median, variance, distributions, correlation vs. causation, and outlier detection."
                    }
                ]
            },
            {
                "id": "dim-jda-3",
                "name": "Data Visualization & Business Reporting",
                "description": "Translating data into visual charts, dashboards, and key business KPIs.",
                "weight": 20,
                "desired_score": 70,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-jda-301",
                        "name": "Dashboarding & Visual Hierarchy (Tableau/PowerBI)",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "Selecting appropriate chart types (bar, line, scatter) and designing intuitive drill-downs."
                    },
                    {
                        "id": "skill-jda-302",
                        "name": "KPI Formulation & Metric Tracking",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "Defining business retention, conversion rates, ARPU, and cohort metrics."
                    }
                ]
            },
            {
                "id": "dim-jda-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Communicating findings clearly to stakeholders and collaborating with business teams.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-jda-401",
                        "name": "Data Storytelling & Insight Summarization",
                        "proficiency": "Intermediate",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Translating complex query outcomes into actionable recommendations for non-technical managers."
                    },
                    {
                        "id": "skill-jda-402",
                        "name": "Cross-Functional Requirements Gathering",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Asking business users the right questions to clarify analytical scope and deliverable targets."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 4. FULL-STACK SOFTWARE ENGINEER (System Architecture & Comm Split)
    # -------------------------------------------------------------
    "fullstack": {
        "id": "fullstack",
        "role_title": "Full-Stack Software Engineer",
        "description": "Comprehensive full-stack evaluation covering backend, frontend, database architecture, system design, and mandatory professional communication.",
        "dimensions": [
            {
                "id": "dim-fs-1",
                "name": "Backend & API Development",
                "description": "Server-side architecture, REST/GraphQL APIs, business logic implementation, and async workflows.",
                "weight": 25,
                "desired_score": 75,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-fs-101",
                        "name": "RESTful API Design & Best Practices",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 35,
                        "description": "HTTP status codes, idempotency, versioning, serialization, and error handling."
                    },
                    {
                        "id": "skill-fs-102",
                        "name": "Server-side Frameworks (FastAPI/Node/Django)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 35,
                        "description": "Routing, middleware, authentication flows, and ORM usage."
                    },
                    {
                        "id": "skill-fs-103",
                        "name": "Asynchronous Programming & Concurrency",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 30,
                        "description": "Async/await patterns, thread pools, race condition avoidance, and event loops."
                    }
                ]
            },
            {
                "id": "dim-fs-2",
                "name": "Frontend & User Interface",
                "description": "Client-side development, modern framework mastery, state management, and responsive UX.",
                "weight": 25,
                "desired_score": 75,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-fs-201",
                        "name": "Modern React & Component Lifecycle",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 40,
                        "description": "Hooks (useState, useEffect, useMemo), render cycles, and custom reusable hooks."
                    },
                    {
                        "id": "skill-fs-202",
                        "name": "TypeScript & Type Safety",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 30,
                        "description": "Interfaces, generics, union types, and type guards."
                    },
                    {
                        "id": "skill-fs-203",
                        "name": "CSS / Responsive Layouts & Accessibility",
                        "proficiency": "Intermediate",
                        "importance": "Medium",
                        "question_type": "MCQ",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 30,
                        "description": "Flexbox, Grid, semantic HTML5, and WCAG accessibility guidelines."
                    }
                ]
            },
            {
                "id": "dim-fs-3",
                "name": "Database & Data Persistence",
                "description": "Relational and NoSQL schemas, query optimization, indexing, and transactional integrity.",
                "weight": 20,
                "desired_score": 75,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-fs-301",
                        "name": "SQL & Relational Schema Modeling",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Foreign keys, constraints, normalization, and complex multi-table joins."
                    },
                    {
                        "id": "skill-fs-302",
                        "name": "Database Indexing & Query Tuning",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "B-Tree indexes, EXPLAIN plan interpretation, and query execution bottlenecks."
                    }
                ]
            },
            {
                "id": "dim-fs-4",
                "name": "System Architecture & Scalability",
                "description": "Scalability, microservices principles, caching layers, and high-availability design.",
                "weight": 15,
                "desired_score": 75,
                "color": "#d97706",
                "skills": [
                    {
                        "id": "skill-fs-401",
                        "name": "System Design & Microservices Principles",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Distributed services, load balancing, stateless architectures, and failover mechanics."
                    },
                    {
                        "id": "skill-fs-402",
                        "name": "Caching & High Throughput (Redis/CDN)",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Cache-aside patterns, invalidation strategies, Redis key structures, and CDN edge caching."
                    }
                ]
            },
            {
                "id": "dim-fs-5",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Technical articulation, documentation clarity, cross-functional collaboration, and code review culture.",
                "weight": 15,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-fs-501",
                        "name": "Technical Articulation & Stakeholder Explanation",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Explaining complex architectural decisions, trade-offs, and progress clearly to non-engineers."
                    },
                    {
                        "id": "skill-fs-502",
                        "name": "Cross-Functional Collaboration & Code Review Culture",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Conducting constructive PR reviews, documenting technical specs, and collaborating with product teams."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 5. BACKEND SYSTEMS ENGINEER
    # -------------------------------------------------------------
    "backend": {
        "id": "backend",
        "role_title": "Backend Systems Engineer",
        "description": "Focus on high-throughput backend services, database internals, concurrency, distributed systems, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-be-1",
                "name": "Core Language & Concurrency",
                "description": "Deep understanding of language runtimes, memory management, and asynchronous I/O.",
                "weight": 30,
                "desired_score": 80,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-be-101",
                        "name": "Python / Java / Go In-Depth Internals",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 40,
                        "description": "Garbage collection, memory allocation, GIL/threading, and standard libraries."
                    },
                    {
                        "id": "skill-be-102",
                        "name": "Multithreading & Distributed Locks",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 35,
                        "description": "Deadlock prevention, atomic primitives, mutexes, and Redis distributed locks."
                    },
                    {
                        "id": "skill-be-103",
                        "name": "Unit & Integration Testing (PyTest/JUnit)",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 25,
                        "description": "Mocking, test fixtures, test coverage metrics, and integration test suites."
                    }
                ]
            },
            {
                "id": "dim-be-2",
                "name": "Data Architecture & Storage",
                "description": "Relational query optimization, caching strategies, and distributed storage engines.",
                "weight": 25,
                "desired_score": 75,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-be-201",
                        "name": "PostgreSQL / MySQL Deep Optimization",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "ACID compliance, isolation levels, write-ahead logging, and query planning."
                    },
                    {
                        "id": "skill-be-202",
                        "name": "Distributed Caching (Redis / Memcached)",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Cache invalidation strategies, TTL policies, cache-aside, and thundering herd."
                    }
                ]
            },
            {
                "id": "dim-be-3",
                "name": "Distributed Systems & Reliability",
                "description": "Microservices communication, fault tolerance, message queuing, and monitoring.",
                "weight": 25,
                "desired_score": 75,
                "color": "#dc2626",
                "skills": [
                    {
                        "id": "skill-be-301",
                        "name": "Message Queues & Event Streaming (Kafka/RabbitMQ)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 40,
                        "description": "Publish/subscribe, consumer groups, partition keys, and idempotent consumer handlers."
                    },
                    {
                        "id": "skill-be-302",
                        "name": "API Security & Authentication (JWT/OAuth2)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 35,
                        "description": "Token signature verification, scopes, role-based access control, and rate limiting."
                    },
                    {
                        "id": "skill-be-303",
                        "name": "Observability & SRE (Metrics, Traces, Logs)",
                        "proficiency": "Intermediate",
                        "importance": "Medium",
                        "question_type": "Short_Answer",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 25,
                        "description": "Prometheus metrics, OpenTelemetry tracing, centralized logging, and alerting thresholds."
                    }
                ]
            },
            {
                "id": "dim-be-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Architecture RFC authoring, incident communication, cross-service team alignment, and documentation.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-be-401",
                        "name": "Architecture Documentation & RFC Authoring",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Writing clear Request for Comments (RFCs), API contracts (OpenAPI), and sequence diagrams."
                    },
                    {
                        "id": "skill-be-402",
                        "name": "Incident Post-Mortems & Team Collaboration",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Facilitating blameless post-mortems, action items follow-up, and cross-team dependency syncing."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 6. FRONTEND / UI-UX ENGINEER
    # -------------------------------------------------------------
    "frontend": {
        "id": "frontend",
        "role_title": "Frontend / UI-UX Engineer",
        "description": "Evaluation of modern JavaScript frameworks, responsive architecture, web performance, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-fe-1",
                "name": "JavaScript & TypeScript Mastery",
                "description": "Core JS runtime execution, event loops, TypeScript type algebra, and ESNext features.",
                "weight": 25,
                "desired_score": 80,
                "color": "#eab308",
                "skills": [
                    {
                        "id": "skill-fe-101",
                        "name": "ES6+ JavaScript & Event Loop",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Prototypes, closures, microtask/macrotask queues, promises, and hoisting."
                    },
                    {
                        "id": "skill-fe-102",
                        "name": "TypeScript Typing & Generics",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Strict null checks, utility types, mapped types, and API response typing."
                    }
                ]
            },
            {
                "id": "dim-fe-2",
                "name": "React Ecosystem & Architecture",
                "description": "Component design systems, state managers, server rendering (Next.js), and hook patterns.",
                "weight": 30,
                "desired_score": 75,
                "color": "#0ea5e9",
                "skills": [
                    {
                        "id": "skill-fe-201",
                        "name": "React Architecture & Render Optimization",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 40,
                        "description": "Preventing unnecessary re-renders, memoization, key props, and code splitting."
                    },
                    {
                        "id": "skill-fe-202",
                        "name": "Next.js & SSR/SSG Concepts",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 30,
                        "description": "Server components, client components, data fetching strategies, and hydration."
                    },
                    {
                        "id": "skill-fe-203",
                        "name": "State Management (Redux/Zustand/TanStack Query)",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 30,
                        "description": "Client state vs server cache synchronization, optimism updates, and stores."
                    }
                ]
            },
            {
                "id": "dim-fe-3",
                "name": "Web Performance & UI Accessibility",
                "description": "Core Web Vitals, asset optimization, responsive design, and accessible markup.",
                "weight": 25,
                "desired_score": 70,
                "color": "#10b981",
                "skills": [
                    {
                        "id": "skill-fe-301",
                        "name": "Core Web Vitals & Asset Optimization",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "LCP, CLS, INP diagnostics, bundle size reduction, and lazy loading."
                    },
                    {
                        "id": "skill-fe-302",
                        "name": "WCAG Accessibility & Semantic HTML",
                        "proficiency": "Intermediate",
                        "importance": "Medium",
                        "question_type": "MCQ",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "Screen reader support, ARIA attributes, keyboard navigation, and color contrast."
                    }
                ]
            },
            {
                "id": "dim-fe-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Design system handoff, designer partnership, technical documentation, and product alignment.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-fe-401",
                        "name": "Design Handoff & UX Designer Partnership",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Translating Figma design tokens into component contracts and resolving UI trade-offs."
                    },
                    {
                        "id": "skill-fe-402",
                        "name": "Frontend Technical Documentation & PR Reviews",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Documenting component storybooks, reviewing UI PRs for usability, and communicating API requirements."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 7. DEVOPS & CLOUD INFRASTRUCTURE ENGINEER
    # -------------------------------------------------------------
    "devops": {
        "id": "devops",
        "role_title": "DevOps & Cloud Infrastructure Engineer",
        "description": "Assessment of containerization, CI/CD pipelines, cloud orchestration, Infrastructure as Code, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-do-1",
                "name": "Containers & Kubernetes Orchestration",
                "description": "Docker container lifecycle, Kubernetes clusters, ingress, and deployment strategies.",
                "weight": 30,
                "desired_score": 75,
                "color": "#3b82f6",
                "skills": [
                    {
                        "id": "skill-do-101",
                        "name": "Kubernetes Architecture & Deployments",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Pods, Deployments, Services, ConfigMaps, Ingress controllers, and HPA autoscaling."
                    },
                    {
                        "id": "skill-do-102",
                        "name": "Docker & Multi-Stage Image Optimization",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Layer caching, multi-stage builds, non-root users, and minimal base images."
                    }
                ]
            },
            {
                "id": "dim-do-2",
                "name": "Infrastructure as Code & CI/CD",
                "description": "Automated deployments, Terraform provisioning, pipeline security, and rollback mechanics.",
                "weight": 30,
                "desired_score": 75,
                "color": "#8b5cf6",
                "skills": [
                    {
                        "id": "skill-do-201",
                        "name": "Terraform / CloudFormation (IaC)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "State management, modules, remote backends, drift detection, and provider syntax."
                    },
                    {
                        "id": "skill-do-202",
                        "name": "CI/CD Pipeline Automation (GitHub Actions/GitLab)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Automated testing stages, artifact publishing, zero-downtime blue/green rollouts."
                    }
                ]
            },
            {
                "id": "dim-do-3",
                "name": "Cloud Security, SRE & Observability",
                "description": "IAM least privilege, VPC networking, encryption at rest/transit, and Prometheus/Grafana.",
                "weight": 20,
                "desired_score": 70,
                "color": "#f59e0b",
                "skills": [
                    {
                        "id": "skill-do-301",
                        "name": "Cloud Security & IAM Governance",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Role-based policies, secret rotation, TLS termination, and network security groups."
                    },
                    {
                        "id": "skill-do-302",
                        "name": "Prometheus, Grafana & Incident Response",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "SLO/SLA definition, alerting rules, log aggregation, and post-mortem best practices."
                    }
                ]
            },
            {
                "id": "dim-do-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Incident post-mortems, operational runbooks, developer enablement, and cross-team alignment.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-do-401",
                        "name": "Incident Runbook & Post-Mortem Documentation",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Authoring actionable runbooks and communicating incident timelines transparently."
                    },
                    {
                        "id": "skill-do-402",
                        "name": "Developer Enablement & Cross-Team DevOps Alignment",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Educating development squads on infrastructure best practices and self-serve tooling."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 8. DATA SCIENTIST & ML ENGINEER
    # -------------------------------------------------------------
    "datascientist": {
        "id": "datascientist",
        "role_title": "Data Scientist & ML Engineer",
        "description": "Evaluation of statistical modeling, machine learning algorithms, data engineering pipelines, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-ds-1",
                "name": "Statistical Modeling & Mathematics",
                "description": "Hypothesis testing, distributions, linear algebra, and probability theory.",
                "weight": 20,
                "desired_score": 75,
                "color": "#6366f1",
                "skills": [
                    {
                        "id": "skill-ds-101",
                        "name": "A/B Testing & Hypothesis Testing",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Sample size calculation, p-values, power analysis, and statistical significance."
                    },
                    {
                        "id": "skill-ds-102",
                        "name": "Applied Probability & Statistical Distributions",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Normal, Binomial, Poisson distributions, Bayes' Theorem, and maximum likelihood."
                    }
                ]
            },
            {
                "id": "dim-ds-2",
                "name": "Machine Learning & Deep Learning",
                "description": "Supervised, unsupervised algorithms, model evaluation metrics, and LLM/NLP concepts.",
                "weight": 30,
                "desired_score": 75,
                "color": "#ec4899",
                "skills": [
                    {
                        "id": "skill-ds-201",
                        "name": "Supervised Learning & Validation",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 40,
                        "description": "Gradient boosting (XGBoost/LightGBM), cross-validation, precision/recall, and AUC-ROC."
                    },
                    {
                        "id": "skill-ds-202",
                        "name": "Feature Engineering & Preprocessing",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 35,
                        "description": "Encoding categorical variables, handling missing data, normalization, and outlier removal."
                    },
                    {
                        "id": "skill-ds-203",
                        "name": "NLP / LLMs & Embeddings",
                        "proficiency": "Intermediate",
                        "importance": "Medium",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 25,
                        "description": "Tokenization, cosine similarity, vector embeddings, and prompt engineering."
                    }
                ]
            },
            {
                "id": "dim-ds-3",
                "name": "Data Pipelines & MLOps Deployment",
                "description": "Python data frameworks (Pandas, Polars), SQL data transformation, and model tracking.",
                "weight": 30,
                "desired_score": 70,
                "color": "#14b8a6",
                "skills": [
                    {
                        "id": "skill-ds-301",
                        "name": "Advanced SQL & Analytical Queries",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Window functions (ROW_NUMBER, LEAD/LAG), CTEs, and aggregation performance."
                    },
                    {
                        "id": "skill-ds-302",
                        "name": "Model Serving & Monitoring (MLflow/Docker)",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 65,
                        "desired_score": 70,
                        "weight": 50,
                        "description": "API model serving, concept drift detection, latency constraints, and experiment tracking."
                    }
                ]
            },
            {
                "id": "dim-ds-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Translating ML metrics into business outcomes, cross-functional collaboration, and ethical AI alignment.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-ds-401",
                        "name": "Translating Model Metrics to Business ROI",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Explaining precision vs. recall trade-offs, false positives cost, and model behavior to business leaders."
                    },
                    {
                        "id": "skill-ds-402",
                        "name": "Interdisciplinary Collaboration with Engineering & Product",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Collaborating with backend teams on data ingestion schemas and communicating model constraints."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 9. QA AUTOMATION & RELIABILITY ENGINEER
    # -------------------------------------------------------------
    "qa_automation": {
        "id": "qa_automation",
        "role_title": "QA Automation & Reliability Engineer",
        "description": "Senior test engineering assessment covering test automation frameworks, API & performance validation, CI/CD quality gates, and communication.",
        "dimensions": [
            {
                "id": "dim-qaa-1",
                "name": "Test Automation Framework Architecture",
                "description": "Design of scalable automation suites (Playwright/Cypress/Selenium), Page Object Model, and test isolation.",
                "weight": 30,
                "desired_score": 75,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-qaa-101",
                        "name": "Framework Architecture (POM/Playwright/Cypress)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Designing maintainable test frameworks, fixture management, and cross-browser test parallelization."
                    },
                    {
                        "id": "skill-qaa-102",
                        "name": "Flaky Test Detection & Retry Mechanics",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Debugging timing issues, auto-waiting strategies, and eliminating non-deterministic test flakes."
                    }
                ]
            },
            {
                "id": "dim-qaa-2",
                "name": "API, Performance & Load Testing",
                "description": "Automated backend contract testing, load injection, and benchmark monitoring.",
                "weight": 25,
                "desired_score": 75,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-qaa-201",
                        "name": "API Automated Testing & Mocking (REST/GraphQL)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Schema validation, contract testing (Pact), token authentication, and mock servers."
                    },
                    {
                        "id": "skill-qaa-202",
                        "name": "Performance & Stress Testing (k6/JMeter)",
                        "proficiency": "Intermediate",
                        "importance": "High",
                        "question_type": "Scenario",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Virtual user ramp-up, latency percentile analysis (p95, p99), and bottleneck profiling."
                    }
                ]
            },
            {
                "id": "dim-qaa-3",
                "name": "CI/CD Quality Gates & TestOps",
                "description": "Embedding automated tests into pipelines, quality metrics dashboards, and release blockers.",
                "weight": 25,
                "desired_score": 75,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-qaa-301",
                        "name": "Pipeline Integration & Test Parallelization",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Running suites in GitHub Actions / Docker containers with matrix execution and artifact reports."
                    },
                    {
                        "id": "skill-qaa-302",
                        "name": "Quality Metrics & Release Sign-Off Gates",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 70,
                        "desired_score": 75,
                        "weight": 50,
                        "description": "Enforcing code coverage, automated pass rates, and blocker thresholds for deployment releases."
                    }
                ]
            },
            {
                "id": "dim-qaa-4",
                "name": "Professional Communication & Collaboration (Mandatory)",
                "description": "Cross-functional quality advocacy, transparent status dashboards, and engineering partnership.",
                "weight": 20,
                "desired_score": 75,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-qaa-401",
                        "name": "Quality Advocacy Across Engineering & Product",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Influencing developers to write robust unit/integration tests and advocating quality in sprint planning."
                    },
                    {
                        "id": "skill-qaa-402",
                        "name": "Release Readiness Communication & Risk Briefings",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Summarizing test run matrices, risk analysis, and release recommendations clearly to stakeholders."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 10. SENIOR SOFTWARE ENGINEER (Mentorship & Scalability)
    # -------------------------------------------------------------
    "senior_swe": {
        "id": "senior_swe",
        "role_title": "Senior Software Engineer",
        "description": "Advanced engineering role combining clean software architecture, system scalability, technical mentorship & leadership, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-sr-1",
                "name": "Clean Architecture & Advanced Engineering",
                "description": "Domain-Driven Design, design patterns, refactoring, and technical debt minimization.",
                "weight": 30,
                "desired_score": 80,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-sr-101",
                        "name": "Design Patterns & SOLID Principles",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "MCQ",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Factory, Observer, Strategy, Dependency Injection, and decoupling architectural boundaries."
                    },
                    {
                        "id": "skill-sr-102",
                        "name": "Legacy Code Refactoring & Tech Debt Strategy",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Strangler fig pattern, incremental migrations, minimizing regression risks in monoliths."
                    }
                ]
            },
            {
                "id": "dim-sr-2",
                "name": "System Architecture & Scalability",
                "description": "High-throughput system design, data modeling, concurrency control, and resilience patterns.",
                "weight": 25,
                "desired_score": 80,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-sr-201",
                        "name": "Distributed System Resilience (Circuit Breakers/Sagas)",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Handling network partitions, retry policies with backoff, circuit breaking, and saga orchestration."
                    },
                    {
                        "id": "skill-sr-202",
                        "name": "High-Performance Data Modeling & Caching",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Sharding, read replicas, database partitioning, and write-through/write-back caching."
                    }
                ]
            },
            {
                "id": "dim-sr-3",
                "name": "Technical Mentorship & Engineering Leadership",
                "description": "Mentoring engineers, setting code quality standards, and leading engineering practices.",
                "weight": 25,
                "desired_score": 80,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-sr-301",
                        "name": "Code Review Rigor & Quality Standards",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Providing thorough, constructive architectural reviews and establishing team linting/test standards."
                    },
                    {
                        "id": "skill-sr-302",
                        "name": "Mentoring Junior/Mid Engineers & Knowledge Sharing",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Pair programming, technical onboarding, coaching peers on system design, and running tech talks."
                    }
                ]
            },
            {
                "id": "dim-sr-4",
                "name": "Professional Communication & Stakeholder Collaboration (Mandatory)",
                "description": "Technical design documents (RFCs), cross-functional trade-off alignment, and stakeholder briefings.",
                "weight": 20,
                "desired_score": 80,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-sr-401",
                        "name": "Technical Design Document (RFC) Authoring",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Authoring comprehensive RFCs with architecture diagrams, security implications, and trade-off matrices."
                    },
                    {
                        "id": "skill-sr-402",
                        "name": "Cross-Functional Collaboration & Technical Negotiation",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Aligning product managers and engineers on realistic timelines, technical scope, and MVP trade-offs."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 11. TECHNICAL LEAD / TEAM LEAD
    # -------------------------------------------------------------
    "tech_lead": {
        "id": "tech_lead",
        "role_title": "Technical Lead / Team Lead",
        "description": "Leadership role evaluating technical strategy, architecture governance, team leadership & mentorship, agile delivery, and cross-functional communication.",
        "dimensions": [
            {
                "id": "dim-tl-1",
                "name": "System Architecture & Technical Strategy",
                "description": "Architectural governance, tech stack decisions, Architecture Decision Records (ADRs), and resilience.",
                "weight": 25,
                "desired_score": 80,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-tl-101",
                        "name": "Architecture Decision Records (ADRs) & Strategy",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Establishing ADRs, evaluating third-party solutions, and mapping long-term system evolution."
                    },
                    {
                        "id": "skill-tl-102",
                        "name": "Resilience, Observability & Security Architecture",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Designing for 99.99% uptime, distributed tracing, security compliance, and disaster recovery."
                    }
                ]
            },
            {
                "id": "dim-tl-2",
                "name": "People Leadership, Mentorship & Team Health",
                "description": "Guiding engineers, conflict resolution, high-performance team culture, and skill progression.",
                "weight": 25,
                "desired_score": 80,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-tl-201",
                        "name": "Engineer Growth, Mentorship & Career Guidance",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Coaching team members through complex tasks, career development discussions, and knowledge transfers."
                    },
                    {
                        "id": "skill-tl-202",
                        "name": "Technical Conflict Resolution & Team Consensus",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Resolving architectural debates, facilitating blameless consensus, and maintaining team harmony."
                    }
                ]
            },
            {
                "id": "dim-tl-3",
                "name": "Agile Delivery & Code Governance",
                "description": "Sprint planning, story estimation, delivery predictability, and engineering best practices.",
                "weight": 25,
                "desired_score": 80,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-tl-301",
                        "name": "Sprint Estimation, Scope Deconstruction & Delivery",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Breaking complex features into sprintable user stories, identifying critical path, and unblocking engineers."
                    },
                    {
                        "id": "skill-tl-302",
                        "name": "CI/CD & Code Governance Standards",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "MCQ",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Automated code analysis, branch protection rules, testing thresholds, and deployment pipelines."
                    }
                ]
            },
            {
                "id": "dim-tl-4",
                "name": "Stakeholder Communication & Technical Articulation (Mandatory)",
                "description": "Translating business goals into technical requirements and delivering status updates to leadership.",
                "weight": 25,
                "desired_score": 80,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-tl-401",
                        "name": "Translating Business Requirements into Tech Roadmaps",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Partnering with product managers to scope feasibility, milestones, and deliverable commitments."
                    },
                    {
                        "id": "skill-tl-402",
                        "name": "Cross-Team Alignment & Executive Briefings",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Communicating team progress, technical blockers, and architectural risks succinctly to managers."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 12. STAFF / PRINCIPAL SOFTWARE ARCHITECT
    # -------------------------------------------------------------
    "principal_architect": {
        "id": "principal_architect",
        "role_title": "Staff / Principal Software Architect",
        "description": "Highest technical echelon evaluation covering enterprise distributed architecture, long-term tech strategy, cross-organization leadership, and executive communication.",
        "dimensions": [
            {
                "id": "dim-pa-1",
                "name": "Enterprise Distributed Systems Architecture",
                "description": "Global scale, multi-region architecture, event-driven backbones, and mission-critical reliability.",
                "weight": 35,
                "desired_score": 85,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-pa-101",
                        "name": "High-Throughput Event-Driven Architectures",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Event sourcing, CQRS, multi-tenant partitioning, Kafka/Pulsar streaming, and consistency models."
                    },
                    {
                        "id": "skill-pa-102",
                        "name": "Multi-Region High Availability & Disaster Recovery",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Active-active deployments, zero-RPO/RTO strategies, geo-DNS routing, and data replication."
                    }
                ]
            },
            {
                "id": "dim-pa-2",
                "name": "Strategic Tech Vision & Governance",
                "description": "Enterprise-wide technical stack standardization, tech debt strategy, and vendor selection.",
                "weight": 25,
                "desired_score": 85,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-pa-201",
                        "name": "Enterprise Tech Stack Standardization & Modernization",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Setting company-wide engineering frameworks, deprecation roadmaps, and build-vs-buy analysis."
                    },
                    {
                        "id": "skill-pa-202",
                        "name": "Tech Debt Portfolio Management & Risk Mitigation",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Quantifying architectural risk to business leaders and executing phased modernizations."
                    }
                ]
            },
            {
                "id": "dim-pa-3",
                "name": "Cross-Organization Technical Leadership",
                "description": "Architectural guild leadership, coaching tech leads, and establishing engineering excellence.",
                "weight": 20,
                "desired_score": 80,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-pa-301",
                        "name": "Architectural Guild Leadership & Tech Lead Coaching",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Guiding tech leads across multiple engineering squads and upholding architectural consistency."
                    },
                    {
                        "id": "skill-pa-302",
                        "name": "Engineering Innovation & Emerging Tech Strategy",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Piloting AI/LLM tooling, serverless patterns, and forward-looking architectural paradigms."
                    }
                ]
            },
            {
                "id": "dim-pa-4",
                "name": "Executive Communication & Stakeholder Influence (Mandatory)",
                "description": "Presenting architectural strategy to executive management, C-suite, and cross-department leaders.",
                "weight": 20,
                "desired_score": 85,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-pa-401",
                        "name": "C-Suite & Board Architectural Presentations",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Translating multi-million dollar tech infrastructure investments into business value and risk reduction."
                    },
                    {
                        "id": "skill-pa-402",
                        "name": "Cross-Departmental Consensus Building & Influence",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Building consensus across product, security, legal, and engineering leaders on strategic changes."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 13. ENGINEERING MANAGER / SDM
    # -------------------------------------------------------------
    "engineering_manager": {
        "id": "engineering_manager",
        "role_title": "Engineering Manager / SDM",
        "description": "Management assessment focusing on people leadership, talent coaching, agile delivery execution, engineering strategy, and executive communication.",
        "dimensions": [
            {
                "id": "dim-em-1",
                "name": "People Leadership, Coaching & Talent Retention",
                "description": "1-on-1 coaching, career ladders, performance management, hiring, and retention.",
                "weight": 30,
                "desired_score": 85,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-em-101",
                        "name": "1-on-1 Coaching, Career Paths & Performance Reviews",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Running impactful 1-on-1s, managing performance improvement plans (PIPs), and promoting engineers."
                    },
                    {
                        "id": "skill-em-102",
                        "name": "Hiring, Team Building & Inclusive Culture",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Designing interview loops, closing engineering candidates, and building an inclusive high-trust culture."
                    }
                ]
            },
            {
                "id": "dim-em-2",
                "name": "Agile Project Delivery & Operational Excellence",
                "description": "Team velocity, delivery predictability, on-call health, and operational reliability.",
                "weight": 25,
                "desired_score": 80,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-em-201",
                        "name": "Delivery Predictability & Blocker Elimination",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Tracking sprint commitments, eliminating bottlenecks, and mitigating delivery schedule slips."
                    },
                    {
                        "id": "skill-em-202",
                        "name": "On-Call Rotation, Incident SRE & Team Sustainability",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Preventing team burnout, managing on-call rotations, and fostering blameless incident post-mortems."
                    }
                ]
            },
            {
                "id": "dim-em-3",
                "name": "Engineering Strategy & Resource Planning",
                "description": "Balancing tech debt paydown with product roadmap, capacity planning, and headcount modeling.",
                "weight": 20,
                "desired_score": 75,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-em-301",
                        "name": "Capacity Planning & Headcount Allocation",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Forecasting resource needs, contractor vs. full-time hiring, and multi-quarter sprint planning."
                    },
                    {
                        "id": "skill-em-302",
                        "name": "Balancing Technical Debt with Business Features",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Negotiating dedicated capacity (20% rule) for refactoring, security patches, and reliability work."
                    }
                ]
            },
            {
                "id": "dim-em-4",
                "name": "Cross-Functional Alignment & Stakeholder Communication (Mandatory)",
                "description": "Partnering with Product, Design, QA leaders, executive status reporting, and transparent updates.",
                "weight": 25,
                "desired_score": 85,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-em-401",
                        "name": "Product Management & Design Partnership",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Maintaining seamless collaboration with product managers, resolving scope friction, and co-owning KPIs."
                    },
                    {
                        "id": "skill-em-402",
                        "name": "Executive Status Reporting & Stakeholder Transparency",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Delivering clear, quantitative updates to VP/Director level on milestones, risks, and achievements."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 14. TECHNICAL PROJECT MANAGER / SCRUM MASTER
    # -------------------------------------------------------------
    "project_manager": {
        "id": "project_manager",
        "role_title": "Technical Project Manager / Scrum Master",
        "description": "Project leadership evaluation covering agile execution, risk and scope governance, stakeholder alignment, team motivation, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-pm-1",
                "name": "Agile Execution & Sprint Delivery",
                "description": "Scrum/Kanban ceremonies, backlog grooming, velocity tracking, and release management.",
                "weight": 35,
                "desired_score": 85,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-pm-101",
                        "name": "Scrum/Kanban Ceremony Facilitation",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Running efficient daily standups, sprint planning, backlog refinement, and demo sessions."
                    },
                    {
                        "id": "skill-pm-102",
                        "name": "Velocity Forecasting & Release Milestones",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Utilizing burndown charts, cycle time, story point estimation, and release forecasting."
                    }
                ]
            },
            {
                "id": "dim-pm-2",
                "name": "Risk, Scope & Dependency Management",
                "description": "Cross-team dependency resolution, scope creep control, critical path analysis, and contingency planning.",
                "weight": 25,
                "desired_score": 80,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-pm-201",
                        "name": "Cross-Team Dependency & Critical Path Analysis",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Mapping multi-squad dependencies, tracking blocking deliverables, and proactive escalation."
                    },
                    {
                        "id": "skill-pm-202",
                        "name": "Risk Register & Scope Change Governance",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Maintaining RAID logs (Risks, Assumptions, Issues, Dependencies) and managing change requests."
                    }
                ]
            },
            {
                "id": "dim-pm-3",
                "name": "Leadership, Team Motivation & Continuous Improvement",
                "description": "Servant leadership, psychological safety, and driving retrospective improvements.",
                "weight": 20,
                "desired_score": 80,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-pm-301",
                        "name": "Retrospective Facilitation & Continuous Improvement",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Encouraging open feedback, tracking retrospective action items, and improving squad processes."
                    },
                    {
                        "id": "skill-pm-302",
                        "name": "Servant Leadership & Team Morale",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Shielding developers from external distractions and fostering a collaborative, focused team culture."
                    }
                ]
            },
            {
                "id": "dim-pm-4",
                "name": "Stakeholder Communication & Status Transparency (Mandatory)",
                "description": "Project status dashboards, executive presentations, and stakeholder expectation management.",
                "weight": 20,
                "desired_score": 85,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-pm-401",
                        "name": "Executive Project Dashboards & Status Reports",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Creating concise RAG status reports, Gantt schedules, and high-level progress dashboards."
                    },
                    {
                        "id": "skill-pm-402",
                        "name": "Stakeholder Expectation Management & Negotiation",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Negotiating deadline adjustments and feature trade-offs transparently with executive sponsors."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 15. TECHNICAL PRODUCT MANAGER
    # -------------------------------------------------------------
    "product_manager": {
        "id": "product_manager",
        "role_title": "Technical Product Manager",
        "description": "Product leadership assessment evaluating product discovery, roadmap prioritization, cross-functional leadership, user empathy, and mandatory communication.",
        "dimensions": [
            {
                "id": "dim-pdm-1",
                "name": "Product Strategy, Discovery & Market Analysis",
                "description": "User research, opportunity identification, competitive benchmarking, and value proposition.",
                "weight": 30,
                "desired_score": 85,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-pdm-101",
                        "name": "User Research, Problem Validation & Customer Empathy",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Conducting customer discovery interviews, synthesizing user pain points, and validating hypotheses."
                    },
                    {
                        "id": "skill-pdm-102",
                        "name": "Market Sizing, Competitive Analysis & Product Vision",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Analyzing industry landscape, defining product differentiators, and formulating multi-year vision."
                    }
                ]
            },
            {
                "id": "dim-pdm-2",
                "name": "Roadmap Prioritization & Execution",
                "description": "Feature prioritization frameworks, PRD writing, user stories, and MVP scoping.",
                "weight": 25,
                "desired_score": 80,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-pdm-201",
                        "name": "Prioritization Frameworks (RICE, Kano, MoSCoW)",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Evaluating feature ROI using structured frameworks to balance business impact vs. engineering effort."
                    },
                    {
                        "id": "skill-pdm-202",
                        "name": "PRD Authoring & User Story Specifications",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Drafting unambiguous Product Requirement Documents (PRDs) with acceptance criteria and edge cases."
                    }
                ]
            },
            {
                "id": "dim-pdm-3",
                "name": "Cross-Functional Leadership & User Empathy",
                "description": "Aligning Engineering, Design, Marketing, and Sales teams on product rollout.",
                "weight": 25,
                "desired_score": 80,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-pdm-301",
                        "name": "Engineering & UX Alignment & Trade-Off Negotiation",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Navigating engineering complexity, negotiating pragmatic scope cuts, and preserving user experience."
                    },
                    {
                        "id": "skill-pdm-302",
                        "name": "Go-to-Market Strategy & Launch Coordination",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Partnering with Sales, Marketing, and Customer Support on beta testing, release communications, and enablement."
                    }
                ]
            },
            {
                "id": "dim-pdm-4",
                "name": "Executive Communication & Stakeholder Buy-In (Mandatory)",
                "description": "Product storytelling, metric reporting (OKRs, North Star), and C-suite alignment.",
                "weight": 20,
                "desired_score": 85,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-pdm-401",
                        "name": "Product Storytelling & Executive Pitching",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Presenting compelling product narratives and business cases to secure executive sponsorship and budget."
                    },
                    {
                        "id": "skill-pdm-402",
                        "name": "Data-Driven Metric Reporting (OKRs & North Star)",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Tracking North Star metrics, cohort retention, funnel drop-offs, and reporting OKR attainment."
                    }
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 16. DIRECTOR OF ENGINEERING / VP TECHNOLOGY
    # -------------------------------------------------------------
    "director_engineering": {
        "id": "director_engineering",
        "role_title": "Director of Engineering / VP Technology",
        "description": "Executive leadership assessment covering organizational strategy, talent scaling, engineering culture, technology governance, FinOps, and executive communication.",
        "dimensions": [
            {
                "id": "dim-doe-1",
                "name": "Organizational Leadership & Strategic Vision",
                "description": "Multi-squad vision, engineering organization design, alignment with enterprise OKRs, and change management.",
                "weight": 30,
                "desired_score": 85,
                "color": "#2563eb",
                "skills": [
                    {
                        "id": "skill-doe-101",
                        "name": "Engineering Organization Design & Scaling",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Structuring squads (Spotify model, team topologies), reducing cross-team friction, and scaling headcounts."
                    },
                    {
                        "id": "skill-doe-102",
                        "name": "Strategic Tech Alignment with Enterprise OKRs",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Translating executive company goals into actionable technical initiatives across multiple departments."
                    }
                ]
            },
            {
                "id": "dim-doe-2",
                "name": "Talent Development, Hiring & Culture",
                "description": "Manager coaching, succession planning, engineering culture, and high-performance standards.",
                "weight": 25,
                "desired_score": 85,
                "color": "#7c3aed",
                "skills": [
                    {
                        "id": "skill-doe-201",
                        "name": "Engineering Manager Coaching & Succession Planning",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Mentoring engineering managers, building leadership benches, and conducting management evaluations."
                    },
                    {
                        "id": "skill-doe-202",
                        "name": "Engineering Culture, Retention & High Standards",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Fostering psychological safety, diversity, recognition programs, and minimizing voluntary turnover."
                    }
                ]
            },
            {
                "id": "dim-doe-3",
                "name": "Technology Governance, FinOps & Risk Management",
                "description": "Cloud budgeting, infrastructure cost optimization, compliance, security, and vendor agreements.",
                "weight": 20,
                "desired_score": 80,
                "color": "#059669",
                "skills": [
                    {
                        "id": "skill-doe-301",
                        "name": "Cloud Budgeting, FinOps & Cost Optimization",
                        "proficiency": "Advanced",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 80,
                        "desired_score": 85,
                        "weight": 50,
                        "description": "Managing AWS/Azure/GCP spend, unit economics per customer, and driving architectural cost efficiency."
                    },
                    {
                        "id": "skill-doe-302",
                        "name": "Enterprise Security, Compliance & Vendor Governance",
                        "proficiency": "Advanced",
                        "importance": "High",
                        "question_type": "Short_Answer",
                        "benchmark_score": 75,
                        "desired_score": 80,
                        "weight": 50,
                        "description": "Ensuring SOC2 / GDPR / HIPAA compliance, software licensing audits, and enterprise SLA commitments."
                    }
                ]
            },
            {
                "id": "dim-doe-4",
                "name": "Executive Communication & Board Alignment (Mandatory)",
                "description": "Board of Directors briefings, executive crisis management, and cross-executive alignment.",
                "weight": 25,
                "desired_score": 90,
                "color": "#0284c7",
                "skills": [
                    {
                        "id": "skill-doe-401",
                        "name": "Board of Directors & C-Suite Technical Strategy",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Short_Answer",
                        "benchmark_score": 90,
                        "desired_score": 95,
                        "weight": 50,
                        "description": "Presenting tech roadmap progress, risk posture, and capital investment returns clearly to board members."
                    },
                    {
                        "id": "skill-doe-402",
                        "name": "Cross-Department Executive Partnership & Crisis Leadership",
                        "proficiency": "Expert",
                        "importance": "Critical",
                        "question_type": "Scenario",
                        "benchmark_score": 85,
                        "desired_score": 90,
                        "weight": 50,
                        "description": "Partnering with Chief Product Officer, CFO, and Legal in strategic decisions and major incident leadership."
                    }
                ]
            }
        ]
    }
}


class DimensionSkillsService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")

    def get_templates(self) -> List[Dict[str, Any]]:
        """Returns the list of all available role templates, ensuring desired_score is set."""
        import copy
        templates = copy.deepcopy(list(DEFAULT_ROLE_TEMPLATES.values()))
        for tpl in templates:
            for d in tpl.get("dimensions", []):
                if "desired_score" not in d:
                    d["desired_score"] = 75
                for s in d.get("skills", []):
                    if "desired_score" not in s:
                        s["desired_score"] = s.get("benchmark_score", 70)
                    elif "benchmark_score" not in s:
                        s["benchmark_score"] = s.get("desired_score", 70)
        return templates

    def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Returns a specific role template."""
        for t in self.get_templates():
            if t.get("id") == template_id:
                return t
        return DEFAULT_ROLE_TEMPLATES.get(template_id)

    def extract_dimensions_and_skills_with_ai(
        self,
        job_description: str,
        role_title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uses AI (Groq LLM) to analyze the job description or role title and generate
        tailored evaluation dimensions and specific skills with weights, proficiencies,
        and importance. Falls back gracefully to intelligent matching if LLM unavailable.
        """
        # If API key is available, attempt structured extraction via Groq LLM
        if self.api_key:
            try:
                from langchain_openai import ChatOpenAI
                from langchain_core.prompts import ChatPromptTemplate

                llm = ChatOpenAI(
                    model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                    temperature=0.2,
                    api_key=self.api_key,
                    base_url="https://api.groq.com/openai/v1",
                ).with_structured_output(SkillMatrixSchema)

                system_prompt = (
                    "You are a principal talent architect and technical hiring assessment designer. "
                    "Analyze the given job description or role requirements and construct a structured "
                    "evaluation rubric consisting of 4 to 6 Evaluation Dimensions. "
                    "MANDATORY ARCHITECTURAL RULES: "
                    "1. SYSTEM ARCHITECTURE & COMMUNICATION MUST BE SEPARATE: Never combine System Architecture and Communication into a single dimension. "
                    "2. MANDATORY COMMUNICATION DIMENSION: Every single role MUST have a dedicated dimension named 'Professional Communication & Collaboration (Mandatory)' "
                    "with 15% to 25% weight, evaluating technical articulation, stakeholder management, and cross-functional teamwork. "
                    "3. MANAGEMENT & LEADERSHIP: For senior, lead, manager, or director roles, you must include explicit dimensions evaluating People Leadership, Mentorship, Agile Project Management, and Strategic Planning. "
                    "4. WEIGHTS: Each Dimension must have a percentage weight, where the sum of all dimension weights equals exactly 100. "
                    "Under each Dimension, extract 2 to 4 concrete, assessable Skills with required proficiency, "
                    "importance level (Critical, High, Medium, Nice-to-Have), preferred question format, "
                    "benchmark passing score (e.g. 70%), and a brief evaluation focus description."
                )

                user_prompt = f"""
                Job Title: {role_title or "Software Professional"}

                Job Description Context:
                {job_description[:6000]}

                Extract the comprehensive Dimensions and Skills matrix tailored to this role.
                Ensure the weights across all dimensions sum to 100.
                """

                prompt = ChatPromptTemplate.from_messages([
                    ("system", system_prompt),
                    ("user", user_prompt)
                ])

                chain = prompt | llm
                result = chain.invoke({})

                # Normalize weights to ensure total is exactly 100
                result_dict = result.model_dump() if hasattr(result, "model_dump") else result.dict()
                dims = result_dict.get("dimensions", [])
                if dims:
                    # Provide default colors if missing
                    palette = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0284c7"]
                    for idx, d in enumerate(dims):
                        if not d.get("color"):
                            d["color"] = palette[idx % len(palette)]
                        if not d.get("id"):
                            d["id"] = f"dim-ai-{idx+1}"
                        for s_idx, s in enumerate(d.get("skills", [])):
                            if not s.get("id"):
                                s["id"] = f"skill-ai-{idx+1}-{s_idx+1}"

                    # Normalize weight sum
                    total_wt = sum(d.get("weight", 0) for d in dims)
                    if total_wt > 0 and total_wt != 100:
                        for d in dims:
                            d["weight"] = round((d["weight"] / total_wt) * 100)
                        diff = 100 - sum(d["weight"] for d in dims)
                        if dims:
                            dims[0]["weight"] += diff

                return result_dict
            except Exception as e:
                # Log and proceed to fallback
                print(f"[DimensionSkillsService] AI extraction failed, using heuristic template: {e}")

        # Smart Heuristic Fallback based on text/role matching
        text_lower = f"{role_title or ''} {job_description}".lower()
        if "director" in text_lower or "vp" in text_lower or "vice president" in text_lower or "head of engineering" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["director_engineering"]
        elif "product manager" in text_lower or "product owner" in text_lower or "technical pm" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["product_manager"]
        elif "project manager" in text_lower or "scrum master" in text_lower or "agile coach" in text_lower or "tpm" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["project_manager"]
        elif "engineering manager" in text_lower or "sdm" in text_lower or "dev manager" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["engineering_manager"]
        elif "architect" in text_lower or "principal" in text_lower or "staff engineer" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["principal_architect"]
        elif "tech lead" in text_lower or "team lead" in text_lower or "lead engineer" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["tech_lead"]
        elif "senior" in text_lower or "sr." in text_lower or "sr " in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["senior_swe"]
        elif "qa automation" in text_lower or "sdet" in text_lower or "automation engineer" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["qa_automation"]
        elif "junior qa" in text_lower or "qa tester" in text_lower or "test analyst" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["junior_qa"]
        elif "junior data" in text_lower or "data analyst" in text_lower or "bi analyst" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["junior_data"]
        elif "junior" in text_lower or "associate" in text_lower or "graduate" in text_lower or "entry level" in text_lower or "intern" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["junior_swe"]
        elif "data" in text_lower or "machine learning" in text_lower or "ml" in text_lower or "analytics" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["datascientist"]
        elif "devops" in text_lower or "cloud" in text_lower or "kubernetes" in text_lower or "sre" in text_lower or "infrastructure" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["devops"]
        elif "frontend" in text_lower or "react" in text_lower or "ui" in text_lower or "css" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["frontend"]
        elif "backend" in text_lower or "django" in text_lower or "fastapi" in text_lower or "golang" in text_lower or "java" in text_lower:
            template = DEFAULT_ROLE_TEMPLATES["backend"]
        else:
            template = DEFAULT_ROLE_TEMPLATES["fullstack"]

        # Deep copy template to avoid mutating default
        result = json.loads(json.dumps(template))
        if role_title:
            result["role_title"] = role_title
        return result

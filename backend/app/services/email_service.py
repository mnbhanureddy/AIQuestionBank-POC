import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    """Service to handle automated candidate assessment email invitations and notifications."""

    @staticmethod
    def get_smtp_config() -> Dict[str, Any]:
        """Load SMTP settings from environment variables, dynamically reloading .env."""
        env_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
        if os.path.exists(env_file):
            load_dotenv(dotenv_path=env_file, override=True)
        else:
            load_dotenv(override=True)

        server = os.getenv("SMTP_SERVER", "").strip().strip('"\'')
        port_val = os.getenv("SMTP_PORT", "587").strip().strip('"\'')
        try:
            port = int(port_val)
        except Exception:
            port = 587

        raw_user = (os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER") or "").strip().strip('"\'')
        raw_password = os.getenv("SMTP_PASSWORD", "").strip().strip('"\'')
        from_email = (os.getenv("SMTP_FROM_EMAIL") or raw_user or "no-reply@talentassess.ai").strip().strip('"\'')
        from_name = os.getenv("SMTP_FROM_NAME", "TalentAssess AI Recruitment").strip().strip('"\'')
        use_tls = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
        use_ssl = os.getenv("SMTP_SSL", "false").lower() in ("true", "1", "yes")

        return {
            "server": server,
            "port": port,
            "user": raw_user,
            "password": raw_password,
            "from_email": from_email,
            "from_name": from_name,
            "use_tls": use_tls,
            "use_ssl": use_ssl,
        }

    @staticmethod
    def is_configured() -> bool:
        """Check if SMTP settings are configured in the environment."""
        config = EmailService.get_smtp_config()
        return bool(config["server"] and (config["user"] or config["port"] == 25))

    @staticmethod
    def generate_email_content(
        candidate_name: str,
        invitation_link: str,
        job_title: str = "Role Assessment",
        organization_name: str = "TalentAssess AI",
        num_questions: int = 5,
        duration_minutes: int = 15,
        difficulty: str = "Standard",
        candidate_login_email: Optional[str] = None,
        candidate_password: Optional[str] = None,
        portal_link: Optional[str] = None
    ) -> Tuple[str, str, str]:
        """Generates (subject, text_body, html_body) for the candidate assessment invitation."""
        subject = f"Assessment Invitation & Login Credentials: {job_title} - {organization_name}"

        # Candidate login snippet
        login_snippet_text = ""
        if candidate_login_email and candidate_password:
            p_link = portal_link or "http://localhost:3000"
            login_snippet_text = f"""
CANDIDATE USER LOGIN CREDENTIALS:
• Candidate Portal URL: {p_link}
• Login Email / Username: {candidate_login_email}
• Temporary Password: {candidate_password}
(You can log in to your portal to review your assignments and view your evaluation reports after completing the test.)
"""

        # 1. Plain-text version
        text_body = f"""Dear {candidate_name},

You have been invited by {organization_name} to complete an online candidate evaluation assessment for the {job_title} position.

ASSESSMENT OVERVIEW:
• Position: {job_title}
• Organization: {organization_name}
• Number of Questions: {num_questions}
• Difficulty: {difficulty}
• Time Limit: {duration_minutes} Minutes (Live Countdown)
• Feature: Real-Time Auto-Save enabled
{login_snippet_text}
TO START YOUR ASSESSMENT DIRECTLY, CLICK OR OPEN THE FOLLOWING LINK:
{invitation_link}

IMPORTANT CANDIDATE INSTRUCTIONS:
1. Please complete the assessment in one sitting from a quiet environment.
2. The {duration_minutes}-minute countdown timer begins once you load the assessment link.
3. Your answers are automatically saved in real time as you type or select answers.
4. When the timer hits 00:00, your assessment will be submitted automatically.
5. You can log in using your credentials above to check evaluation reports upon completion.

If you have questions or encounter any issues, please contact the recruiting team at {organization_name}.

Best regards,
Recruitment Team
{organization_name}
Powered by TalentAssess AI
"""

        # 2. Rich HTML version
        html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Invitation</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color:#1e293b; line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fb; padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(19, 34, 71, 0.08); max-width:600px; width:100%;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color:#132247; padding:28px 32px; text-align:left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.3px;">
                      {organization_name}
                    </h1>
                    <p style="color:#9aa5b8; margin:4px 0 0; font-size:13px;">
                      Candidate Assessment Portal · Powered by TalentAssess AI
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <h2 style="color:#0f172a; margin:0 0 16px; font-size:20px; font-weight:700;">
                Candidate Assessment Invitation
              </h2>
              
              <p style="margin:0 0 16px; font-size:15px; color:#334155;">
                Dear <strong>{candidate_name}</strong>,
              </p>
              
              <p style="margin:0 0 24px; font-size:15px; color:#334155;">
                You have been selected to complete an online candidate evaluation for the <strong>{job_title}</strong> role at <strong>{organization_name}</strong>.
              </p>

              <!-- Assessment Highlights Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:28px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding:6px 0; font-size:13.5px; color:#64748b;">
                          📋 <strong>Role:</strong> <span style="color:#0f172a;">{job_title}</span>
                        </td>
                        <td width="50%" style="padding:6px 0; font-size:13.5px; color:#64748b;">
                          ⏱ <strong>Time Limit:</strong> <span style="color:#0f172a;">{duration_minutes} Minutes</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:6px 0; font-size:13.5px; color:#64748b;">
                          📝 <strong>Questions:</strong> <span style="color:#0f172a;">{num_questions} Questions</span>
                        </td>
                        <td width="50%" style="padding:6px 0; font-size:13.5px; color:#64748b;">
                          🛡 <strong>Auto-Save:</strong> <span style="color:#10b981; font-weight:600;">Real-Time Active</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Candidate Login Credentials Block (if account created) -->
              {f'''
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9ff; border:1.5px solid #0284c7; border-radius:10px; margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px; font-size:14px; font-weight:700; color:#0369a1;">
                      🔑 Candidate Portal Login Credentials:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:4px 0; font-size:13px; color:#0f172a;">
                          <strong>Candidate Portal URL:</strong> <a href="{portal_link or 'http://localhost:3000'}" style="color:#0284c7; text-decoration:underline;">{portal_link or 'http://localhost:3000'}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; font-size:13px; color:#0f172a;">
                          <strong>Login Email / Username:</strong> <code style="background:#e0f2fe; padding:2px 6px; border-radius:4px; font-weight:600; color:#0369a1;">{candidate_login_email}</code>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0; font-size:13px; color:#0f172a;">
                          <strong>Temporary Password:</strong> <code style="background:#e0f2fe; padding:2px 6px; border-radius:4px; font-weight:600; color:#0369a1;">{candidate_password}</code>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:8px 0 0; font-size:12px; color:#64748b;">
                      💡 You can log in at any time to take the test and view your detailed evaluation report after submission.
                    </p>
                  </td>
                </tr>
              </table>
              ''' if candidate_login_email and candidate_password else ''}

              <!-- Primary CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 28px; text-align:center;">
                <tr>
                  <td align="center">
                    <a href="{invitation_link}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #00a3e0 0%, #0077b5 100%); color:#ffffff; font-size:16px; font-weight:700; text-decoration:none; padding:14px 34px; border-radius:8px; box-shadow:0 4px 14px rgba(0, 119, 181, 0.35);">
                      Start Assessment Directly →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instructions / Guidance -->
              <div style="background-color:#eff6ff; border-left:4px solid #00a3e0; padding:14px 16px; border-radius:4px; margin-bottom:24px;">
                <p style="margin:0 0 6px; font-size:13.5px; font-weight:700; color:#1e40af;">
                  Important Instructions:
                </p>
                <ul style="margin:0; padding-left:18px; font-size:13px; color:#1e3a8a; line-height:1.5;">
                  <li>Ensure you have a stable internet connection and a quiet environment.</li>
                  <li>The {duration_minutes}-minute timer begins as soon as you access the assessment.</li>
                  <li>Your answers are continuously <strong>auto-saved locally</strong> as you type.</li>
                  <li>If the countdown expires, your responses will be submitted automatically.</li>
                  <li>After submission, you can log in to your portal using the credentials above to view your score reports.</li>
                </ul>
              </div>

              <!-- Direct Link Fallback -->
              <p style="margin:0 0 6px; font-size:12px; color:#64748b;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px; font-size:12px; word-break:break-all; color:#0077b5;">
                <a href="{invitation_link}" style="color:#0077b5; text-decoration:underline;">{invitation_link}</a>
              </p>

              <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;">

              <p style="margin:0; font-size:13.5px; color:#475569;">
                Best regards,<br>
                <strong>{organization_name} Recruiting Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:20px 32px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0 0 4px; font-size:11.5px; color:#94a3b8;">
                This is an automated invitation generated by TalentAssess AI on behalf of {organization_name}.
              </p>
              <p style="margin:0; font-size:11.5px; color:#94a3b8;">
                Please do not reply directly to this automated email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return subject, text_body, html_body

    @staticmethod
    def send_assessment_invitation(
        candidate_name: str,
        candidate_email: str,
        invitation_link: str,
        job_title: str = "Role Assessment",
        organization_name: str = "TalentAssess AI",
        num_questions: int = 5,
        duration_minutes: int = 15,
        difficulty: str = "Standard",
        candidate_login_email: Optional[str] = None,
        candidate_password: Optional[str] = None,
        portal_link: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Sends a rich HTML and plain-text assessment invitation email to the candidate.
        Returns (success: bool, message_or_error: str).
        """
        config = EmailService.get_smtp_config()

        if not EmailService.is_configured():
            return False, "SMTP is not configured in backend/.env (SMTP_SERVER / credentials missing)."

        if not candidate_email or "@" not in candidate_email or candidate_email.endswith("@example.com"):
            return False, f"Invalid or placeholder email address: '{candidate_email}'"

        try:
            subject, text_body, html_body = EmailService.generate_email_content(
                candidate_name=candidate_name,
                invitation_link=invitation_link,
                job_title=job_title,
                organization_name=organization_name,
                num_questions=num_questions,
                duration_minutes=duration_minutes,
                difficulty=difficulty,
                candidate_login_email=candidate_login_email,
                candidate_password=candidate_password,
                portal_link=portal_link
            )

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{config['from_name']} <{config['from_email']}>"
            msg["To"] = f"{candidate_name} <{candidate_email}>"
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Connect to SMTP server
            if config["use_ssl"] or config["port"] == 465:
                server = smtplib.SMTP_SSL(config["server"], config["port"], timeout=15)
            else:
                server = smtplib.SMTP(config["server"], config["port"], timeout=15)

            server.ehlo()
            if config["use_tls"] and not (config["use_ssl"] or config["port"] == 465):
                server.starttls()
                server.ehlo()

            if config["user"] and config["password"]:
                try:
                    server.login(config["user"], config["password"])
                except smtplib.SMTPAuthenticationError:
                    if " " in config["password"]:
                        server.login(config["user"], config["password"].replace(" ", ""))
                    else:
                        raise

            server.send_message(msg)
            server.quit()

            return True, f"Email successfully dispatched to {candidate_email}"

        except Exception as e:
            return False, f"SMTP delivery failed: {str(e)}"

    @staticmethod
    def send_recruiter_submission_notification(
        recruiter_email: str,
        recruiter_name: str,
        candidate_name: str,
        candidate_email: str,
        job_title: str,
        organization_name: str,
        score_percentage: float,
        total_score: float,
        max_score: float,
        job_knowledge_match: float = 0.0,
        communication_score: float = 0.0,
        report_id: int = None,
        report_link: str = None,
        cc_recruiter_email: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Sends an automated notification email to the recruiter when a candidate submits their assessment.
        Returns (success: bool, message_or_error: str).
        """
        config = EmailService.get_smtp_config()

        if not EmailService.is_configured():
            return False, "SMTP is not configured in backend/.env."

        if not recruiter_email or "@" not in recruiter_email or recruiter_email.endswith("@example.com"):
            return False, f"Invalid or missing recruiter email: '{recruiter_email}'"

        try:
            frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
            if not report_link and report_id:
                report_link = f"{frontend_url}/?view_report={report_id}"
            elif not report_link:
                report_link = f"{frontend_url}"

            subject = f"🔔 Assessment Submitted: {candidate_name} completed {job_title} ({score_percentage}%)"

            # Plain-text version
            text_body = f"""Dear {recruiter_name or 'Recruiter'},

A candidate has completed and submitted their online assessment on TalentAssess AI.

CANDIDATE & ROLE SUMMARY:
• Candidate: {candidate_name} ({candidate_email})
• Position: {job_title}
• Organization: {organization_name}
• Overall Score: {score_percentage}% ({total_score}/{max_score} Marks)
• Job Knowledge Match: {job_knowledge_match}%
• Communication Score: {communication_score}%

VIEW COMPLETE EVALUATION REPORT:
{report_link}

The candidate's detailed answers, AI subjective evaluations, and employer criteria checks are available immediately in your TalentAssess AI portal.

Best regards,
TalentAssess AI Notification System
{organization_name}
"""

            # Score color coding
            score_color = "#10b981" if score_percentage >= 75 else ("#f59e0b" if score_percentage >= 50 else "#ef4444")
            score_bg = "#ecfdf5" if score_percentage >= 75 else ("#fffbeb" if score_percentage >= 50 else "#fef2f2")

            # HTML version
            html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Submitted Notification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color:#1e293b; line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fb; padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(19, 34, 71, 0.08); max-width:600px; width:100%;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color:#132247; padding:28px 32px; text-align:left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700; letter-spacing:-0.3px;">
                      {organization_name}
                    </h1>
                    <p style="color:#9aa5b8; margin:4px 0 0; font-size:13px;">
                      Candidate Assessment Portal · TalentAssess AI Notification
                    </p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block; background-color:#10b981; color:#ffffff; font-size:11px; font-weight:700; padding:5px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">
                      ✓ Submitted
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <h2 style="color:#0f172a; margin:0 0 12px; font-size:20px; font-weight:700;">
                Candidate Assessment Submission Alert
              </h2>
              
              <p style="margin:0 0 20px; font-size:15px; color:#334155;">
                Hello <strong>{recruiter_name or 'Recruiter'}</strong>,
              </p>
              
              <p style="margin:0 0 24px; font-size:14.5px; color:#334155;">
                <strong>{candidate_name}</strong> has just completed and submitted their candidate assessment for the <strong>{job_title}</strong> position. The evaluation report has been generated automatically.
              </p>

              <!-- Candidate Info Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding:5px 0; font-size:13.5px; color:#64748b;">
                          👤 <strong>Candidate:</strong> <span style="color:#0f172a;">{candidate_name}</span>
                        </td>
                        <td width="50%" style="padding:5px 0; font-size:13.5px; color:#64748b;">
                          ✉ <strong>Email:</strong> <span style="color:#0f172a;">{candidate_email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:5px 0; font-size:13.5px; color:#64748b;">
                          📋 <strong>Position:</strong> <span style="color:#0f172a;">{job_title}</span>
                        </td>
                        <td width="50%" style="padding:5px 0; font-size:13.5px; color:#64748b;">
                          🏢 <strong>Organization:</strong> <span style="color:#0f172a;">{organization_name}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Score KPI Cards Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td width="32%" style="background-color:{score_bg}; border:1px solid {score_color}33; border-radius:10px; padding:16px 12px; text-align:center;">
                    <span style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">
                      Overall Score
                    </span>
                    <span style="display:block; font-size:26px; font-weight:800; color:{score_color}; line-height:1.1;">
                      {score_percentage}%
                    </span>
                    <span style="display:block; font-size:11.5px; color:#64748b; margin-top:4px;">
                      {total_score}/{max_score} Marks
                    </span>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:16px 12px; text-align:center;">
                    <span style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">
                      Job Knowledge
                    </span>
                    <span style="display:block; font-size:26px; font-weight:800; color:#1e40af; line-height:1.1;">
                      {job_knowledge_match}%
                    </span>
                    <span style="display:block; font-size:11.5px; color:#64748b; margin-top:4px;">
                      MCQ & Scenario Match
                    </span>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color:#faf5ff; border:1px solid #e9d5ff; border-radius:10px; padding:16px 12px; text-align:center;">
                    <span style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">
                      Communication
                    </span>
                    <span style="display:block; font-size:26px; font-weight:800; color:#7e22ce; line-height:1.1;">
                      {communication_score}%
                    </span>
                    <span style="display:block; font-size:11.5px; color:#64748b; margin-top:4px;">
                      Clarity & Grammar
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 28px; text-align:center;">
                <tr>
                  <td align="center">
                    <a href="{report_link}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #132247 0%, #1e3a8a 100%); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:13px 32px; border-radius:8px; box-shadow:0 4px 14px rgba(19, 34, 71, 0.35);">
                      View Candidate Evaluation Report →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <p style="margin:0 0 6px; font-size:12px; color:#64748b;">
                Direct report URL:
              </p>
              <p style="margin:0 0 24px; font-size:12px; word-break:break-all; color:#0077b5;">
                <a href="{report_link}" style="color:#0077b5; text-decoration:underline;">{report_link}</a>
              </p>

              <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;">

              <p style="margin:0; font-size:13px; color:#64748b;">
                TalentAssess AI Notification Service · Automated real-time candidate assessment tracking
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:18px 32px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:11.5px; color:#94a3b8;">
                This automated alert was dispatched because a candidate completed an assessment belonging to your recruiter account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{config['from_name']} <{config['from_email']}>"
            msg["To"] = f"{recruiter_name or 'Recruiter'} <{recruiter_email}>"

            recipients = [recruiter_email]
            target_cc = cc_recruiter_email or config.get("from_email")
            if target_cc and "@" in target_cc and target_cc.lower() != recruiter_email.lower():
                msg["Cc"] = target_cc
                recipients.append(target_cc)

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Connect to SMTP server
            if config["use_ssl"] or config["port"] == 465:
                server = smtplib.SMTP_SSL(config["server"], config["port"], timeout=15)
            else:
                server = smtplib.SMTP(config["server"], config["port"], timeout=15)

            server.ehlo()
            if config["use_tls"] and not (config["use_ssl"] or config["port"] == 465):
                server.starttls()
                server.ehlo()

            if config["user"] and config["password"]:
                try:
                    server.login(config["user"], config["password"])
                except smtplib.SMTPAuthenticationError:
                    if " " in config["password"]:
                        server.login(config["user"], config["password"].replace(" ", ""))
                    else:
                        raise

            server.send_message(msg, to_addrs=recipients)
            server.quit()

            return True, f"Recruiter notification email successfully dispatched to {', '.join(recipients)}"

        except Exception as e:
            return False, f"Recruiter notification email failed: {str(e)}"

    @staticmethod
    def send_candidate_submission_confirmation(
        candidate_email: str,
        candidate_name: str,
        job_title: str = "Role Assessment",
        organization_name: str = "TalentAssess AI",
        score_percentage: Optional[float] = None,
        report_id: Optional[int] = None,
        portal_url: str = "http://localhost:3000"
    ) -> Tuple[bool, str]:
        """
        Sends an automated confirmation email to the candidate acknowledging
        their assessment submission and providing portal link to check results.
        """
        config = EmailService.get_smtp_config()
        if not EmailService.is_configured():
            return False, "SMTP is not configured in backend/.env."
        if not candidate_email or "@" not in candidate_email or candidate_email.endswith("@example.com"):
            return False, f"Invalid candidate email: '{candidate_email}'"

        try:
            subject = f"Assessment Submitted Successfully - {job_title} ({organization_name})"
            from_addr = formataddr((config["from_name"], config["from_email"]))

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_addr
            msg["To"] = candidate_email
            msg["Date"] = formatdate(localtime=True)
            msg["Message-ID"] = make_msgid(domain=config.get("server") or "talentassess.ai")

            score_text = f"Overall Score: {score_percentage}%\n" if score_percentage is not None else ""

            plain_text = (
                f"Hello {candidate_name},\n\n"
                f"Thank you for completing your evaluation assessment for the {job_title} position at {organization_name}.\n\n"
                f"Your assessment has been successfully submitted and evaluated.\n"
                f"{score_text}\n"
                f"You can log into your Candidate Portal at {portal_url} to review your profile and status.\n\n"
                f"Best regards,\n"
                f"Recruitment Team\n"
                f"{organization_name}"
            )

            html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 24px 28px;">
      <h2 style="margin: 0; font-size: 20px;">✓ Assessment Submitted Successfully</h2>
      <p style="margin: 6px 0 0; font-size: 13.5px; opacity: 0.9;">{organization_name} · {job_title}</p>
    </div>
    <div style="padding: 26px 28px; color: #334155; font-size: 14.5px; line-height: 1.6;">
      <p style="margin-top: 0;">Dear <strong>{candidate_name}</strong>,</p>
      <p>Thank you for completing your assessment for the <strong>{job_title}</strong> role. Your answers have been recorded and evaluated by our assessment engine.</p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 13px; color: #166534; font-weight: 700; margin-bottom: 6px;">SUBMISSION RECEIPT</div>
        <div style="font-size: 13.5px; color: #1e293b;">• <strong>Role:</strong> {job_title}</div>
        <div style="font-size: 13.5px; color: #1e293b;">• <strong>Organization:</strong> {organization_name}</div>
        <div style="font-size: 13.5px; color: #1e293b;">• <strong>Status:</strong> Completed & Evaluated</div>
        {f'<div style="font-size: 13.5px; color: #1e293b;">• <strong>Overall Score:</strong> {score_percentage}%</div>' if score_percentage is not None else ''}
      </div>
      <p>You can access your candidate account to view your evaluation report and status:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{portal_url}" style="background: #059669; color: #ffffff; padding: 11px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
          Go to Candidate Portal →
        </a>
      </div>
      <p style="font-size: 12.5px; color: #64748b; margin-bottom: 0;">
        If you have any questions, please contact the recruiting team at {organization_name}.
      </p>
    </div>
  </div>
</body>
</html>"""

            msg.attach(MIMEText(plain_text, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if config["use_ssl"]:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(config["server"], config["port"], timeout=20, context=context)
            else:
                server = smtplib.SMTP(config["server"], config["port"], timeout=20)
                if config["use_tls"]:
                    server.starttls()

            if config["user"] and config["password"]:
                server.login(config["user"], config["password"].strip())

            server.send_message(msg, to_addrs=[candidate_email])
            server.quit()
            return True, f"Candidate confirmation email successfully sent to {candidate_email}"
        except Exception as e:
            return False, f"Candidate confirmation email failed: {str(e)}"

    @staticmethod
    def send_account_creation_email(
        user_email: str,
        user_name: str,
        role: str,
        temporary_password: str,
        organization_name: str = "TalentAssess AI"
    ) -> Tuple[bool, str]:
        """
        Sends an automated welcome email with account credentials, temporary password,
        and instructions to reset password on first login.
        """
        config = EmailService.get_smtp_config()

        if not EmailService.is_configured():
            return False, "SMTP is not configured in backend/.env."

        if not user_email or "@" not in user_email or user_email.endswith("@example.com"):
            return False, f"Invalid or missing user email: '{user_email}'"

        try:
            frontend_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
            role_display = {
                "admin": "Administrator",
                "account_manager": "Account Manager",
                "hr": "HR Manager",
                "recruiter": "Recruiter"
            }.get(role.lower(), role.title())

            subject = f"🔐 Your TalentAssess AI Account & Temporary Password ({role_display})"

            text_body = f"""Dear {user_name or 'User'},

Welcome to TalentAssess AI! Your account has been successfully created.

ACCOUNT CREDENTIALS:
• Portal URL: {frontend_url}
• Login Email: {user_email}
• Assigned Role: {role_display}
• Temporary Password: {temporary_password}

MANDATORY FIRST-TIME ACTION:
For account security, your temporary password must be reset upon first login.
1. Open the portal: {frontend_url}
2. Enter your email ({user_email}) and temporary password.
3. You will be prompted immediately to set a permanent secure password.

Best regards,
TalentAssess AI Administration Team
{organization_name}
"""

            html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Created - TalentAssess AI</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9; padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08); border:1px solid #e2e8f0;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding:32px 32px 28px; text-align:center;">
              <h1 style="margin:0 0 6px; font-size:24px; font-weight:700; color:#ffffff; letter-spacing:-0.3px;">
                TalentAssess AI
              </h1>
              <p style="margin:0; font-size:13px; color:#94a3b8; font-weight:500;">
                Enterprise Talent Assessment Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <div style="display:inline-block; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:20px; padding:4px 14px; font-size:12px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:16px;">
                ✨ Account Created · {role_display}
              </div>

              <h2 style="margin:0 0 14px; font-size:20px; font-weight:700; color:#0f172a;">
                Welcome, {user_name or 'Team Member'}!
              </h2>

              <p style="margin:0 0 22px; font-size:14.5px; line-height:1.6; color:#475569;">
                An account has been created for you on <strong>TalentAssess AI</strong> with the <strong>{role_display}</strong> role. Use the temporary credentials below to log in.
              </p>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0; font-size:13.5px; color:#64748b;" width="40%">
                          👤 <strong>Login Email:</strong>
                        </td>
                        <td style="padding:6px 0; font-size:14px; font-weight:600; color:#0f172a;">
                          {user_email}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13.5px; color:#64748b;">
                          🏷 <strong>Assigned Role:</strong>
                        </td>
                        <td style="padding:6px 0; font-size:14px; font-weight:700; color:#0284c7;">
                          {role_display}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0; font-size:13.5px; color:#64748b;">
                          🔑 <strong>Temporary Password:</strong>
                        </td>
                        <td style="padding:6px 0; font-size:15px; font-weight:800; color:#dc2626; font-family:Consolas, monospace; letter-spacing:0.5px;">
                          {temporary_password}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px 18px; margin-bottom:28px;">
                <div style="font-weight:700; color:#b45309; font-size:13.5px; margin-bottom:4px;">
                  ⚠️ Mandatory First-Time Action: Password Reset
                </div>
                <div style="font-size:13px; color:#92400e; line-height:1.5;">
                  For security, your temporary password must be reset immediately upon your first login. You will be prompted to choose a permanent secure password.
                </div>
              </div>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="{frontend_url}"
                       style="display:inline-block; background-color:#0284c7; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 36px; border-radius:8px; box-shadow:0 2px 8px rgba(2,132,199,0.35);">
                      Log In to TalentAssess AI →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:13px; color:#64748b; text-align:center;">
                If the button above does not work, access directly via: <br>
                <a href="{frontend_url}" style="color:#0284c7;">{frontend_url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:18px 32px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="margin:0; font-size:11.5px; color:#94a3b8;">
                This automated email was sent by TalentAssess AI on behalf of {organization_name}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{config['from_name']} <{config['from_email']}>"
            msg["To"] = f"{user_name or 'User'} <{user_email}>"

            # Strictly restrict account creation email to the created account's email only (no CCs)
            recipients = [user_email]

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            if config["use_ssl"] or config["port"] == 465:
                server = smtplib.SMTP_SSL(config["server"], config["port"], timeout=15)
            else:
                server = smtplib.SMTP(config["server"], config["port"], timeout=15)

            server.ehlo()
            if config["use_tls"] and not (config["use_ssl"] or config["port"] == 465):
                server.starttls()
                server.ehlo()

            if config["user"] and config["password"]:
                try:
                    server.login(config["user"], config["password"])
                except smtplib.SMTPAuthenticationError:
                    if " " in config["password"]:
                        server.login(config["user"], config["password"].replace(" ", ""))
                    else:
                        raise

            server.send_message(msg, to_addrs=recipients)
            server.quit()

            return True, f"Account creation email successfully dispatched to {', '.join(recipients)}"

        except Exception as e:
            return False, f"Account creation email failed: {str(e)}"


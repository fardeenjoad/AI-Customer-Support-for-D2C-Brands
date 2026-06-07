import resend
import boto3
from typing import Optional
from anyio.to_thread import run_sync
from app.core.config import settings
from app.repositories.user_repo import UserRepository
from app.repositories.brand_repo import BrandRepository
from app.repositories.ticket_repo import TicketRepository

class EmailService:
    """
    Service class handling HTML email notifications using the Resend API.
    Provides fallback to log printing if no API key is configured.
    """
    def __init__(
        self,
        user_repo: UserRepository,
        brand_repo: BrandRepository,
        ticket_repo: Optional[TicketRepository] = None
    ):
        self.user_repo = user_repo
        self.brand_repo = brand_repo
        self.ticket_repo = ticket_repo or TicketRepository()
        
        # Configure Resend fallback
        self.api_key = settings.RESEND_API_KEY
        if self.api_key and self.api_key != "re_mock_api_key":
            resend.api_key = self.api_key
            self.client_active = True
        else:
            self.client_active = False

        # Configure AWS SES
        self.ses_sender = settings.AWS_SES_SENDER_EMAIL
        self.ses_active = False
        if (
            settings.AWS_ACCESS_KEY_ID 
            and settings.AWS_SECRET_ACCESS_KEY 
            and self.ses_sender 
            and self.ses_sender != "support@yourdomain.com"
        ):
            try:
                self.ses_client = boto3.client(
                    "ses",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
                self.ses_active = True
            except Exception as e:
                print(f"[EMAIL SERVICE] Failed to init AWS SES client: {e}")

    def _get_base_html(self, title: str, headline: str, message_body: str, accent_color: str = "#4f46e5") -> str:
        """
        Generates a premium, responsive HTML template wrapper for support emails.
        """
        # Convert newlines to HTML line breaks
        formatted_body = message_body.replace("\n", "<br>")
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f3f4f6;
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                }}
                .container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border: 1px solid #e5e7eb;
                }}
                .header {{
                    background-color: {accent_color};
                    padding: 32px 24px;
                    text-align: center;
                    color: #ffffff;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.025em;
                }}
                .content {{
                    padding: 40px 32px;
                    color: #1f2937;
                    line-height: 1.6;
                }}
                .content p {{
                    margin: 0 0 20px 0;
                    font-size: 16px;
                }}
                .ticket-box {{
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 24px 0;
                    font-family: monospace;
                    font-size: 14px;
                    color: #4b5563;
                }}
                .footer {{
                    background-color: #f9fafb;
                    padding: 24px;
                    text-align: center;
                    font-size: 12px;
                    color: #9ca3af;
                    border-top: 1px solid #e5e7eb;
                }}
                .btn {{
                    display: inline-block;
                    background-color: {accent_color};
                    color: #ffffff !important;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    margin-top: 16px;
                    font-size: 15px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{headline}</h1>
                </div>
                <div class="content">
                    {formatted_body}
                </div>
                <div class="footer">
                    This is an automated notification from ResolveIQ Customer Support.<br>
                    &copy; 2026 ResolveIQ. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        """

    async def _send_resend_email(self, to_email: str, subject: str, html_body: str):
        """
        Dispatches HTML email via AWS SES, Resend API, or prints formatted layout to stdout.
        """
        if self.ses_active:
            def _call_ses():
                self.ses_client.send_email(
                    Source=self.ses_sender,
                    Destination={
                        'ToAddresses': [to_email]
                    },
                    Message={
                        'Subject': {
                            'Data': subject,
                            'Charset': 'UTF-8'
                        },
                        'Body': {
                            'Html': {
                                'Data': html_body,
                                'Charset': 'UTF-8'
                            }
                        }
                    }
                )
            try:
                await run_sync(_call_ses)
                print(f"[EMAIL SERVICE] Email successfully sent to {to_email} via AWS SES.")
                return
            except Exception as e:
                print(f"[EMAIL SERVICE ERROR] AWS SES failed to send email to {to_email}: {e}. Trying Resend fallback.")

        # Fallback to Resend
        def _call_resend():
            resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": to_email,
                "subject": subject,
                "html": html_body
            })

        if self.client_active:
            try:
                await run_sync(_call_resend)
                print(f"[EMAIL SERVICE] Email successfully sent to {to_email} via Resend.")
                return
            except Exception as e:
                print(f"[EMAIL SERVICE ERROR] Resend failed to send email to {to_email}: {e}")

        # Fallback to mock log printing
        print(f"\n=================== [MOCK HTML EMAIL SENT] ===================")
        print(f"To:      {to_email}")
        print(f"Subject: {subject}")
        print(f"HTML Content preview (Headline & Body):")
        print(f"Subject: {subject}")
        print(f"==============================================================\n")

    async def send_ticket_created(self, customer_email: str, ticket_id: str):
        """
        Dispatches ticket creation HTML notification email.
        """
        # Fetch ticket details
        ticket = await self.ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            return
            
        brand_id = ticket.get("brand_id")
        brand = await self.brand_repo.get_brand_by_id(brand_id)
        brand_name = brand.get("brand_name", "EcoStyle") if brand else "EcoStyle"
        subject_text = ticket.get("subject", "Support Ticket")

        # Formatting template body
        customer_name = customer_email.split("@")[0]
        headline = f"Ticket Created - #{ticket_id}"
        email_subject = f"[{brand_name}] Support Ticket Created - #{ticket_id}"

        body = (
            f"Hi {customer_name},\n\n"
            f"Thank you for contacting support. We have successfully registered your support request for **{brand_name}**.\n\n"
            f"Our team has been notified and is currently reviewing your ticket. You will receive updates here as we make progress."
        )
        
        # Inject dynamic ticket card structure into body HTML
        body += f"""
        <div class="ticket-box">
            <strong>Ticket ID:</strong> {ticket_id}<br>
            <strong>Subject:</strong> {subject_text}<br>
            <strong>Status:</strong> Open<br>
            <strong>Priority:</strong> {ticket.get("priority", "low").capitalize()}
        </div>
        """

        html_content = self._get_base_html(email_subject, headline, body, accent_color="#4f46e5")
        await self._send_resend_email(customer_email, email_subject, html_content)

    async def send_ticket_resolved(self, customer_email: str, ticket_id: str):
        """
        Dispatches ticket resolution HTML email containing rating link.
        """
        # Fetch ticket details
        ticket = await self.ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            return
            
        brand_id = ticket.get("brand_id")
        brand = await self.brand_repo.get_brand_by_id(brand_id)
        brand_name = brand.get("brand_name", "EcoStyle") if brand else "EcoStyle"

        customer_name = customer_email.split("@")[0]
        headline = "Support Issue Resolved"
        email_subject = f"[{brand_name}] Support Ticket Resolved - #{ticket_id}"

        feedback_url = f"http://localhost:8000/tickets/{ticket_id}/feedback"

        body = (
            f"Hi {customer_name},\n\n"
            f"We are pleased to inform you that your support ticket **#{ticket_id}** has been resolved by our support team.\n\n"
            f"Please take a brief moment to rate your experience and provide feedback. Click the button below to rate us:"
        )

        body += f"""
        <div style="text-align: center;">
            <a href="{feedback_url}" class="btn">Rate Your Experience</a>
        </div>
        <p style="margin-top: 24px; font-size: 13px; color: #6b7280; text-align: center;">
            If you cannot click the button, copy and paste this URL into your browser:<br>
            <a href="{feedback_url}" style="color: #4f46e5;">{feedback_url}</a>
        </p>
        """

        html_content = self._get_base_html(email_subject, headline, body, accent_color="#10b981") # green for resolution
        await self._send_resend_email(customer_email, email_subject, html_content)

    async def send_agent_assigned(self, agent_email: str, ticket_id: str):
        """
        Dispatches delegation HTML email to the assigned agent.
        """
        # Fetch ticket details
        ticket = await self.ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            return
            
        brand_id = ticket.get("brand_id")
        brand = await self.brand_repo.get_brand_by_id(brand_id)
        brand_name = brand.get("brand_name", "EcoStyle") if brand else "EcoStyle"
        subject_text = ticket.get("subject", "Support Ticket")

        headline = "New Ticket Assigned"
        email_subject = f"[ResolveIQ] Support Ticket Assigned - #{ticket_id}"

        management_url = f"http://localhost:8000/admin/tickets/{ticket_id}"

        body = (
            f"Hi Support Team Member,\n\n"
            f"A new support ticket has been assigned to you. Please check the ticket details and begin resolution at your earliest convenience."
        )

        body += f"""
        <div class="ticket-box">
            <strong>Ticket ID:</strong> {ticket_id}<br>
            <strong>Brand:</strong> {brand_name}<br>
            <strong>Subject:</strong> {subject_text}<br>
            <strong>Priority:</strong> {ticket.get("priority", "low").capitalize()}
        </div>
        <div style="text-align: center;">
            <a href="{management_url}" class="btn">View and Manage Ticket</a>
        </div>
        """

        html_content = self._get_base_html(email_subject, headline, body, accent_color="#f59e0b") # amber for action assignment
        await self._send_resend_email(agent_email, email_subject, html_content)

    async def send_stale_ticket_alert(self, agent_email: str, ticket_id: str):
        """
        Sends an HTML email alert to the assigned agent for a ticket that has been unresolved for >24 hours.
        """
        ticket = await self.ticket_repo.get_ticket_by_id(ticket_id)
        if not ticket:
            return

        subject_text = ticket.get("subject", "Support Ticket")
        headline = "Overdue Ticket Warning"
        email_subject = f"[ResolveIQ STALE ALERT] Overdue Ticket - #{ticket_id}"
        management_url = f"http://localhost:8000/admin/tickets/{ticket_id}"

        body = (
            f"Hi Support Team Member,\n\n"
            f"This is an automated alert warning you that ticket **#{ticket_id}** assigned to you has been open "
            f"or in-progress for **more than 24 hours** without being resolved. Please review and resolve it."
        )

        body += f"""
        <div class="ticket-box">
            <strong>Ticket ID:</strong> {ticket_id}<br>
            <strong>Subject:</strong> {subject_text}<br>
            <strong>Status:</strong> {ticket.get("status", "open")}<br>
            <strong>Priority:</strong> {ticket.get("priority", "low").capitalize()}
        </div>
        <div style="text-align: center;">
            <a href="{management_url}" class="btn">Resolve Ticket</a>
        </div>
        """

        html_content = self._get_base_html(email_subject, headline, body, accent_color="#ef4444") # red for stale alert
        await self._send_resend_email(agent_email, email_subject, html_content)

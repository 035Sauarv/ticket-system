import smtplib
from email.mime.text import MIMEText

def send_email(to_email: str, subject: str, body: str):

    sender_email = "sauravdeshmane095@gmail.com"

    # ⚠️ Use Gmail App Password here
    sender_password = "enjdczcuisosmiro"

    msg = MIMEText(body, "html")

    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:

        server.starttls()

        server.login(sender_email, sender_password)

        server.sendmail(
            sender_email,
            to_email,
            msg.as_string()
        )

    print("EMAIL SENT")
"""
File: agent/mailbox_listener.py
Description: QQ 邮箱与 Google 邮箱 IMAP 自动化收取与邮件解析
"""
import email
import imaplib
from email.header import decode_header
from typing import Any


class DualMailboxListener:
    """
    整合 QQ 邮箱与 Google 邮箱的双信箱监听器
    """
    def __init__(self, qq_user: str, qq_auth_code: str, gmail_user: str, gmail_app_pwd: str):
        self.configs = {
            "qq": {
                "host": "imap.qq.com",
                "port": 993,
                "user": qq_user,
                "password": qq_auth_code # QQ 邮箱网页端生成的专属授权码
            },
            "gmail": {
                "host": "imap.gmail.com",
                "port": 993,
                "user": gmail_user,
                "password": gmail_app_pwd # Google 账号两步验证下的应用专用密码
            }
        }

    def fetch_latest_unseen(self, mailbox: str = "qq") -> dict[str, Any] | None:
        """从指定邮箱拉取最新一封未读邮件"""
        cfg = self.configs.get(mailbox)
        if not cfg or not cfg["user"]:
            return None

        try:
            conn = imaplib.IMAP4_SSL(cfg["host"], cfg["port"])
            conn.login(cfg["user"], cfg["password"])
            conn.select("INBOX")

            # 搜索未读邮件 (UNSEEN)
            status, response = conn.search(None, "UNSEEN")
            mail_ids = response[0].split()
            if not mail_ids:
                conn.logout()
                return None

            latest_id = mail_ids[-1]
            status, data = conn.fetch(latest_id, "(RFC822)")
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject = self._decode_str(msg.get("Subject", "无主题"))
            sender = self._decode_str(msg.get("From", ""))
            body = self._extract_body(msg)

            conn.logout()
            return {
                "mailbox": mailbox,
                "sender": sender,
                "subject": subject,
                "content": body,
                "msg_id": latest_id.decode()
            }
        except Exception as e:
            print(f"[IMAP Error on {mailbox}]: {e}")
            return None

    def mark_as_read(self, mailbox: str, msg_id: str):
        """将邮件标记为已读 (用于 ignore 或已处理归档)"""
        cfg = self.configs.get(mailbox)
        try:
            conn = imaplib.IMAP4_SSL(cfg["host"], cfg["port"])
            conn.login(cfg["user"], cfg["password"])
            conn.select("INBOX")
            conn.store(msg_id.encode(), "+FLAGS", "\\Seen")
            conn.logout()
        except Exception as e:
            print(f"[Mark Seen Error]: {e}")

    def _decode_str(self, header_val: str) -> str:
        decoded_list = decode_header(header_val)
        res = []
        for content, enc in decoded_list:
            if isinstance(content, bytes):
                res.append(content.decode(enc or "utf-8", errors="ignore"))
            else:
                res.append(str(content))
        return "".join(res)

    def _extract_body(self, msg) -> str:
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    return part.get_payload(decode=True).decode("utf-8", errors="ignore")
            # fallback to html
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    return part.get_payload(decode=True).decode("utf-8", errors="ignore")
        return msg.get_payload(decode=True).decode("utf-8", errors="ignore")

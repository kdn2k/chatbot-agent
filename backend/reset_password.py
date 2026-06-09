#!/usr/bin/env python3
"""
Chạy script này sau khi cài requirements.txt để set/reset password admin.

Usage:
    python reset_password.py                     # set password cho admin
    python reset_password.py --user admin --password MyPass123
"""
import sys
import argparse
import asyncio
import bcrypt

# Load .env nếu có
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://webchat_user:webchat_pass@localhost:5432/webchat"
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(12)).decode("utf-8")


async def reset(username: str, password: str):
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    from sqlalchemy import text

    engine = create_async_engine(DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession)

    hashed = hash_password(password)

    async with Session() as session:
        result = await session.execute(
            text("SELECT id FROM users WHERE username = :u"), {"u": username}
        )
        row = result.fetchone()

        if row:
            await session.execute(
                text("UPDATE users SET hashed_password = :h WHERE username = :u"),
                {"h": hashed, "u": username},
            )
            await session.commit()
            print(f"✓ Password updated for user '{username}'")
        else:
            await session.execute(
                text("""
                    INSERT INTO users (username, email, full_name, hashed_password, is_admin)
                    VALUES (:u, :e, :f, :h, TRUE)
                """),
                {
                    "u": username,
                    "e": f"{username}@example.com",
                    "f": username.capitalize(),
                    "h": hashed,
                },
            )
            await session.commit()
            print(f"✓ User '{username}' created with given password")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset user password")
    parser.add_argument("--user", default="admin", help="Username (default: admin)")
    parser.add_argument("--password", default=None, help="New password (prompted if omitted)")
    args = parser.parse_args()

    if args.password:
        password = args.password
    else:
        import getpass
        password = getpass.getpass(f"New password for '{args.user}': ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("✗ Passwords do not match")
            sys.exit(1)

    if len(password) < 6:
        print("✗ Password must be at least 6 characters")
        sys.exit(1)

    asyncio.run(reset(args.user, password))

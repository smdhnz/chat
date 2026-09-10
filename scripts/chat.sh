#!/bin/sh
# 一覧: ./scripts/chat.sh USER / 会話: ./scripts/chat.sh USER CHAT_ID
set -eu
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ] || [ -z "$1" ] || { [ "$#" -eq 2 ] && [ -z "$2" ]; }; then
  echo "使い方: $0 表示名またはDiscordユーザーID [チャットID]" >&2
  exit 2
fi
cd -- "$(dirname -- "$0")/.."
exec docker compose exec -T chat python3 - "$@" <<'PY'
import json
import os
from pathlib import Path
import sqlite3
import sys


def main():
    user = sys.argv[1]
    chat_id = sys.argv[2] if len(sys.argv) == 3 else None
    path = Path(os.environ.get("DATA_DIR", "").strip() or "data") / "chat.sqlite"
    with sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        db.execute("BEGIN")
        db.row_factory = sqlite3.Row
        users = db.execute(
            "SELECT id FROM users WHERE id = ? OR display_name = ?", (user, user)
        ).fetchall()
        if not users:
            sys.exit("指定した表示名またはDiscordユーザーIDのユーザーが見つかりません。")
        if len(users) > 1:
            sys.exit("同じ表示名のユーザーが複数います。DiscordユーザーIDで指定してください。")
        chats = db.execute("""
            SELECT c.id, c.title,
                strftime('%Y-%m-%d %H:%M', c.updated_at, '+9 hours') AS updated_at
            FROM conversations c
            WHERE (
                ((c.temporary = 1 OR c.project_id IS NULL) AND c.user_id = :uid)
                OR (c.temporary = 0 AND EXISTS (
                    SELECT 1 FROM projects p WHERE p.id = c.project_id
                    AND (p.user_id = :uid OR EXISTS (
                        SELECT 1 FROM project_members m
                        WHERE m.project_id = p.id AND m.user_id = :uid
                    ))
                ))
            ) AND (:id IS NULL OR c.id = :id)
            ORDER BY c.updated_at DESC, c.id
        """, {"uid": users[0]["id"], "id": chat_id}).fetchall()
        if chat_id is None:
            for chat in chats:
                title = " ".join(chat["title"].split())
                print(f'{chat["id"]}\t{chat["updated_at"]}\t{title}')
            return
        if not chats:
            sys.exit("チャットが存在しないか、指定ユーザーの閲覧対象外です。")
        lines = [f'# {" ".join(chats[0]["title"].split())}', "日時: 日本時間", ""]
        messages = db.execute("""
            SELECT e.kind, e.payload_json, c.user_id,
                strftime('%Y-%m-%d %H:%M', e.created_at, '+9 hours') AS time
            FROM conversation_entries e JOIN conversations c ON c.id = e.conversation_id
            WHERE e.conversation_id = ? AND e.kind IN ('user_message', 'assistant_message')
            ORDER BY e.sequence
        """, (chat_id,)).fetchall()
        for message in messages:
            payload = json.loads(message["payload_json"])
            content = payload["content"]
            text = "\n".join(block["text"] for block in content if block["type"] == "text")
            images = sum(block["type"] == "imageRef" for block in content)
            if message["kind"] == "assistant_message":
                if not text and not images:
                    continue
                speaker = "AI"
            else:
                author_id = payload.get("authorId") or message["user_id"]
                author = db.execute("SELECT username FROM users WHERE id = ?", (author_id,)).fetchone()
                speaker = f'ユーザー: {author["username"] if author else author_id}'
            lines.extend([f'## {message["time"]} / {speaker}', text or "（本文なし）"])
            if images:
                lines.append(f"［添付画像: {images}件］")
            lines.append("")
        if len(lines) == 3:
            lines.append("メッセージはありません。")
        print("\n".join(lines))


try:
    main()
except (sqlite3.Error, ValueError, KeyError, TypeError) as error:
    sys.exit(f"会話の読み取りに失敗しました: {error}")
PY

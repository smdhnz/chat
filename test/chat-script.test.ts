import { expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "../scripts/chat.sh");

test("SSH用スクリプトはユーザーの閲覧範囲だけを一覧・会話表示し、DBを変更しない", () => {
  const directory = mkdtempSync(join(tmpdir(), "chat-script-"));
  try {
    // Dockerの実行境界だけ置換し、シェルとPython・SQLiteは実行する。
    writeFileSync(
      join(directory, "docker"),
      '#!/bin/sh\n[ "$1 $2 $3 $4 $5" = "compose exec -T chat python3" ] || exit 99\nshift 5\nexec python3 "$@"\n',
      { mode: 0o755 },
    );
    const path = join(directory, "chat.sqlite");
    const db = new Database(path);
    db.exec(`
      CREATE TABLE users (id TEXT, username TEXT, display_name TEXT);
      CREATE TABLE projects (id TEXT, user_id TEXT);
      CREATE TABLE project_members (project_id TEXT, user_id TEXT);
      CREATE TABLE conversations (id TEXT, title TEXT, user_id TEXT, project_id TEXT, temporary INTEGER, updated_at TEXT);
      CREATE TABLE conversation_entries (conversation_id TEXT, sequence INTEGER, kind TEXT, payload_json TEXT, created_at TEXT);
      INSERT INTO users VALUES ('1', 'account-reader', 'reader'), ('2', 'other', 'other'), ('3', 'duplicate-a', 'duplicate'), ('4', 'duplicate-b', 'duplicate'), ('5', 'empty', 'empty');
      INSERT INTO projects VALUES ('shared', '2'), ('own', '1'), ('private', '2');
      INSERT INTO project_members VALUES ('shared', '1');
      INSERT INTO conversations VALUES
        ('personal', '同じタイトル', '1', NULL, 0, '2026-01-01T00:00:00Z'),
        ('shared-chat', '改行' || char(10) || 'タイトル', '2', 'shared', 0, '2026-01-02T00:00:00Z'),
        ('own-project', '同じタイトル', '2', 'own', 0, '2026-01-01T00:00:00Z'),
        ('my-temp', '一時', '1', 'shared', 1, '2026-01-01T00:00:00Z'),
        ('other-temp', '非公開', '2', 'shared', 1, '2026-01-01T00:00:00Z'),
        ('other-personal', '非公開', '2', NULL, 0, '2026-01-01T00:00:00Z'),
        ('other-project', '非公開', '1', 'private', 0, '2026-01-01T00:00:00Z');
    `);
    const insert = db.prepare(
      "INSERT INTO conversation_entries VALUES ('shared-chat', ?, ?, ?, '2026-01-02T00:00:00Z')",
    );
    insert.run(
      2,
      "assistant_message",
      JSON.stringify({
        content: [
          { type: "thinking", thinking: "秘密の推論" },
          { type: "text", text: "こんにちは" },
        ],
      }),
    );
    insert.run(
      1,
      "user_message",
      JSON.stringify({
        authorId: "1",
        content: [
          { type: "text", text: "質問\n続き" },
          { type: "imageRef", fileId: "image" },
        ],
      }),
    );
    insert.run(3, "tool_result", JSON.stringify({ content: [{ type: "text", text: "内部結果" }] }));
    insert.run(
      4,
      "assistant_message",
      JSON.stringify({ content: [{ type: "toolCall", name: "internal" }] }),
    );
    db.close();
    const before = readFileSync(path);
    const run = (args: string[], dataDir = directory) =>
      spawnSync("sh", [script, ...args], {
        cwd: tmpdir(),
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, DATA_DIR: dataDir },
        encoding: "utf8",
      });
    const list = run(["reader"]);
    expect(list.status).toBe(0);
    expect(list.stderr).toBe("");
    expect(
      list.stdout
        .trim()
        .split("\n")
        .map((line) => line.split("\t")[0]),
    ).toEqual(["shared-chat", "my-temp", "own-project", "personal"]);
    expect(list.stdout).toContain("2026-01-02 09:00\t改行 タイトル");
    expect(run(["1"]).stdout).toBe(list.stdout);
    expect(run(["account-reader"]).status).not.toBe(0);
    expect(run(["missing"]).stderr).toContain("見つかりません");
    expect(run(["duplicate"]).stderr).toContain("複数います");
    expect(run(["3"]).status).toBe(0);
    const detail = run(["reader", "shared-chat"]);
    expect(detail.status).toBe(0);
    expect(detail.stdout).toContain("ユーザー: account-reader\n質問\n続き\n［添付画像: 1件］");
    expect(detail.stdout).toContain("AI\nこんにちは");
    expect(detail.stdout.indexOf("質問")).toBeLessThan(detail.stdout.indexOf("こんにちは"));
    expect(detail.stdout).not.toMatch(/秘密の推論|内部結果|internal|本文なし/);
    expect(run(["reader", "personal"]).stdout).toContain("メッセージはありません");
    expect(run(["empty"]).stdout).toBe("");
    for (const args of [
      ["reader", "other-temp"],
      ["reader", "other-personal"],
      ["reader", "other-project"],
      ["reader", "missing"],
      ["missing"],
      ["duplicate"],
      ["' OR 1=1 --"],
      ["reader", "' OR 1=1 --"],
      [],
      [""],
      ["reader", ""],
      ["reader", "personal", "extra"],
    ]) {
      const result = run(args);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).not.toBe("");
    }
    expect(readFileSync(path)).toEqual(before);
    const missing = join(directory, "missing");
    mkdirSync(missing);
    expect(run(["reader"], missing).status).not.toBe(0);
    expect(() => readFileSync(join(missing, "chat.sqlite"))).toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

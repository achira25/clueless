import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Set DB_PATH to a persistent disk location when deploying (e.g. /var/data/clueless.db)
const file = process.env.DB_PATH || new URL("./data/clueless.db", import.meta.url).pathname;
fs.mkdirSync(path.dirname(file), { recursive: true });
export const db = new Database(file);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
create table if not exists users(
  id integer primary key, email text unique not null, name text,
  pass text not null, profile text default '{}', ctx text default '{}');
create table if not exists items(
  id text primary key, user_id integer not null references users(id) on delete cascade,
  data text not null, created integer default (strftime('%s','now')));
create index if not exists items_user on items(user_id);`);

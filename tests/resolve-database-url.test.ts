import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveDatabaseUrl } from "@/lib/prisma";

describe("resolveDatabaseUrl", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    process.env.MYSQL_HOST = "127.0.0.1";
    process.env.MYSQL_PORT = "3306";
    process.env.MYSQL_USER = "root";
    process.env.MYSQL_PASSWORD = "p@ss:word";
    process.env.MYSQL_DATABASE = "animal_adoption";
  });

  afterEach(() => {
    process.env.DATABASE_URL = saved.DATABASE_URL;
    process.env.MYSQL_HOST = saved.MYSQL_HOST;
    process.env.MYSQL_PORT = saved.MYSQL_PORT;
    process.env.MYSQL_USER = saved.MYSQL_USER;
    process.env.MYSQL_PASSWORD = saved.MYSQL_PASSWORD;
    process.env.MYSQL_DATABASE = saved.MYSQL_DATABASE;
  });

  it("uses DATABASE_URL when set", () => {
    process.env.DATABASE_URL = "mysql://a:b@h:1/db";
    expect(resolveDatabaseUrl()).toBe("mysql://a:b@h:1/db");
  });

  it("builds from MYSQL_* when DATABASE_URL missing", () => {
    expect(resolveDatabaseUrl()).toBe(
      "mysql://root:p%40ss%3Aword@127.0.0.1:3306/animal_adoption"
    );
  });
});

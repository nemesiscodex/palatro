import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./passwordUtils";

describe("passwordUtils", () => {
  it("verifies a hashed password", async () => {
    const hash = await hashPassword("super-secret-password");

    await expect(verifyPassword("super-secret-password", hash)).resolves.toBe(true);
  });

  it("rejects the wrong plaintext", async () => {
    const hash = await hashPassword("super-secret-password");

    await expect(verifyPassword("incorrect-password", hash)).resolves.toBe(false);
  });

  it("rejects invalid stored formats", async () => {
    await expect(verifyPassword("anything", "bad-format")).resolves.toBe(false);
  });
});

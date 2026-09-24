import { describe, expect, it } from "vitest";
import { passwordPolicy } from "./password-policy";

describe("passwordPolicy", () => {
  it("aceita uma senha com maiúscula, minúscula, número e símbolo", () => {
    expect(passwordPolicy.safeParse("SenhaForte@1").success).toBe(true);
  });

  it.each([
    ["curta", "Ab@1"],
    ["sem maiúscula", "senhaforte@1"],
    ["sem minúscula", "SENHAFORTE@1"],
    ["sem número", "SenhaForte@"],
    ["sem símbolo", "SenhaForte1"],
    ["longa demais", `A@1${"a".repeat(130)}`],
  ])("recusa senha %s", (_caso, senha) => {
    expect(passwordPolicy.safeParse(senha).success).toBe(false);
  });
});

import { test, expect, request } from "@playwright/test";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

test.describe("Auth code flows", () => {
  test("request signup code rejects invalid passwords", async () => {
    const api = await request.newContext();
    const res = await api.post(`${BASE_URL}/auth/register`, {
      data: { name: "Tester", email: "signup-test@example.com", password: "a", confirmPassword: "b" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("senhas");
  });

  test("request reset code requires existing user", async () => {
    const api = await request.newContext();
    const res = await api.post(`${BASE_URL}/auth/request-reset-code`, {
      data: { email: "not-exists@example.com" },
    });
    expect([404, 400]).toContain(res.status());
  });
});

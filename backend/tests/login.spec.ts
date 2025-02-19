import { test, expect, request } from '@playwright/test';

test.describe('Login', () => {
    let apiRequest = request.newContext({ baseURL: 'http://localhost:5000' });

    test('Deve autenticar usuário', async () => {
        const res = await (await apiRequest).post('/api/auth/login', {
            data: {
                email: "teste.teste1@hotmail.com",
                password: "123"
            },
            headers: { 'Content-Type': 'application/json' }
        });

        expect(res.status()).toBe(200);
        expect(await res.json()).toMatchObject({ token: expect.any(String), userId: expect.any(String) });
    });
});

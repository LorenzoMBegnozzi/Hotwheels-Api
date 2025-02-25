import { test, expect, request } from '@playwright/test';


test("login - emeil e senha", async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.getByPlaceholder('E-mail').fill('lorenzo.berg4@hotmail.com');
    await page.getByPlaceholder('Senha').fill('123');
    await page.waitForTimeout(1000)
    await page.getByText('Entrar').click();
    await expect(page.locator('.swal2-html-container')).toHaveText('Bem-vindo de volta!')
})


test("login - sem senha", async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.getByPlaceholder('E-mail').fill('lorenzo.berg4@hotmail.com');
    await page.waitForTimeout(1000)
    await page.getByText('Entrar').click();
    await expect(page.locator('.swal2-html-container')).toHaveText('Senha incorreta')
})

test("login - sem E-mail", async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.getByPlaceholder('Senha').fill('123');
    await page.waitForTimeout(1000)
    await page.getByText('Entrar').click();

    await expect(page.locator('.swal2-html-container')).toHaveText('Usuário não encontrado')
})

test("login - senha incorreta", async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.getByPlaceholder('E-mail').fill('lorenzo.berg4@hotmail.com');
    await page.getByPlaceholder('Senha').fill('dlskkfj');
    await page.waitForTimeout(1000)
    await page.getByText('Entrar').click();

    await expect(page.locator('.swal2-html-container')).toHaveText('Senha incorreta')
})




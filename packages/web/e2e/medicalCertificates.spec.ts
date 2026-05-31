import { test, expect } from '@playwright/test';

test.describe('MedicalCertificates E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    // estado en memoria simulando la bd para los test
    const mockMembers = [
      { id: 'mem-1', name: 'Juan Pérez', dni: '12345678', email: 'juan@test.com', birthdate: '1990-01-01', category: 'Pleno', status: 'Activo', created_at: new Date().toISOString() },
    ];

    const mockCertificates: any[] = [
      {
        id: 'cert-1',
        memberId: 'mem-1',
        issueDate: '2026-01-01T00:00:00.000Z',
        expiryDate: '2026-12-31T00:00:00.000Z',
        doctorLicense: 'LIC-001',
        isValidated: true,
        deletedAt: null,
      },
    ];

    // intercepta llamadas a la API de certificados medicos
    await page.route(/\/api\/v1\/certificados-medicos/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockCertificates }),
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newCert = {
          id: String(mockCertificates.length + 1),
          issueDate: new Date().toISOString(),
          isValidated: true,
          deletedAt: null,
          ...payload,
        };
        mockCertificates.push(newCert);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newCert }),
        });
      } else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      } else if (method === 'PUT') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockCertificates.findIndex((c) => String(c.id) === String(id));

        if (index > -1) {
          mockCertificates[index] = { ...mockCertificates[index], ...payload };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockCertificates[index] }),
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Certificado no encontrado' }) });
        }
      } else if (method === 'DELETE') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const index = mockCertificates.findIndex((c) => String(c.id) === String(id));
        if (index > -1) {
          mockCertificates.splice(index, 1);
        }
        await route.fulfill({ status: 200, body: JSON.stringify({ message: 'Certificado eliminado correctamente' }) });
      } else {
        await route.continue();
      }
    });

    // intercepta la llamada a socios para poblar el select del panel de creacion
    await page.route(/\/api\/v1\/socios/, async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockMembers }),
        });
      } else if (method === 'OPTIONS') {
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    // navega a la vista de certificados medicos
    await page.goto('/medical-certificates');
  });

  // se comprueba que la lista de certificados se renderiza
  // correctamente a partir de los datos mockeados de la API
  // se intercepta GET /api/v1/certificados-medicos para
  // devolver un certificado mockeado'
  // se navega a la vista y se verifica que los datos del certificado aparezcan en la tabla
  test('debe mostrar la lista de certificados cargada desde el network interceptado', async ({ page }) => {
    await expect(page.getByText('LIC-001')).toBeVisible();
    await expect(page.getByText('2026-12-31')).toBeVisible();
    await expect(page.getByText('Sí')).toBeVisible();
  });

  // se comprueba el flujo completo de creación de un certificado
  // desde el panel, incluyendo la selección de socio, llenado de fecha de
  // vencimiento y número de licencia, envio del formulario y actualizacion
  // de la tabla con el certificado nuevo
  // se limpia la lista mockeada para que la tabla empiece vacia
  // se abre panel agregar certificado, selecciona un
  // socio del dropdown, completa expiryDate y doctorLicense, click crear certificado y 
  // se verifica que el panel se cierre y el nuevo certificado aparezca en la tabla
  test('debe abrir el panel de creación y enviar el formulario', async ({ page }) => {
    // GET inicial devuelve vacio para este test (route handler ya tiene mockCertificates inicial)

    //click agregar certificado
    await page.locator('button:has-text("Agregar Certificado")').click();

    // verifico que el panel se abrio
    await expect(page.getByText('Nuevo Certificado Médico')).toBeVisible();

    // selecciono socio del dropdown
    await page.getByText('Seleccione un socio').click();
    await page.getByText('Juan Pérez - 12345678').click();

    // completo fecha de vencimiento
    await page.locator('input[type="date"]').fill('2027-06-01');

    // completo licencia
    await page.getByPlaceholder('Ej. 123456').fill('LIC-E2E');

    // envio formulario
    await page.getByRole('button', { name: 'Crear Certificado' }).click();

    // verifico que el panel se cerro
    await expect(page.getByRole('button', { name: 'Crear Certificado' })).toBeHidden();

    // verifico que el certificado nuevo aparece en la tabla
    await expect(page.getByText('LIC-E2E')).toBeVisible();
  });

  // se comprueba el flujo de eliminacion de un certificado
  // incluyendo la confirmación del navegador y la actualizacion
  // de la tabla al estado vacio
  // se configura el mock con un certificado existente, luego se acepta automaticamente
  // el confirm del navegador, se hace clic en el boton eliminar
  // se verifica que el certificado desaparezca y se muestre el mensaje 
  // "No se encontraron certificados"
  test('debe eliminar un certificado tras aceptar la alerta de confirmación y mostrar vacío', async ({ page }) => {
    // verifico que el certificado mockeado es visible
    await expect(page.getByText('LIC-001')).toBeVisible();

    // acepto el dialogo de confirmacion del navegador 
    page.on('dialog', (dialog) => dialog.accept());

    // click boton de eliminar 
    await page.getByRole('button', { name: /Eliminar certificado/i }).click();

    // verifico que la tabla se actualice y muestre el empty state
    await expect(page.getByText('No se encontraron certificados.')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('LIC-001')).toBeHidden();
  });
});
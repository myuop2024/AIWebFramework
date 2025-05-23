describe('Admin Polling Station Report Template Flow', () => {
  it('should allow admin to edit and save the polling station report template', () => {
    // Visit login page
    cy.visit('/login');
    // Fill in admin credentials (replace with real test credentials)
    cy.get('input[name="username"]').type('admin'); // or whatever your admin username is
    cy.get('input[name="password"]').type('password123'); // or whatever your admin password is
    cy.get('button[type="submit"]').click();

    // Wait for dashboard or redirect
    cy.url().should('include', '/dashboard');

    // Go to Form Templates page
    cy.visit('/form-templates');
    cy.contains('Edit Polling Station Report Template').click();

    // Should be on the report template editor page
    cy.url().should('include', '/polling-stations/report-template');
    cy.contains('Polling Station Report Template');

    // Edit the template name
    cy.get('input[name="name"]').clear().type('Polling Report Template E2E Test');
    // Save the template (assumes a save button is present in FormTemplateEditor)
    cy.contains('button', 'Save').click();

    // Check for success toast
    cy.contains('Polling station report template updated.').should('be.visible');
  });
}); 
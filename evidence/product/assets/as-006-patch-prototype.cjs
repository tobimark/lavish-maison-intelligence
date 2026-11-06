const fs=require('fs');
const p='apps/web/tests/poc-prototype.spec.ts';
let s=fs.readFileSync(p,'utf8');
s=s.replace("'From market insight to campaign-ready creative'","'From social trends to your next Lavish campaign.'");
s=s.replace("    await expect(page.getByTestId('ov-explore')).toHaveAttribute('href', '/opportunities');\n    await expect(page.getByTestId('ov-creative')).toHaveAttribute('href', '/atelier');\n    await expect(page.getByText('Six workspaces').first()).toBeVisible();","    await expect(page.getByTestId('ov-explore-journey')).toHaveAttribute('href', `/campaigns/scn-scent-layering.brief.main/journey?scenarioVersion=1.1.0`);\n    await expect(page.locator('[data-workspace=\"atelier\"]').first()).toHaveAttribute('href', '/atelier');\n    await expect(page.getByText(/Six workspaces/i).first()).toBeVisible();");
s=s.replace("    await expect(page.getByText('Your Scent, Your Expression').first()).toBeVisible();","    await expect(page.getByText('SERENITY — A Story in Layers').first()).toBeVisible();");
fs.writeFileSync(p,s);
console.log('patched');

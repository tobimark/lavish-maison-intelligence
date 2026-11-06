const fs=require('fs');
const p='apps/web/components/product/library/LibraryPage.tsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace("            <option value=\"script\">Scripts</option>\n            <option value=\"storyboard\">Static storyboards</option>","            <option value=\"script\">Scripts</option>\n            <option value=\"storyboard\">Static storyboards</option>\n            <option value=\"hero_image\">Hero images</option>\n            <option value=\"product_original_image\">Product originals</option>\n            <option value=\"final_preview_video\">Provided videos</option>");
const providedSection = `
      {state === 'ready' && visibleProvided.length > 0 ? (
        <section className={styles.section} data-testid="LIB-provided-section" aria-labelledby="lib-provided-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle} id="lib-provided-title">Provided SERENITY assets</h2>
              <p className={styles.sectionNote}>Real supplied product image, campaign visual and 10-second video preview. Provided demo assets · Not generated live in this POC.</p>
            </div>
          </div>
          <div className={styles.gridThree}>
            {visibleProvided.map((asset) => {
              const controlId = asset.type === 'hero_image' ? 'AS-HERO-PREVIEW' : asset.type === 'product_original_image' ? 'AS-IDENTITY-OPEN' : 'AS-VIDEO-TAB';
              return (
                <article className={`${styles.card} ${styles.workCard}`} key={asset.id} data-testid={\`LIB-provided-\${asset.type}\`} data-control-id={controlId}>
                  <div className={styles.libraryProvidedMedia}>
                    {asset.type === 'final_preview_video' ? (
                      <video muted playsInline preload="metadata" poster={asset.metadata.posterAssetId ? (providedAssets?.assets.find((candidate) => candidate.id === asset.metadata.posterAssetId)?.uri ?? undefined) : undefined} data-testid="LIB-provided-video-thumb">
                        <source src={asset.uri} type={asset.mimeType} />
                      </video>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */
                      <img src={asset.uri} alt={asset.label} data-testid={asset.type === 'product_original_image' ? 'LIB-provided-identity' : 'LIB-provided-hero'} />
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.badgeRow}>
                      <Badge tone="mock">Provided</Badge>
                      <span className={styles.tag}>{PROVIDED_KIND_LABELS[asset.type]}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{asset.label}</h3>
                    <p className={styles.cardText}>{asset.type === 'final_preview_video' ? 'Supplied 10.08s / 720×960 / 3:4 preview; independent of the 15-second concept script.' : 'Supplied original bytes, shown exactly as provided.'}</p>
                    <div className={styles.cardActions}>
                      <Button variant="secondary" size="small" onClick={() => setProvidedPreview(asset)} data-testid={\`LIB-provided-preview-\${asset.type}\`}>Preview</Button>
                      <Link className={styles.link} href={\`/atelier?campaignId=\${encodeURIComponent(asset.campaignId)}&language=en\`} data-testid={\`LIB-provided-atelier-\${asset.type}\`}>Open in Atelier</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

`;
s=s.replace("      {state === 'loading' ? (", providedSection+"      {state === 'loading' ? (");
s=s.replace("      ) : items.length === 0 ? (","      ) : items.length === 0 && visibleProvided.length === 0 ? (");
const overlay = `
      <Overlay
        open={Boolean(providedPreview)}
        onClose={() => setProvidedPreview(null)}
        variant="drawer"
        title={providedPreviewTitle}
        description="Provided demo asset · Not generated live in this POC"
        testId="LIB-provided-preview"
        footer={<Button variant="secondary" onClick={() => setProvidedPreview(null)} data-testid="LIB-provided-close">Close</Button>}
      >
        {providedPreview ? (
          <div className={styles.previewBody}>
            {providedPreview.type === 'final_preview_video' ? (
              <video className={styles.libraryProvidedVideo} controls playsInline preload="metadata" poster={providedAssets?.assets.find((candidate) => candidate.id === providedPreview.metadata.posterAssetId)?.uri} data-testid="LIB-provided-video">
                <source src={providedPreview.uri} type={providedPreview.mimeType} />
              </video>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element -- user-provided internal demo asset */
              <img className={styles.libraryProvidedImage} src={providedPreview.uri} alt={providedPreview.label} data-testid="LIB-provided-image" />
            )}
            <p className={styles.muted}>{providedPreview.label} · {PROVIDED_KIND_LABELS[providedPreview.type]} · Provided demo asset, not generated live in this POC.</p>
          </div>
        ) : null}
      </Overlay>
`;
s=s.replace("      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />", overlay+"\n      <ToastRegion toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />");
fs.writeFileSync(p,s);
console.log('patched render');

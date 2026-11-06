const fs=require('fs'); const p='apps/web/components/product/deliverables/DeliverablesPage.tsx'; let s=fs.readFileSync(p,'utf8');
s=s.replace("  const [downloadsOpen, setDownloadsOpen] = useState(false);\n","");
s=s.replace("\n  useEffect(() => {\n    if (!socialJourney) setDownloadsOpen(true);\n  }, [socialJourney]);\n","\n");
s=s.replace(`      <details
        className={styles.downloadsDisclosure}
        data-testid="deliverables-downloads"
        open={downloadsOpen}
        onToggle={(event) => setDownloadsOpen(event.currentTarget.open)}
      >`,`      <details className={styles.downloadsDisclosure} data-testid="deliverables-downloads">`);
fs.writeFileSync(p,s);

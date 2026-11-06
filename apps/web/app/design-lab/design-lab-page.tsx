'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import styles from '../../styles/design-lab.module.css';

type Lang = 'en' | 'ar';

const copyEn = {
  eyebrow: 'LAVISH PERFUMES · MAISON INTELLIGENCE',
  title: 'Design foundation',
  lede:
    'Internal visual baseline for the marketing intelligence workspace. Typography, colour, spacing and interaction rules come from the approved reference and DESIGN_SYSTEM; this page is not a business screen and shows no live data.',
  badgeDemo: 'Demo · Design preview',
  badgeScope: 'Frontend only · TASK-006',
  languageLabel: 'Language',
  langEn: 'EN',
  langAr: 'العربية',
  languageAnnouncement: 'Language switched to English.',
  fontsLine: 'Inter v20 + Noto Sans Arabic v33 · self-hosted',
  motionFull: 'Motion: full',
  motionReduced: 'Motion: reduced',
  typographyTitle: 'Type scale',
  typographyNote:
    'Sizes, weights and line heights are read from design/tokens.css. Arabic uses its own face, letter-spacing 0 and 1.8 leading.',
  levels: {
    pageTitle: 'Page title',
    sectionTitle: 'Section title',
    body: 'Body',
    control: 'Control',
    meta: 'Meta',
    shortLabel: 'Short label',
  },
  specimens: {
    title: 'Marketing intelligence, made actionable',
    section: 'Scent layering opportunity',
    body:
      'A clearer view of every signal, opportunity and creative decision — reviewable from the first evidence item to the scheduled post.',
    control: 'Continue demo session',
    meta: 'Updated 2 minutes ago · Demo seed 01',
    shortLabel: 'Intelligence radar',
  },
  arabicBlockTitle: 'AR · Noto Sans Arabic',
  arabicTitle: 'ذكاء تسويقي قابل للتنفيذ',
  arabicBody:
    'عرض أوضح لكل إشارة وفرصة وقرار إبداعي، قابل للمراجعة من أول دليل حتى المنشور المجدول.',
  arabicMeta: 'آخر تحديث قبل دقيقتين · بذرة العرض 01',
  arabicNote:
    'Arabic copy is a layout sample pending localization review; product names and SKUs keep their official Latin form.',
  contentEyebrow: 'Intelligence radar · Demo',
  contentTitle: 'Scent layering opportunity · UAE',
  contentBody:
    'Illustrative scenario: pairing LAVISH OUD with PERLA to test a layering concept. Demo content only — not a claim about current demand, sales or verified market movement.',
  chips: {
    demo: 'DEMO source',
    preset: 'Preset content',
    illustrative: 'Illustrative scenario',
  },
  productOud: 'LAVISH OUD',
  productOudMeta: 'SKU',
  productPerla: 'PERLA',
  productPerlaMeta: '50 ML · Unisex',
  actionShow: 'Show decision note',
  actionHide: 'Hide decision note',
  note:
    'Decision note (demo): this card validates hierarchy, spacing and the single-primary-action rule. No live data or API call is involved.',
  paletteTitle: 'Colour & surfaces',
  paletteNote: 'Swatches reference token names only — no duplicated hex table on this page.',
  swatchRoles: {
    canvas: 'Page canvas',
    surface: 'Card surface',
    surfaceMuted: 'Inset surface',
    line: 'Hairline border',
    brandBlack: 'Dark shell',
    mediaSurface: 'Media canvas',
    brandGold: 'Gold accent',
    brandGoldDeep: 'Gold text',
    brandGoldWash: 'Gold tint',
    good: 'Success graphic',
    goodText: 'Success text',
    dangerText: 'Error text',
    info: 'Info text',
    focus: 'Focus ring',
  },
  darkPreviewTitle: 'Dark surface preview',
  darkPreviewText:
    'Reserved for shell and media areas only; the workspace page itself stays warm white.',
  spacingTitle: 'Space & radii',
  spacingNote: 'Rhythm is 18/24 between sections; card padding 24 (compact 20).',
  radiusLabels: { card: 'Card · 12', control: 'Control · 7', small: 'Small · 5' },
  heightLabels: { control: 'Control 40', primary: 'Primary 44' },
  radiusHeading: 'Radius',
  heightHeading: 'Control height',
  statesTitle: 'States & interaction',
  statesNote: 'Every control here does something; no placeholder buttons are shown.',
  focusLabel: 'Focus',
  focusFieldLabel: 'Focus sample field',
  focusHelp: 'Tab or Shift+Tab through the controls — the ring uses --focus.',
  motionLabel: 'Reduced motion',
  motionButton: 'Play motion sample',
  motionHelpFull: 'prefers-reduced-motion: no-preference — 220ms token transition.',
  motionHelpReduced: 'prefers-reduced-motion: reduce — transitions are disabled by the token media query.',
  statusLabel: 'Status & source labels',
  status: {
    good: 'Evidence linked · DEMO',
    warning: 'Brand artwork pending',
    danger: 'Provider unavailable · Demo',
    info: 'Localization review needed',
  },
  disabledLabel: 'Disabled control (intentional)',
  disabledButton: 'Unavailable in this lab',
  footer: [
    'Token source: repo-root design/tokens.css (single source, imported once by the root layout).',
    'Fonts: Inter v20 and Noto Sans Arabic v33, self-hosted from /fonts/ — no Google Fonts or CDN request.',
    'Reference HTML rendered with the Segoe UI fallback (Inter was never loaded there); this lab loads Inter locally, so widths and tracking differ slightly.',
    'Demo · Design preview · Frontend only · no API calls, no fabricated products or brand artwork.',
  ],
};

type Copy = typeof copyEn;

const copyAr: Copy = {
  eyebrow: 'LAVISH PERFUMES · MAISON INTELLIGENCE',
  title: 'أساس التصميم',
  lede:
    'صفحة داخلية لمراجعة الطباعة والألوان والمسافات والتفاعل قبل بناء صفحات المنتج. ليست صفحة أعمال ولا تعرض بيانات حية.',
  badgeDemo: 'عرض تصميم · بيانات تجريبية',
  badgeScope: 'واجهة فقط · TASK-006',
  languageLabel: 'اللغة',
  langEn: 'EN',
  langAr: 'العربية',
  languageAnnouncement: 'تم تغيير اللغة إلى العربية.',
  fontsLine: 'Inter v20 + Noto Sans Arabic v33 · خطوط مستضافة محلياً',
  motionFull: 'الحركة: كاملة',
  motionReduced: 'الحركة: مخففة',
  typographyTitle: 'سلم الطباعة',
  typographyNote:
    'الأحجام والأوزان وارتفاعات الأسطر من design/tokens.css؛ النص العربي بخطه الخاص، بلا تباعد حروف وبارتفاع سطر 1.8.',
  levels: {
    pageTitle: 'عنوان الصفحة',
    sectionTitle: 'عنوان قسم',
    body: 'نص أساسي',
    control: 'نص عنصر تحكم',
    meta: 'معلومات مساعدة',
    shortLabel: 'تسمية قصيرة',
  },
  specimens: {
    title: 'ذكاء تسويقي قابل للتنفيذ',
    section: 'فرصة تركيب العطر',
    body:
      'عرض أوضح لكل إشارة وفرصة وقرار إبداعي، قابل للمراجعة من أول دليل حتى المنشور المجدول.',
    control: 'متابعة جلسة العرض',
    meta: 'آخر تحديث قبل دقيقتين · بذرة العرض 01',
    shortLabel: 'رادار الذكاء',
  },
  arabicBlockTitle: 'AR · Noto Sans Arabic',
  arabicTitle: 'ذكاء تسويقي قابل للتنفيذ',
  arabicBody:
    'عرض أوضح لكل إشارة وفرصة وقرار إبداعي، قابل للمراجعة من أول دليل حتى المنشور المجدول.',
  arabicMeta: 'آخر تحديث قبل دقيقتين · بذرة العرض 01',
  arabicNote:
    'النص العربي هنا نموذج تخطيطي بانتظار مراجعة التعريب؛ تبقى أسماء المنتجات وأرقام SKU بصيغتها اللاتينية الرسمية.',
  contentEyebrow: 'رادار الذكاء · بيانات تجريبية',
  contentTitle: 'فرصة تركيب العطر · الإمارات',
  contentBody:
    'سيناريو توضيحي: دمج LAVISH OUD مع PERLA لاختبار فكرة تركيب طبقات العطر. محتوى تجريبي فقط، وليس ادعاءً عن الطلب الحالي أو المبيعات أو حركة سوق موثقة.',
  chips: {
    demo: 'المصدر: تجريبي',
    preset: 'محتوى معد مسبقاً',
    illustrative: 'سيناريو توضيحي',
  },
  productOud: 'LAVISH OUD',
  productOudMeta: 'SKU',
  productPerla: 'PERLA',
  productPerlaMeta: '50 ML · للجنسين',
  actionShow: 'إظهار ملاحظة القرار',
  actionHide: 'إخفاء ملاحظة القرار',
  note:
    'ملاحظة قرار تجريبية: تتحقق هذه البطاقة من التسلسل والمسافات وقاعدة زر أساسي واحد. لا تُستخدم بيانات حية ولا استدعاء API.',
  paletteTitle: 'الألوان والأسطح',
  paletteNote: 'تعرض العينات أسماء المتغيرات فقط، دون جدول ألوان مكرر في هذه الصفحة.',
  swatchRoles: {
    canvas: 'خلفية الصفحة',
    surface: 'سطح البطاقة',
    surfaceMuted: 'سطح مقحم',
    line: 'حدود دقيقة',
    brandBlack: 'الهيكل الداكن',
    mediaSurface: 'كانفاس الوسائط',
    brandGold: 'تمييز ذهبي',
    brandGoldDeep: 'نص ذهبي',
    brandGoldWash: 'تظليل ذهبي',
    good: 'رمز النجاح',
    goodText: 'نص النجاح',
    dangerText: 'نص الخطأ',
    info: 'نص المعلومات',
    focus: 'حلقة التركيز',
  },
  darkPreviewTitle: 'معاينة سطح داكن',
  darkPreviewText: 'يُستخدم للهيكل والوسائط فقط؛ تبقى صفحة العمل بخلفية فاتحة دافئة.',
  spacingTitle: 'المسافات والانحناءات',
  spacingNote: 'الإيقاع 18/24 بين الأقسام، وحشوة البطاقة 24 (المضغوطة 20).',
  radiusLabels: { card: 'بطاقة · 12', control: 'عنصر تحكم · 7', small: 'صغير · 5' },
  heightLabels: { control: 'عنصر تحكم 40', primary: 'أساسي 44' },
  radiusHeading: 'نصف القطر',
  heightHeading: 'ارتفاع عنصر التحكم',
  statesTitle: 'الحالات والتفاعل',
  statesNote: 'كل عنصر تحكم هنا له وظيفة حقيقية؛ لا أزرار شكلية.',
  focusLabel: 'التركيز',
  focusFieldLabel: 'حقل تجربة التركيز',
  focusHelp: 'استخدم Tab أو Shift+Tab بين العناصر؛ الحلقة تستخدم --focus.',
  motionLabel: 'الحركة المخففة',
  motionButton: 'تشغيل عينة الحركة',
  motionHelpFull: 'prefers-reduced-motion: no-preference — انتقال بمدة 220ms.',
  motionHelpReduced: 'prefers-reduced-motion: reduce — تم تعطيل الانتقالات عبر استعلام الوسائط في الرموز.',
  statusLabel: 'حالات وتسميات المصدر',
  status: {
    good: 'تم ربط الدليل · تجريبي',
    warning: 'الأصول البصرية للعلامة قيد الانتظار',
    danger: 'المزود غير متاح · تجريبي',
    info: 'مراجعة التعريب مطلوبة',
  },
  disabledLabel: 'عنصر معطل (مقصود)',
  disabledButton: 'غير متاح في هذه الصفحة',
  footer: [
    'مصدر الرموز: design/tokens.css في جذر المشروع (مصدر وحيد، يُستورد مرة واحدة عبر التخطيط الجذري).',
    'الخطوط: Inter v20 و Noto Sans Arabic v33 مستضافة محلياً من /fonts/ — دون أي طلب إلى Google Fonts أو CDN.',
    'نسخة HTML المرجعية عُرضت بخط Segoe UI الاحتياطي (لم تُحمَّل Inter هناك)؛ هذه الصفحة تحمّل Inter محلياً، لذلك تختلف عروض الأحرف والتباعد قليلاً.',
    'عرض تصميم · بيانات تجريبية · واجهة فقط · دون استدعاءات API أو منتجات أو أصول علامة غير حقيقية.',
  ],
};

const SWATCHES: { token: string; roleKey: keyof Copy['swatchRoles'] }[] = [
  { token: '--canvas', roleKey: 'canvas' },
  { token: '--surface', roleKey: 'surface' },
  { token: '--surface-muted', roleKey: 'surfaceMuted' },
  { token: '--line', roleKey: 'line' },
  { token: '--brand-black', roleKey: 'brandBlack' },
  { token: '--media-surface', roleKey: 'mediaSurface' },
  { token: '--brand-gold', roleKey: 'brandGold' },
  { token: '--brand-gold-deep', roleKey: 'brandGoldDeep' },
  { token: '--brand-gold-wash', roleKey: 'brandGoldWash' },
  { token: '--good', roleKey: 'good' },
  { token: '--good-text', roleKey: 'goodText' },
  { token: '--danger', roleKey: 'dangerText' },
  { token: '--info', roleKey: 'info' },
  { token: '--focus', roleKey: 'focus' },
];

const SPACES = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-grid',
  '--space-6',
  '--space-8',
  '--space-10',
];

export function DesignLabPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [spaceValues, setSpaceValues] = useState<Record<string, string>>({});
  const playTimer = useRef<number | null>(null);

  const t = lang === 'en' ? copyEn : copyAr;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    // Read the live token values instead of duplicating a second px table.
    const rootStyle = getComputedStyle(document.documentElement);
    setSpaceValues(
      Object.fromEntries(SPACES.map((token) => [token, rootStyle.getPropertyValue(token).trim()])),
    );
  }, []);

  useEffect(() => {
    return () => {
      if (playTimer.current !== null) {
        window.clearTimeout(playTimer.current);
      }
    };
  }, []);

  const playMotion = () => {
    setPlaying(false);
    window.requestAnimationFrame(() => setPlaying(true));
    if (playTimer.current !== null) {
      window.clearTimeout(playTimer.current);
    }
    playTimer.current = window.setTimeout(() => setPlaying(false), 1200);
  };

  // Sample metadata must describe the real language rules: Arabic runs use zero
  // letter-spacing and 1.8 leading for body copy, so the AR labels must not
  // advertise the English tracking / 1.6 body leading.
  const levelValuesEn = [
    '29 / 1.22 / 630 / -0.04em',
    '18 / 600 / 1.35',
    '16 / 1.6',
    '15 / 500',
    '14 / 1.55',
    '12 / 600 / .16em',
  ];
  const levelValuesAr = [
    '29 / 1.22 / 630 / 0',
    '18 / 600 / 1.35 / 0',
    '16 / 1.8',
    '15 / 500 / 1.8',
    '14 / 1.8',
    '12 / 600 / 0',
  ];
  const levelValues = lang === 'ar' ? levelValuesAr : levelValuesEn;

  const levels = [
    { label: t.levels.pageTitle, value: levelValues[0], cls: styles.sampleTitle, sample: t.specimens.title },
    { label: t.levels.sectionTitle, value: levelValues[1], cls: styles.sampleSection, sample: t.specimens.section },
    { label: t.levels.body, value: levelValues[2], cls: styles.sampleBody, sample: t.specimens.body },
    { label: t.levels.control, value: levelValues[3], cls: styles.sampleControl, sample: t.specimens.control },
    { label: t.levels.meta, value: levelValues[4], cls: styles.sampleMeta, sample: t.specimens.meta },
    { label: t.levels.shortLabel, value: levelValues[5], cls: styles.sampleLabel, sample: t.specimens.shortLabel },
  ];

  return (
    <main
      id="design-lab"
      className={styles.lab}
      lang={lang}
      dir={dir}
      data-testid="design-lab"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <p className={styles.eyebrow} lang="en">
              {t.eyebrow}
            </p>
            <h1 className={styles.title}>{t.title}</h1>
            <p className={styles.lede}>{t.lede}</p>
            <div className={styles.badges}>
              <span className={styles.badge} data-testid="demo-badge">
                <span className={styles.badgeDot} aria-hidden="true" />
                {t.badgeDemo}
              </span>
              <span className={`${styles.badge} ${styles.badgePlain}`}>{t.badgeScope}</span>
            </div>
          </div>
          <div className={styles.controls}>
            <span className={styles.controlLabel} id="language-label">
              {t.languageLabel}
            </span>
            <div className={styles.langGroup} role="group" aria-labelledby="language-label">
              <button
                type="button"
                className={styles.langButton}
                aria-pressed={lang === 'en'}
                data-testid="lang-en"
                onClick={() => setLang('en')}
                aria-label="English"
                lang="en"
              >
                {t.langEn}
              </button>
              <button
                type="button"
                className={styles.langButton}
                aria-pressed={lang === 'ar'}
                data-testid="lang-ar"
                onClick={() => setLang('ar')}
                aria-label="Arabic"
                lang="ar"
              >
                {t.langAr}
              </button>
            </div>
            <p className={styles.systemLine}>
              <span
                className={styles.stateDot}
                data-reduced={reducedMotion}
                aria-hidden="true"
              />
              {t.fontsLine} · {reducedMotion ? t.motionReduced : t.motionFull}
            </p>
          </div>
        </header>

        <p className="sr-only" aria-live="polite">
          {lang === 'ar' ? copyAr.languageAnnouncement : copyEn.languageAnnouncement}
        </p>

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <section className={styles.card} aria-labelledby="typography-title">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="typography-title">
                  {t.typographyTitle}
                </h2>
                <p className={styles.cardNote}>{t.typographyNote}</p>
              </div>
              <div className={styles.levels}>
                {levels.map((level, index) => (
                  <div className={styles.levelRow} key={level.label}>
                    <div className={styles.levelMeta}>
                      <span className={styles.levelLabel}>{level.label}</span>
                      <span className={styles.levelValue}>
                        <bdi dir="ltr" lang="en">{level.value}</bdi>
                      </span>
                    </div>
                    <div className={styles.levelSample}>
                      <span className={level.cls} data-testid={`type-sample-${index}`}>
                        {level.sample}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className={styles.arabicBlock}
                lang="ar"
                dir="rtl"
                data-testid="arabic-sample"
              >
                <p className={styles.arabicBlockTitle} lang="en" dir="ltr">
                  {t.arabicBlockTitle}
                </p>
                <p className={styles.arabicTitle}>{t.arabicTitle}</p>
                <p className={styles.arabicBody}>{t.arabicBody}</p>
                <p className={styles.arabicMeta}>{t.arabicMeta}</p>
                <p className={styles.mixedLine} dir="ltr" lang="en">
                  <span lang="en" dir="ltr" className={styles.mixedLatin}>
                    LAVISH OUD
                  </span>
                  <bdi lang="en">SKU 6290360532790</bdi>
                  <span aria-hidden="true">·</span>
                  <span lang="en" dir="ltr" className={styles.mixedLatin}>
                    PERLA
                  </span>
                  <bdi lang="en">50 ML</bdi>
                </p>
                <p className={styles.arabicNote} lang="en">
                  {t.arabicNote}
                </p>
              </div>
            </section>

            <section className={styles.card} aria-labelledby="content-preview-title">
              <p className={styles.contentEyebrow}>{t.contentEyebrow}</p>
              <h2 className={styles.contentTitle} id="content-preview-title">
                {t.contentTitle}
              </h2>
              <p className={styles.contentBody}>{t.contentBody}</p>

              <div className={styles.metaRow}>
                <span className={`${styles.chip} ${styles.chipDemo}`}>
                  <span className={styles.chipGlyph} aria-hidden="true" />
                  {t.chips.demo}
                </span>
                <span className={styles.chip}>
                  <span className={styles.chipGlyphDiamond} aria-hidden="true" />
                  {t.chips.preset}
                </span>
                <span className={styles.chip}>
                  <span className={styles.chipGlyphRing} aria-hidden="true" />
                  {t.chips.illustrative}
                </span>
              </div>

              <div className={styles.productRow}>
                <div className={styles.product}>
                  <bdi className={styles.productName} lang="en" dir="ltr">
                    {t.productOud}
                  </bdi>
                  <span className={styles.productMeta}>
                    {t.productOudMeta}{' '}
                    <bdi className={styles.sku} lang="en">
                      6290360532790
                    </bdi>
                  </span>
                </div>
                <div className={styles.product}>
                  <bdi className={styles.productName} lang="en" dir="ltr">
                    {t.productPerla}
                  </bdi>
                  <span className={styles.productMeta}>
                    <bdi lang="en" className={styles.mixedLatin}>
                      {t.productPerlaMeta}
                    </bdi>
                  </span>
                </div>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setNoteOpen((open) => !open)}
                  aria-expanded={noteOpen}
                  aria-controls="decision-note"
                  data-testid="reveal-note"
                >
                  {noteOpen ? t.actionHide : t.actionShow}
                </button>
              </div>

              {noteOpen ? (
                <p className={styles.noteBox} id="decision-note" data-testid="note-box">
                  {t.note}
                </p>
              ) : null}
            </section>
          </div>

          <aside className={styles.sideCol}>
            <section className={styles.card} aria-labelledby="palette-title">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="palette-title">
                  {t.paletteTitle}
                </h2>
                <p className={styles.cardNote}>{t.paletteNote}</p>
              </div>
              <div className={styles.swatchGrid}>
                {SWATCHES.map((swatch) => (
                  <div className={styles.swatch} key={swatch.token}>
                    <span
                      className={styles.swatchColor}
                      style={{ background: `var(${swatch.token})` }}
                      aria-hidden="true"
                    />
                    <span className={styles.swatchText}>
                      <span className={styles.swatchName}>
                        <bdi dir="ltr" lang="en">{swatch.token}</bdi>
                      </span>
                      <span className={styles.swatchRole}>
                        {t.swatchRoles[swatch.roleKey]}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.darkPreview}>
                <p className={styles.darkPreviewTitle}>
                  <span className={styles.badgeDot} aria-hidden="true" />
                  {t.darkPreviewTitle}
                </p>
                <p className={styles.darkPreviewText}>{t.darkPreviewText}</p>
                <div className={styles.goldRule} aria-hidden="true" />
              </div>
            </section>

            <section className={styles.card} aria-labelledby="space-title">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="space-title">
                  {t.spacingTitle}
                </h2>
                <p className={styles.cardNote}>{t.spacingNote}</p>
              </div>
              <div className={styles.spaceRows}>
                {SPACES.map((token) => (
                  <div className={styles.spaceRow} key={token}>
                    <span className={styles.spaceLabel}>
                      <bdi dir="ltr" lang="en">{token}</bdi>
                    </span>
                    <span
                      className={styles.spaceBar}
                      style={{ '--bar-width': `var(${token})` } as CSSProperties}
                      aria-hidden="true"
                    />
                    <span className={styles.spaceValue}>
                      <bdi dir="ltr" lang="en">{spaceValues[token] ?? ''}</bdi>
                    </span>
                  </div>
                ))}
              </div>

              <p className={styles.subHeading}>{t.radiusHeading}</p>
              <div className={styles.radiusGrid}>
                <div className={styles.radiusItem}>
                  <span className={`${styles.radiusBox} ${styles.radiusCardBox}`} aria-hidden="true" />
                  <span className={styles.radiusLabel}>{t.radiusLabels.card}</span>
                </div>
                <div className={styles.radiusItem}>
                  <span className={`${styles.radiusBox} ${styles.radiusControlBox}`} aria-hidden="true" />
                  <span className={styles.radiusLabel}>{t.radiusLabels.control}</span>
                </div>
                <div className={styles.radiusItem}>
                  <span className={`${styles.radiusBox} ${styles.radiusSmallBox}`} aria-hidden="true" />
                  <span className={styles.radiusLabel}>{t.radiusLabels.small}</span>
                </div>
              </div>

              <p className={styles.subHeading}>{t.heightHeading}</p>
              <div className={styles.heightRow}>
                <span className={`${styles.heightSample} ${styles.heightControl}`}>
                  {t.heightLabels.control}
                </span>
                <span className={`${styles.heightSample} ${styles.heightPrimary}`}>
                  {t.heightLabels.primary}
                </span>
              </div>
            </section>
          </aside>

          <section
            className={`${styles.card} ${styles.fullWidth}`}
            aria-labelledby="states-title"
          >
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="states-title">
                  {t.statesTitle}
                </h2>
                <p className={styles.cardNote}>{t.statesNote}</p>
              </div>

              <div className={styles.states}>
                <div className={styles.sampleGroup}>
                  <span className={styles.sampleGroupLabel}>{t.focusLabel}</span>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="focus-sample">
                      {t.focusFieldLabel}
                    </label>
                    <input
                      id="focus-sample"
                      className={styles.input}
                      data-testid="focus-input"
                      defaultValue={lang === 'ar' ? 'جرب التركيز هنا' : 'Tab through the lab controls'}
                    />
                    <span className={styles.help}>{t.focusHelp}</span>
                  </div>
                </div>

                <div className={styles.sampleGroup}>
                  <span className={styles.sampleGroupLabel}>{t.motionLabel}</span>
                  <div className={styles.motionRow}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={playMotion}
                      data-testid="motion-play"
                    >
                      {t.motionButton}
                    </button>
                    <span
                      className={styles.motionTrack}
                      data-playing={playing}
                      data-testid="motion-track"
                      aria-hidden="true"
                    >
                      <span className={styles.motionDot} data-testid="motion-dot" />
                    </span>
                  </div>
                  <span className={styles.help} data-testid="motion-help">
                    {reducedMotion ? t.motionHelpReduced : t.motionHelpFull}
                  </span>
                </div>

                <div className={styles.sampleGroup}>
                  <span className={styles.sampleGroupLabel}>{t.statusLabel}</span>
                  <div className={styles.chipsRow}>
                    <span className={`${styles.chip} ${styles.chipGood}`}>
                      <span className={styles.chipGlyph} aria-hidden="true" />
                      {t.status.good}
                    </span>
                    <span className={`${styles.chip} ${styles.chipWarning}`}>
                      <span className={styles.chipGlyphDiamond} aria-hidden="true" />
                      {t.status.warning}
                    </span>
                    <span className={`${styles.chip} ${styles.chipDanger}`}>
                      <span className={styles.chipGlyphRing} aria-hidden="true" />
                      {t.status.danger}
                    </span>
                    <span className={`${styles.chip} ${styles.chipInfo}`}>
                      <span className={styles.chipGlyph} aria-hidden="true" />
                      {t.status.info}
                    </span>
                  </div>
                </div>

                <div className={styles.sampleGroup}>
                  <span className={styles.sampleGroupLabel}>{t.disabledLabel}</span>
                  <button type="button" className={styles.disabledButton} disabled>
                    {t.disabledButton}
                  </button>
                </div>
              </div>
          </section>
        </div>

        <footer className={styles.footer}>
          {t.footer.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className={styles.footerMeta} lang="en">
            <span>
              <span className={styles.footerDot} aria-hidden="true" />
              /design-lab
            </span>
            <span aria-hidden="true">·</span>
            <span>design/tokens.css</span>
            <span aria-hidden="true">·</span>
            <span>Inter · Noto Sans Arabic</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

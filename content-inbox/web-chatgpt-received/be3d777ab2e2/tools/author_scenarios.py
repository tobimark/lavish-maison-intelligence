#!/usr/bin/env python3
"""Author Lavish mock POC scenario drafts without any external services.
Produces only user-approved original image copies, original VTT text and JSON with exact hashes.
Does not produce a video, poster, live capture, LLM result at runtime, or real send.
"""
from __future__ import annotations
import json, pathlib, hashlib, shutil, datetime, textwrap, re, os
from collections import defaultdict
from PIL import Image

KIT=pathlib.Path(os.environ.get('LAVISH_INPUT_KIT', pathlib.Path(__file__).resolve().parent))
OUT=pathlib.Path(os.environ.get('LAVISH_OUTPUT_DIR', '/mnt/data/lavish_content_deliverables'))
BASE=OUT/'content-inbox'
OUT.mkdir(parents=True,exist_ok=True)
NOW=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
DURATION=[3200,3800,4200,3800]
STARTS=[0,3200,7000,11200]
DATE_POINTS=['2026-10-01T08:00:00Z','2026-10-07T08:00:00Z','2026-10-13T08:00:00Z','2026-10-19T08:00:00Z','2026-10-25T08:00:00Z','2026-11-01T08:00:00Z']
MEDIA_SOURCE={
 'logo':('assets/brand/lavish-logo-primary-294x294-rgb.png','lavish-logo.png','image/png','logo',294,294,None,'User-supplied official Lavish Perfumes logo, 2026-11-03; opaque RGB gold square.','User supplied the official Logo for internal POC use; external advertising requires separate written permission.'),
 'oud':('assets/products/lavish-oud-2000.jpg','lavish-oud.jpg','image/jpeg','product_image',2000,2000,'https://lavishperfumes.com/wp-content/uploads/2025/05/1-22.jpg','Official original LAVISH OUD product image, recorded and visually checked 2026-11-05.','Project-authorized internal demo reproduction; source being publicly available does not grant public advertising rights.'),
 'perla':('assets/products/perla-50ml-unisex-2000.png','perla-50ml-unisex.png','image/png','product_image',2000,2000,'https://lavishperfumes.com/wp-content/uploads/2025/05/3-30.png','Official original PERLA 50ML UNISEX image, recorded and visually checked 2026-11-05.','Project-authorized internal demo reproduction; source being publicly available does not grant public advertising rights.'),
}
COMMON_PRODUCTS=[
 dict(key='oud',officialName='LAVISH OUD',sku='6290360532790 / 101653',factsSourceUrl='https://lavishperfumes.com/product/lavish-oud/',verifiedFacts=['Official product title: LAVISH OUD.','Identifiers shown in source: 6290360532790 and 101653.','Official product description refers to oud, spices and floral facets.','Bottle size is not verified; no size claim is made.']),
 dict(key='perla',officialName='PERLA 50ML UNISEX',sku='6290360532820 / 101691',factsSourceUrl='https://lavishperfumes.com/product/perla-50ml-unisex/',verifiedFacts=['Official product title: PERLA 50ML UNISEX.','Identifiers shown in source: 6290360532820 and 101691.','50 ml; unisex.','Official product description refers to floral, fruity and musk facets.'])]

CASES={
 'scent-layering':dict(
   title='The Art of Scent Layering',slugline='Your scent. Your expression.',
   topic='Personal fragrance pairing as a creative ritual',trendtitle='Interest in personal scent expression (illustrative)',
   trendvals=[38,42,45,51,57,63],controltitle='Single-bottle product close-up format (illustrative)',controlvals=[47,48,47,49,48,48],
   sources=[('Pinterest','Layered fragrance visual boards','Editorial collages contrast different bottles, textures and empty negative space.','Dubai','Layering moodboards as visual-language cues'),('TikTok','Personal scent pairings in short-form formats','A hypothetical short-form format focuses on choosing a scent combination without asserting performance.','UAE','Personalization rather than a verified formula'),('YouTube','Explaining personal fragrance choices','A sample educational format suggests audiences may appreciate guidance about exploring fragrance preferences.','GCC','Educational editorial hook'),('Instagram','Two-bottle still-life storytelling','A staged visual signal contrasts product silhouettes and ingredient-inspired textures without a claim about chemistry.','Dubai','Visual contrast between two verified products'),('Pinterest','Single-fragrance hero photography','Control signal: classic single-bottle campaigns remain a usable stable composition.','UAE','Stable creative-format baseline')],
   insights=['In this synthetic scenario, personal expression grows as a creative theme across the invented sample window; it is not a measured platform trend.','Pairing can be framed as discovery rather than a guaranteed effect of physically combining products.','The brand has verified imagery for LAVISH OUD and PERLA 50ML UNISEX; the proposition can be told through two products without inventing a third.'],
   rationale='Conceptual fit: LAVISH OUD is described using oud/spice/floral language; PERLA 50ML UNISEX is described with floral/fruity/musk language. The POC uses an editorial contrast of their documented descriptions, not a claimed tested layering outcome.',
   assumptions=['The hypothetical UAE audience may respond to individual fragrance expression.','Two existing Lavish product images can support an editorial juxtaposition, subject to image-use limits.','Mock evidence is designed only to demonstrate how analysts would explain a recommendation.'],
   uncertainties=['No platform trend measurements have been collected.','No compatibility, application method or after-layering scent result has been verified.','Arabic copy requires native language and Lavish review.','Video and poster are not yet supplied.'],
   recommendation='Prototype a text-led 15-second vertical pairing-themed editorial. Invite product exploration, not a guaranteed performance claim.',
   briefName='Your Scent, Your Expression', objective='Invite discovery of personal fragrance expression without asserting tested layering results.',audience='UAE fragrance enthusiasts curious about personal scent expression; illustrative audience segment, not measured.',products=['oud','perla'],concept='An editorial dialogue between the distinct official Lavish fragrance descriptions and their existing verified bottle images.',tone='Poetic, restrained, respectful of product facts; no instructions to mix or guaranteed results.',channels=['Instagram Reels (concept)','TikTok (concept)'],keyMessage='Two distinct fragrances can inspire personal exploration; no promised blended result.',cta='Explore the collection',
   english=['A scent begins a story.','Oud meets a floral mood.','Explore your own pairing.','Lavish Perfumes · Explore the collection.'],
   arabic=['لكل رائحة حكاية.','العود يلتقي بنفحات زهرية.','اكتشف تنسيقك الخاص.','Lavish Perfumes · اكتشف المجموعة.'],
   vis=[
     'On an ivory field, place the approved LAVISH OUD original image at 55% frame width without repainting the bottle or obscuring its label. Slow 2D push-in within safe crop; generous text margin in upper negative space.',
     'Editorial two-panel composition: approved LAVISH OUD image left, approved PERLA 50ML UNISEX image right. Introduce panels via restrained horizontal wipe; no visual implying actual mixing or test results.',
     'Balanced side-by-side composition of the two original product photos; use only 2D pan and cross-dissolve, respecting each original aspect ratio and legible packaging. Keep the visual exploratory, not instructional.',
     'Set approved square Lavish logo intact in its own square tile over a matte ivory backdrop, with unobstructed CTA beneath in readable type. Do not stretch or key out the opaque gold logo.'
   ],shots_assets=[['oud'],['oud','perla'],['oud','perla'],['logo']],
   alternatives=['Single-bottle product story (stable control) for a simpler product identity route.','A non-layering fragrance discovery concept if Lavish discourages pairing associations.'],
   regional='The audience and UAE angle are creative hypotheses, not empirical demographic conclusions.',
   zh=['一种香气，开启一段故事。','沉香与花香气息相遇。','探索属于自己的香气搭配。','Lavish Perfumes · 探索香水系列。'],
   email_intro='An editorial concept exploring personal scent expression with LAVISH OUD and PERLA 50ML UNISEX. No verified layering outcome is claimed.'
 ),
 'luxury-gifting':dict(
   title='The Thought Behind the Gift',slugline='A gesture, considered.',
   topic='Considered fragrance gifting without implied bundles',trendtitle='Thoughtful gift-selection storytelling (illustrative)',trendvals=[30,33,37,41,46,51],controltitle='Price-led fragrance promotion format (illustrative)',controlvals=[49,48,48,47,49,48],
   sources=[('Pinterest','Minimal fragrance gift-edit layouts','Hypothetical saved boards use calm typography, a single product and a handwritten-style message.','Dubai','Editorial gift selection'),('YouTube','How to choose a thoughtful fragrance gift','A mock explanatory format focuses on understanding the recipient rather than claiming a universal best gift.','UAE','Audience education'),('Instagram','A quiet gifting moment','A staged creative signal frames one fragrance bottle alongside an unbranded paper card.','Abu Dhabi','Moment-based storytelling'),('TikTok','A note before a present','A hypothetical gesture-first video centers intention, not discounts or unavailable gift packaging.','GCC','Short-form narrative hook'),('Instagram','Price-led fragrance graphic','Control signal: an overt promotion layout remains stable in the synthetic index.','UAE','Stable control; not chosen')],
   insights=['Illustrative signals favour the emotion of choosing a fragrance rather than price or promotional pressure.','For Lavish, the verified PERLA 50ML UNISEX product may serve as a photographed product option, without asserting it suits every recipient.','No gift box, bundle SKU, wrapping service or offer is included in this scenario.'],
   rationale='A thoughtful selection narrative uses existing PERLA 50ML UNISEX imagery and the product name/size information only. It avoids false bundle or sale claims and positions gifting as a personal choice.',
   assumptions=['An understated gifting narrative could resonate with a hypothetical UAE luxury-fragrance audience.','Paper-card graphics are merely a layout device and do not imply a physical product insert.','The visual identity can stay consistent with the Lavish HTML reference without lifestyle stock imagery.'],
   uncertainties=['These are invented sample signals and not observed seasonal or retail demand.','No gifting service, gift wrapping, store offer or gift-set SKU is verified.','Arabic copy needs native review and brand review.','MP4 and poster are not supplied.'],
   recommendation='Develop a 15-second editorial gift-selection spot emphasizing attention and personal choice; show PERLA bottle in its original photograph, not a fictitious gift set.',
   briefName='A Gesture, Considered',objective='Introduce one documented Lavish fragrance as a considered gifting possibility without asserting gift services.',audience='A conceptual UAE audience choosing a personal fragrance gift; no observed segment or seasonal demand data.',products=['perla'],concept='The sequence moves from a quiet thought, to a deliberate selection, to a simple product reveal and invitation.',tone='Warm, precise, understated; never discount-led or implying a ready-made gift box.',channels=['Instagram Reels (concept)','Pinterest (concept)'],keyMessage='Meaningful gifting begins with attention, not a claim about a perfect product.',cta='Explore fragrances',
   english=['A gift begins with a thought.','Choose with care.','Make the moment personal.','Lavish Perfumes · Explore fragrances.'],
   arabic=['الهدية تبدأ بفكرة.','اختر بعناية.','واجعل اللحظة شخصية.','Lavish Perfumes · اكتشف العطور.'],
   vis=[
     'Close opening on a blank matte-ivory typographic card with plenty of negative space. Use no physical gift box; typography alone implies consideration. Place approved PERLA product image as a small partial reveal in a secondary frame, intact.',
     'Scale up the approved PERLA 50ML UNISEX original product image from a wide ivory background with subtle 2D movement. Keep bottle and label undistorted; no invented packaging or bow.',
     'Position the same PERLA original centrally with a separate unbranded paper-shaped graphic in the background. The graphic is editorial only, not an included card or service.',
     'End on the original PERLA image and approved Lavish square logo as distinct, separate tiles with the CTA text below, not over the bottle label.'
   ],shots_assets=[['perla'],['perla'],['perla'],['perla','logo']],
   alternatives=['A straightforward fragrance-selection guide without the gift angle.','A single-item new-arrival introduction if gifting is not a current business priority.'],regional='UAE is a creative geographic setting only; no holiday date or demand claim is asserted.',
   zh=['一份礼物，从心意开始。','用心挑选。','让这一刻更有个人意义。','Lavish Perfumes · 探索香水。'],
   email_intro='A gifting concept anchored in the verified PERLA 50ML UNISEX product. No gift box, bundle, wrapping service, discount or occasion-based demand is asserted.'
 ),
 'oud-storytelling':dict(
   title='A Story in Oud',slugline='Let the scent lead.',
   topic='Oud-led ingredient storytelling without origin claims',trendtitle='Oud sensory storytelling formats (illustrative)',trendvals=[41,43,46,50,54,58],controltitle='Historical-origin claims as an ad angle (uncertain sample)',controlvals=[49,45,51,46,50,47],
   sources=[('YouTube','Oud ingredient-led visual narration','A hypothetical editorial explainer describes the mood of oud without assigning a verified geographical origin.','GCC','Scent vocabulary education'),('Instagram','Oud and texture in minimal fragrance content','A simulated creative signal suggests warm neutral fields, a product hero and restrained typography.','Dubai','Visual interpretation of documented note'),('Pinterest','Amber and wood-toned moodboard language','Illustrative moodboard reference used only as visual tone; not evidence of the product ingredients or provenance.','UAE','Conceptual art direction'),('TikTok','Short-form ingredient-led introduction','Mock signal about accessible four-beat ingredient storytelling rather than claims of ancient craft.','Abu Dhabi','15-second storytelling format'),('YouTube','Unverified origin-story narratives','Control signal presents uncertain, conflicting illustrative values; not a reliable basis for a brand historical claim.','GCC','Uncertain control')],
   insights=['The synthetic sample permits a concept study of ingredient-led oud storytelling, not a claim that this theme is currently trending.','LAVISH OUD official description mentions oud, spices and floral facets, which is sufficient for a sensory editorial structure.','Origin, artisanal production method, heritage endorsement, longevity and cultural authenticity claims are out of scope without proof.'],
   rationale='LAVISH OUD is an actual verified product. The official description provides enough high-level vocabulary to structure a restrained four-scene visual progression: oud, spice/floral contrast, bottle, brand.',
   assumptions=['An oud-led sensory visual could interest a conceptual GCC fragrance audience.','Abstract warm gradients and typographic forms can carry sensory associations without invented product photography.','The campaign is a creative sketch rather than a validated brand history.'],
   uncertainties=['No real engagement series or current platform signals have been gathered.','Oud source, extraction process, dates and cultural credentials are not verified.','Arabic wording and sensory nuance need native/brand review.','MP4/poster are pending and frame-rate is a target, not observed.'],
   recommendation='Tell a concise sensorial story grounded only in the official LAVISH OUD description; invite exploration without cultural or performance claims.',
   briefName='Let the Scent Lead',objective='Present LAVISH OUD in a calm, ingredient-inspired 15-second editorial video.',audience='Illustrative GCC fragrance audience interested in oud-themed storytelling; not a measured audience.',products=['oud'],concept='An abstract approach to oud, spices and floral description, resolved into a precise product hero and CTA.',tone='Intimate, restrained, contemporary, culturally careful; no claims of origin or inherited craftsmanship.',channels=['Instagram Reels (concept)','YouTube Shorts (concept)'],keyMessage='A sensory introduction to LAVISH OUD based on the limited official description.',cta='Explore LAVISH OUD',
   english=['Some stories begin with oud.','Spice. A floral impression.','Let the scent lead.','LAVISH OUD · Explore the fragrance.'],
   arabic=['بعض الحكايات تبدأ بالعود.','توابل. ولمسة زهرية.','دع الرائحة تقود الحكاية.','LAVISH OUD · اكتشف العطر.'],
   vis=[
     'Use a dark warm-brown-to-ivory purely graphical gradient, with approved LAVISH OUD original image in an intact central inset. No timber-origin photo, heritage architecture or cultural-symbol props.',
     'Two halves of a typeset field transition softly between warm spice-toned graphic texture and restrained floral-toned color. The approved LAVISH OUD bottle remains in its unmodified original photo inset.',
     'Set LAVISH OUD original image as full product hero against an ivory matte. Use a slow 2D scale on the containing frame, not bottle warping; keep label legible.',
     'Show LAVISH OUD original bottle image and the intact gold-square Lavish Logo in separate balanced positions. Hold the CTA with generous size; no new product claim or origin badge.'
   ],shots_assets=[['oud'],['oud'],['oud'],['oud','logo']],
   alternatives=['Pure product-identification piece with no ingredient associations.','Single descriptive still-frame edit if brand does not wish to emphasize oud narrative.'],regional='GCC audience and storytelling preference are scenario assumptions, not claims of cultural endorsement or audience study.',
   zh=['有些故事，从沉香开始。','香辛气息。一抹花香。','让香气引领故事。','LAVISH OUD · 探索这款香水。'],
   email_intro='A calm sensory concept for the verified LAVISH OUD product, referring only to the product description. No place of origin, heritage or longevity is claimed.'
 )
}

def write_json(p, data):
 p.parent.mkdir(parents=True,exist_ok=True)
 raw=(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
 p.write_bytes(raw);return raw

def sha(b):return hashlib.sha256(b).hexdigest()
def stamp(ms):return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'

def make_vtt(texts):
 lines=['WEBVTT','','NOTE Offline ChatGPT authored demo subtitles. No customer native-language approval.','']
 for i,(start,dur,txt) in enumerate(zip(STARTS,DURATION,texts),1):
  lines.extend([str(i),f'{stamp(start+180)} --> {stamp(start+dur-140)}',txt,''])
 return ('\n'.join(lines)+'\n').encode('utf-8')

def ident(sid,kind,key):return f'{sid}.{kind}.{key}'

def build(slug,cfg):
 sid=f'scn-{slug}';version='1.0.0';root=BASE/slug/version;media=root/'media';media.mkdir(parents=True,exist_ok=True)
 ID=lambda kind,key:ident(sid,kind,key)
 loc=lambda fn:f'/scenario-media/{slug}/{version}/{fn}'
 assets=[]
 def add_asset(key,kind,mime,fn,b,width,height,dur,sourceUrl,sourceNote,rightsStatus,rightsNote,productIds):
  o=dict(id=ID('asset',key),kind=kind,mimeType=mime,uri=loc(fn),bytes=(len(b) if b is not None else None),sha256=(sha(b) if b is not None else None),width=width,height=height,durationMs=dur,sourceUrl=sourceUrl,sourceNote=sourceNote,rightsStatus=rightsStatus,rightsNote=rightsNote,productIds=productIds)
  assets.append(o);return o['id']
 for key,(src,fn,mime,kind,w,h,*rest) in MEDIA_SOURCE.items():
  input=KIT/src;target=media/fn;shutil.copyfile(input,target)
  actual=target.read_bytes()
  with Image.open(target) as im:assert im.size==(w,h),(target,im.size)
  source_url,note,rights=rest
  productids=[] if key=='logo' else [ID('product',key)]
  add_asset(key,kind,mime,fn,actual,w,h,None,source_url,note,'approved_for_demo',rights,productids)
 for lang in ('en','ar'):
  fn=f'{slug}-{lang}' + ('.vtt' if lang=='en' else '-review.vtt')
  buf=make_vtt(cfg['english'] if lang=='en' else cfg['arabic'])
  (media/fn).write_bytes(buf)
  add_asset('vtt-'+lang,'subtitle','text/vtt',fn,buf,None,None,None,None,('Original authored subtitle text from this offline ChatGPT content draft. '+('Arabic for native review; not connected to an Arabic film.' if lang=='ar' else 'For planned English cut.')),'approved_for_demo','Original subtitles authored for internal demo; Arabic translation remains native/brand review pending.',[])
 add_asset('video-en','video','video/mp4',f'{slug}-en-15s.mp4',None,1080,1920,15000,None,'Planned pre-produced 15-second English vertical MP4; NOT RECEIVED, size and checksum unknown. Dimensions and duration are TARGETS, not measurements.','pending','Customer will provide; no permission or file validation claimed.',[ID('product',k) for k in cfg['products']])
 add_asset('poster-en','poster','image/jpeg',f'{slug}-en-poster.jpg',None,1080,1920,None,None,'Planned custom still poster matching frame and Lavish product identity; NOT RECEIVED, size and checksum unknown.','pending','Poster to be supplied or separately approved; no current file or rights clearance claimed.',[ID('product',k) for k in cfg['products']])
 brand=dict(brand=dict(id=ID('brand','lavish'),name='Lavish Perfumes',logoAssetId=ID('asset','logo'),tone=['quiet luxury editorial','measured, contemporary','product-led and respectful of factual limits'],rules=['Preserve approved opaque 294×294 Lavish logo unchanged and at correct aspect ratio.','Preserve real SKU product photography and legible labels; do not redraw bottle.','Make unverified campaign claims explicitly conceptual and simulated.','English and Arabic versions require local native/brand review before external publication.'],prohibitedClaims=['Verified scent layering results or combination performance','Specific oud provenance, heritage, production process, or certification','Longevity, medical effect, endorsements, sales volume or measured consumer sentiment','Discounts, bundles, packaging and gifting services not verified in product documents']),products=[dict(id=ID('product',p['key']),officialName=p['officialName'],sku=p['sku'],factsSourceUrl=p['factsSourceUrl'],verifiedFacts=p['verifiedFacts'],imageAssetIds=[ID('asset',p['key'])]) for p in COMMON_PRODUCTS])
 evidence=[];signals=[]
 for i,(platform,title,summary,region,topic) in enumerate(cfg['sources'],1):
  e=ID('evidence',f'e{i}');sig=ID('signal',f's{i}')
  evidence.append(dict(id=e,sourceType='MOCK',platform=f'{platform} — simulated signal',title=title,summary=summary,simulatedAt=f'2026-10-{min(10+3*i,28):02d}T09:00:00Z',disclosure='Synthetic illustrative signal authored offline for demo. Not a real post, API response, metric, citation, account, or observed trend.'))
  signals.append(dict(id=sig,title=title,topic=topic,region=region,evidenceIds=[e],summary=f'MOCK {platform} / {summary}'))
 trends=[]
 for key,indices,vals,direction,name in [('main',list(range(1,5)),cfg['trendvals'],'rising',cfg['trendtitle']),('control',[5],cfg['controlvals'],'stable' if slug!='oud-storytelling' else 'uncertain',cfg['controltitle'])]:
  if key=='control' and slug=='oud-storytelling':direction='uncertain'
  trends.append(dict(id=ID('trend',key),title=name,signalIds=[ID('signal',f's{i}') for i in indices],direction=direction,unit='synthetic illustrative index (0–100; not platform counts, engagement or growth %)',window=dict(start=DATE_POINTS[0],end=DATE_POINTS[-1]),points=[dict(at=d,value=v) for d,v in zip(DATE_POINTS,vals)],interpretation=('Editorial modelled increase as a deliberately synthetic visual sequence; only a concept to test dashboard logic.' if key=='main' else 'Control series is roughly flat or non-directional; not every invented signal is rising.'),disclosure='Entire time series is synthetic, illustrative, authored offline. No real growth, sampling, market demand or statistical confidence inferred.'))
 discovery=dict(evidence=evidence,signals=signals,trends=trends)
 analysisid=ID('analysis','main');briefid=ID('brief','main')
 analysis=dict(analyses=[dict(id=analysisid,trendIds=[ID('trend','main'),ID('trend','control')],evidenceIds=[ID('evidence',f'e{i}') for i in range(1,6)],insights=cfg['insights'],rationale=cfg['rationale'],assumptions=cfg['assumptions'],uncertainties=cfg['uncertainties'],recommendation=cfg['recommendation'])],briefs=[dict(id=briefid,analysisId=analysisid,name=cfg['briefName'],objective=cfg['objective'],markets=['UAE','GCC'],audience=cfg['audience'],productIds=[ID('product',k) for k in cfg['products']],concept=cfg['concept'],tone=cfg['tone'],channels=cfg['channels'],languages=['en','ar'],keyMessage=cfg['keyMessage'],cta=cfg['cta'])])
 scripts=[]
 for lang in ('en','ar'):
  texts=cfg['english'] if lang=='en' else cfg['arabic']
  shots=[];subs=[]
  for i,(start,dur,txt,visual) in enumerate(zip(STARTS,DURATION,texts,cfg['vis']),1):
   opts=cfg['shots_assets'][i-1]
   shots.append(dict(id=ID('shot',f'{lang}-{i}'),startMs=start,durationMs=dur,visual=visual+(' Arabic creative version: use right-to-left text alignment and native font, preserve Latin product and brand names.' if lang=='ar' else ' English creative version with restrained editorial typography.'),voiceover='',onScreenText=txt,transition=('Cut from black; fade in text over 180ms.' if i==1 else ('Hold final composition and fade to matte at exactly 15000ms.' if i==4 else 'Soft 180ms cross-dissolve on shot boundary; product marks remain stable.')),assetIds=[ID('asset',k) for k in opts]))
   subs.append(dict(id=ID('subtitle',f'{lang}-{i}'),startMs=start+180,endMs=start+dur-140,text=txt))
  scripts.append(dict(id=ID('script',f'{lang}-v1'),briefId=briefid,version=1,language=lang,title=cfg['briefName'] if lang=='en' else texts[0],hook=texts[0],message=cfg['keyMessage'] if lang=='en' else 'هذا تصور إبداعي تجريبي يستلهم المعلومات المعتمدة عن منتجات Lavish Perfumes، ولا يثبت اتجاهات سوقية أو نتائج استخدام.',cta=cfg['cta'] if lang=='en' else texts[3].split('· ')[-1],durationMs=15000,shots=shots,subtitles=subs,caption=(cfg['email_intro']+' Concept POC / Mock. Explore Lavish Perfumes. No product-performance claim.' if lang=='en' else 'تصور إبداعي توضيحي لعلامة Lavish Perfumes، وليس دليلاً على اتجاه سوقي فعلي أو نتيجة استخدام مؤكدة.'),hashtags=['#LavishPerfumes',{'scent-layering':'#ScentExpression','luxury-gifting':'#ThoughtfulGifting','oud-storytelling':'#OudStory'}[slug]] if lang=='en' else ['#LavishPerfumes',{'scent-layering':'#عطور','luxury-gifting':'#هدايا','oud-storytelling':'#العود'}[slug]]))
 videoid=ID('video','en-v1')
 videos=[dict(id=videoid,scriptVersionId=ID('script','en-v1'),storyboardShotIds=[ID('shot',f'en-{i}') for i in range(1,5)],mp4AssetId=ID('asset','video-en'),posterAssetId=ID('asset','poster-en'),subtitleAssetIds=[ID('asset','vtt-en')],durationMs=15000,width=1080,height=1920,frameRate=30,productionMode='preproduced',disclosure='PLANNED pre-produced English video for Mock POC; MP4 and poster are pending customer delivery; 1080×1920, 30fps, 15s are TARGET specifications, not probed media; cannot play/download or pass L5 until supplied and validated.')]
 recipients=[dict(id=ID('recipient','brand-review'),displayName='Lavish Demo Brand Review (simulated)',role='Brand reviewer — hypothetical',email='brand-review@lavish-demo.invalid',isSimulated=True),dict(id=ID('recipient','creative-ops'),displayName='Lavish Demo Creative Operations (simulated)',role='Creative operations — hypothetical',email='creative-ops@lavish-demo.invalid',isSimulated=True)]
 planid=ID('plan','en-v1');recordid=ID('record','delivered-2');failid=ID('record','failed-1')
 emailbody=(f'SIMULATED DELIVERY — NO EMAIL WAS SENT.\n\nDear Lavish Demo Review Team,\n\nPlease find the conceptual creative pack for "{cfg["briefName"]}".\n\nCreative rationale: {cfg["email_intro"]}\n\nScript: English, 15 seconds, four shots; editable in the mock workflow.\nArabic: a separate complete text/subtitle draft exists and requires native/brand review.\n\nPre-produced video: PLANNED ({slug}-en-15s.mp4). This draft currently has no MP4 or poster; do not use a broken link as a delivered asset. The future POC replay will show a simulated attachment after actual media handoff and validation.\n\nRequested review: brand tone; exact product identity and claims; Arabic copy; video-to-script alignment; media rights.\n\nThis email is a scenario fixture only. Recipient addresses use .invalid. No platform, rendering API or email service was contacted.\n\nLavish AI Marketing POC / Mock-only concept.')
 delivery=dict(recipients=recipients,plans=[dict(id=planid,scriptVersionId=ID('script','en-v1'),videoId=videoid,recipientIds=[r['id'] for r in recipients],attachmentAssetIds=[ID('asset','video-en'),ID('asset','vtt-en')],subject=f'[SIMULATED / NOT SENT] Lavish creative concept: {cfg["briefName"]}',body=emailbody,channel='email',scheduledVirtualMs=104000,disclosure='Pre-authored simulated delivery plan only. No actual email, link, attachment transfer or external delivery receipt.')],records=[dict(id=failid,planId=planid,outcome='failed',attempt=1,atMs=106000,failureCode='delivery_failed',mode='mock'),dict(id=recordid,planId=planid,outcome='simulated_delivered',attempt=2,atMs=112000,failureCode=None,mode='mock')])
 # Events: only successful golden-path outcome in the event stream, failureCase record belongs to separate illustrative branch.
 events=[]
 def add(st,type,payload,at,ins=(),outs=()):
  n=len(events)+1
  events.append(dict(id=ID('event',f'{n:04d}'),scenarioId=sid,scenarioVersion=version,sequence=n,atMs=at,stage=st,runKey=f'{slug}-{version}-{st}-demo',mode='mock',type=type,inputRefs=list(ins),outputRefs=list(outs),payload=payload))
 add('discovery','stage.started',dict(stage='discovery'),0)
 for i,at in enumerate([4500,8500,12000,15000,18500],1):add('discovery','signal.discovered',dict(signalId=ID('signal',f's{i}')),at,[ID('evidence',f'e{i}')],[ID('signal',f's{i}')])
 add('discovery','trend.summarized',dict(trendId=ID('trend','main')),25000,[ID('signal',f's{i}') for i in range(1,5)],[ID('trend','main')])
 add('discovery','trend.summarized',dict(trendId=ID('trend','control')),28500,[ID('signal','s5')],[ID('trend','control')])
 add('discovery','stage.completed',dict(stage='discovery'),31500)
 add('analysis','stage.started',dict(stage='analysis'),35500)
 add('analysis','analysis.presented',dict(analysisId=analysisid),44000,[ID('trend','main'),ID('trend','control')]+[ID('evidence',f'e{i}') for i in range(1,6)],[analysisid])
 add('analysis','brief.presented',dict(briefId=briefid),51500,[analysisid]+[ID('product',k) for k in cfg['products']],[briefid])
 add('analysis','script.presented',dict(scriptVersionId=ID('script','en-v1')),58000,[briefid],[ID('script','en-v1')])
 add('analysis','script.presented',dict(scriptVersionId=ID('script','ar-v1')),62000,[briefid],[ID('script','ar-v1')])
 add('analysis','script.confirmed',dict(scriptVersionId=ID('script','en-v1')),65500,[ID('script','en-v1')])
 add('analysis','stage.completed',dict(stage='analysis'),67000)
 add('video','stage.started',dict(stage='video'),70500)
 video_inputs=[ID('script','en-v1')]+[ID('shot',f'en-{i}') for i in range(1,5)]+[ID('asset',k) for k in ('video-en','poster-en','vtt-en')]
 add('video','video.queued',dict(videoId=videoid),73000,video_inputs,[videoid])
 for pct,at in [(12,77000),(41,80500),(78,85500),(100,89500)]:add('video','video.progressed',dict(videoId=videoid,progress=pct),at,[videoid])
 add('video','video.available',dict(videoId=videoid),93500,video_inputs,[videoid])
 add('video','stage.completed',dict(stage='video'),97000)
 add('delivery','stage.started',dict(stage='delivery'),102000)
 plan_inputs=[ID('script','en-v1'),videoid]+[r['id'] for r in recipients]+[ID('asset','video-en'),ID('asset','vtt-en')]
 add('delivery','delivery.queued',dict(planId=planid),104500,plan_inputs,[planid])
 add('delivery','delivery.simulated',dict(recordId=recordid),112000,[planid],[recordid])
 add('delivery','stage.completed',dict(stage='delivery'),116000)
 # Independent author-defined expected outcomes at four stage boundaries (not derived by folding events).
 phases=['discovery','analysis','video','delivery']
 checkpoint_cursors={st:next(e['sequence'] for e in events if e['type']=='stage.completed' and e['stage']==st) for st in phases}
 discovered={ID('signal',f's{i}') for i in range(1,6)} | {ID('trend','main'),ID('trend','control')}
 analyzed=set(discovered)|{analysisid,briefid,ID('script','en-v1'),ID('script','ar-v1')}
 for sc in scripts:
  analyzed.update(sh['id'] for sh in sc['shots']);analyzed.update(sub['id'] for sub in sc['subtitles'])
 video_visible=analyzed|{videoid}
 delivered=video_visible|{planid,recordid}
 def ck(cursor,w,ids,script=None,video=None,records=None):
  return dict(cursorSequence=cursor,workflow=w,visibleEntityIds=sorted(ids),activeScriptVersionId=script,activeVideoId=video,deliveryRecordIds=list(records or []))
 checkpoints=[
  ck(0,dict(discovery='ready',analysis='locked',video='locked',delivery='locked'),[]),
  ck(checkpoint_cursors['discovery'],dict(discovery='completed',analysis='ready',video='locked',delivery='locked'),discovered),
  ck(checkpoint_cursors['analysis'],dict(discovery='completed',analysis='completed',video='ready',delivery='locked'),analyzed,ID('script','en-v1')),
  ck(checkpoint_cursors['video'],dict(discovery='completed',analysis='completed',video='completed',delivery='ready'),video_visible,ID('script','en-v1')),
  ck(checkpoint_cursors['delivery'],dict(discovery='completed',analysis='completed',video='completed',delivery='completed'),delivered,ID('script','en-v1'),videoid,[recordid])
 ]
 # Entity files
 docs={
 'brand.json':brand,'discovery.json':discovery,'analysis.json':analysis,'script.json':{'versions':scripts},
 'video.json':{'videos':videos},'delivery.json':delivery,'events.json':{'events':events},'assets.json':{'assets':assets},'expected.json':{'checkpoints':checkpoints}}
 manifest_files=[]
 for fn,data in docs.items():
  buf=write_json(root/fn,dict(schemaVersion='1.0.0',scenarioId=sid,scenarioVersion=version,data=data))
  manifest_files.append(dict(path=fn,bytes=len(buf),sha256=sha(buf)))
 manifest=dict(schemaVersion='1.0.0',scenarioId=sid,scenarioVersion=version,title=cfg['title'],slug=slug,mode='mock',timeZone='Asia/Dubai',locales=['en','ar'],stages=phases,entryBriefId=briefid,entryScriptVersionId=ID('script','en-v1'),entryVideoId=videoid,entryDeliveryId=planid,authoring=dict(producer='ChatGPT',authoredAt=NOW,reasoningSummary=f'Offline concept simulation: {cfg["topic"]}. Five invented source signals and two illustrative indices support a carefully limited product-grounded four-shot EN/AR script and a planned pre-produced media/never-sent delivery path.',assumptions=cfg['assumptions'],limitations=cfg['uncertainties']+['All platform inputs, plotted indices, execution events and delivery records are fabricated for a labelled Mock POC, not collected, rendered or sent.','Final video and poster are not present; asset bytes/hash/rights are null/pending so the immutable runnable Schema intentionally fails until customer media handoff.','30 fps video metadata is a target specification, not a measured file property.','Simulated delivery records depict counterfactual demo outcomes only; no real email was sent.'],reviewStatus='pending'),files=manifest_files)
 write_json(root/'manifest.json',manifest)
 # Readable artifacts
 content=[]
 content.append(f'# CONTENT REASONING — {cfg["title"]}\n\n**Scenario:** `{sid}` · `1.0.0` · Mock-only · author {NOW}\n')
 content.append('## A. 业务因果链（可审查依据，不是实时市场事实）\n')
 for i,(platform,title,summary,region,topic) in enumerate(cfg['sources'],1):content.append(f'- `e{i} → s{i}` / {platform} **SIMULATED** / {region}: {title}. {summary} 信号用途：{topic}。')
 content.append(f'\n模拟主序列：{cfg["trendvals"]}（固定 0–100 合成示意指数，2026-10-01 至 2026-11-01；单位不是帖子数、增长率或用户参与度），用于显示温和上升；对照序列：{cfg["controlvals"]}，方向为{"uncertain" if slug=="oud-storytelling" else "stable"}。两者均非真实平台观测。')
 content.append('\n## B. 观察、假设、商品匹配、营销建议\n')
 for x in cfg['insights']:content.append('- **创意观察：** '+x)
 content.append('\n**商品事实与创意之间的桥梁：** '+cfg['rationale'])
 content.append('\n**区域假设：** '+cfg['regional'])
 content.append('\n**建议：** '+cfg['recommendation'])
 content.append('\n**备选方向：**\n'+'\n'.join('- '+x for x in cfg['alternatives']))
 content.append('\n**尚未经验证：**\n'+'\n'.join('- '+x for x in cfg['uncertainties']))
 content.append('\n## C. Brief → 英语/阿拉伯语镜头中文回译\n')
 content.append(f'**Campaign:** {cfg["briefName"]}. **Audience:** {cfg["audience"]}  **CTA:** {cfg["cta"]}.')
 for i,(en,ar,zh) in enumerate(zip(cfg['english'],cfg['arabic'],cfg['zh']),1):content.append(f'\n{i}. {STARTS[i-1]}–{STARTS[i-1]+DURATION[i-1]} ms | EN: **{en}** | AR: **{ar}** | 中文回译：{zh}')
 content.append('\n**声音策略：** 静音、文字主导（所有 `voiceover=""`），未制作配音、未挑选或授权音乐。字幕 VTT 与画面文字同文；实片制作时应避免同时烧录文字与默认开启相同字幕轨导致重叠。')
 content.append('\n**品牌和阿拉伯文审核：** AR 是完整创意翻译草案，不是官方阿语名称/客户批准版本；需要 UAE 母语审阅措辞、RTL 版式、香调准确性、标点与 CTA。Lavish Perfumes、LAVISH OUD、PERLA 50ML UNISEX 保持官方拉丁文，不擅自创造官方阿文商标名称。')
 content.append('\n## D. Source / permission\n')
 for p in COMMON_PRODUCTS:content.append(f'- {p["officialName"]}: {p["factsSourceUrl"]} · {p["sku"]} · only official verifiedFacts fields used.')
 content.append('- Logo 与两款产品图片来自随附件提供的原始文件及回执；项目内部 POC 使用受用户允许，不推导公开商业广告许可。')
 content.append('\n## E. Handoff 与演示声明\n\nEN 视频与 poster 均未收到，AR 无匹配视频。模拟 delivery records 只是未来回放用**反事实预设事件**，不是邮件发送结果。受缺媒体影响不可 runnable/accepted。\n')
 (root/'CONTENT_REASONING.md').write_text('\n'.join(content)+'\n',encoding='utf-8')
 # Make exact readable storyboard, subtitles and bilingual scripts
 for lang in ('en','ar'):
  ss=next(x for x in scripts if x['language']==lang)
  lines=[f'# {cfg["title"]} — {lang.upper()} Script v1','',f'**Script ID:** `{ss["id"]}` | **Duration:** 15.000s | **Language:** {lang} | **Type:** text-led silent editorial | **Status:** draft / mock / brand review pending','',f'**Title:** {ss["title"]}',f'**Hook:** {ss["hook"]}',f'**Message:** {ss["message"]}',f'**CTA:** {ss["cta"]}','','## Four shots / storyboard','']
  for i,shot in enumerate(ss['shots'],1):
   lines.extend([f'### Shot {i} · {stamp(shot["startMs"])}–{stamp(shot["startMs"]+shot["durationMs"])}',f'- Text (verbatim): **{shot["onScreenText"]}**',f'- Visual: {shot["visual"]}',f'- Transition: {shot["transition"]}',f'- Asset IDs: {", ".join(shot["assetIds"])}',f'- Voiceover: none (silent editorial); no music rights claimed.',''])
  lines.extend(['## Social caption',ss['caption'],'','## Hashtags',' '.join(ss['hashtags']),'','## Subtitle source',f'`media/{slug}-{lang}{".vtt" if lang=="en" else "-review.vtt"}`','', '**Disclosure:** Offline-written Mock POC draft. No real AI execution, video render, platform capture or delivery. Arabic native/brand review pending.'])
  (root/f'SCRIPT_{lang.upper()}.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
 vidbrief=[f'# VIDEO DELIVERY BRIEF — {cfg["title"]}','',f'**Target:** `{loc(slug+"-en-15s.mp4")}` · pre-produced / **NOT RECEIVED**','',f'- Target media: 1080×1920, 9:16, 15.000s, target 30 fps (not measured); H.264/yuv420p; optional authorized audio AAC only.','- Intended output: EN cut mapped **only** to `'+ID('script','en-v1')+'`; Arabic is complete script/VTT for review and has no AR video binding.','- Product/Logo images: supplied original 2000px product photos and opaque square 294px logo; no AI bottle redraw, no crop of label, maintain source proportions.','- Sound: deliberately silent and text-led. voiceover=""; no music track selected or licensed.','- Text treatment: subtitle text equals designed on-screen text. Do not burn text plus display VTT as a second duplicate line by default.','- Motion: use subtle 2D framing, not fictional real-world footage or product re-rendering.','- Video generation/rendering is OUTSIDE this authored content package; user will provide finished MP4 for later content and technical validation.','','## Shot-by-shot binding (EN video)','']
 for i,shot in enumerate(scripts[0]['shots'],1):vidbrief.extend([f'### Shot {i}: {stamp(shot["startMs"])}–{stamp(shot["startMs"]+shot["durationMs"])}',f'- Asset IDs: {", ".join(shot["assetIds"])}',f'- Visual / movement: {shot["visual"]}',f'- Verbatim on-screen text and VTT: **{shot["onScreenText"]}**',f'- VO: none.  Subtitle: {stamp(scripts[0]["subtitles"][i-1]["startMs"])} --> {stamp(scripts[0]["subtitles"][i-1]["endMs"])}',''])
 vidbrief.extend(['## Poster request','',f'- URI: `{loc(slug+"-en-poster.jpg")}` · poster JPEG target 1080×1920, not received.','- Must be a genuine frame or separately approved identical-product still matching the actual final EN cut; retain full Lavish marks, clear negative space and accurate bottle.','- Need product/brand visual check, permission, media byte length/SHA, decode and ffprobe before activating the scenario.','', '## Localization and handoff','',f'- AR review draft: `SCRIPT_AR.md` / `{slug}-ar-review.vtt`. No AR film, do not attach AR VTT to EN video.','- Native Arabic proofreading and brand sign-off pending.','- Actual customer MP4 content/timing cannot be checked from script alone.','- Runtime must label the footage `Pre-produced video / Mock` and cannot mark it ready before file validation.'])
 (root/'VIDEO_DELIVERY_BRIEF.md').write_text('\n'.join(vidbrief)+'\n',encoding='utf-8')
 missing=['# MISSING ASSETS — '+cfg['title'],'','This is a draft content handoff, **not** a runnable POC package. The following entries represent real missing files; no byte hashes or fake artifacts are supplied.','','| assetId | Target file | Target URI | Requirement | Provider / owner | Status |','|---|---|---|---|---|---|']
 missing.append(f'| `{ID("asset","video-en")}` | `{slug}-en-15s.mp4` | `{loc(slug+"-en-15s.mp4")}` | Actual 15s, 1080×1920 9:16, H.264/yuv420p, planned 30 fps, align all 4 EN shots and CTA; no forbidden product claims; AAC only if authorized | Customer later supplies matching MP4; Astra validates content | **MISSING / pending** |')
 missing.append(f'| `{ID("asset","poster-en")}` | `{slug}-en-poster.jpg` | `{loc(slug+"-en-poster.jpg")}` | Actual matching JPEG poster, target 1080×1920, approved Lavish bottle and logo identities | Customer / approved production team, Astra reviews | **MISSING / pending** |')
 missing.extend(['','**No AR video is claimed.** Arabic VTT exists as a review text document but is not bound to the English video.','', '## Files actually present',''])
 for a in assets:
  if a['bytes'] is not None:missing.append(f'- `{a["id"]}` → `media/{a["uri"].split("/")[-1]}`; {a["bytes"]} actual bytes; SHA-256 `{a["sha256"]}`.')
 missing.extend(['','## Before importing to runtime', '', '1. Obtain actual assets; do not replace with stock footage, reference HTML video or test fixtures.', '2. Verify frame-by-frame semantic match to this exact EN ScriptVersion and original Lavish packaging.', '3. Probe actual duration, resolution, codec, frame rate, audio and rights; write actual bytes/hash, not projected values.', '4. Update package files and manifest hashes; publish a new immutable version if content changes.', '5. Have Astra perform content, media, reducer and browser checks; no acceptance is claimed here.'])
 (root/'MISSING_ASSETS.md').write_text('\n'.join(missing)+'\n',encoding='utf-8')
 validation=[f'# VALIDATION NOTES — {sid}','',f'Authoring UTC: {NOW}', '','## Completed checks (authoring environment)', '- Ten JSON objects emitted and manifest nine file hashes calculated from actual UTF-8 bytes.', '- Original user-allowed Logo/product files copied byte-identically; file sizes, hashes and image dimensions checked.', '- EN and AR VTT authored from the exact four script subtitle lines and their timestamps.', '- Static JSON Schema validation and independent reference/event/time checks are reported by the included offline validator; see `VALIDATION_REPORT.json` generated after authoring.','', '## Deliberate draft-only Schema exceptions',f'- `assets.json` `/data/assets/{len(assets)-2}` and `/data/assets/{len(assets)-1}` are missing video/poster: `bytes:null`, `sha256:null`, `rightsStatus:"pending"` intentionally fail the frozen runnable asset Schema (expects non-null positive size, 64-hex hash, rightsStatus `approved_for_demo`).', '- `video.json` frameRate=30 and 1080×1920/15000ms denote TARGET metadata until actual media is supplied.', '- The planned `video.available` and `delivery.simulated` events belong only to a future complete Mock replay timeline. Their presence in a draft is NOT evidence of MP4 delivery, successful video validation or actual external email.','', '## Not run / not claimed', '- No Codex project `validate-scenario --replay`, no identical TypeScript reducer, no L3 projected-checkpoint comparator.', '- No Playwright/browser media test, ffprobe, video decode or delivery service call; media L5 cannot pass.', '- Not reviewed by Astra or PO, not accepted or ready, not placed in runtime scenarios/catalog.', '- No external platforms or model/video/email APIs contacted during Mock content authoring.']
 (root/'VALIDATION_NOTES.md').write_text('\n'.join(validation)+'\n',encoding='utf-8')
 return {'slug':slug,'path':str(root),'ids':dict(entryBriefId=briefid,entryScriptVersionId=ID('script','en-v1'),entryVideoId=videoid,entryDeliveryId=planid),'events':len(events),'files':len(manifest_files)+1,'assets':len(assets),'missing':[ID('asset','video-en'),ID('asset','poster-en')]}

if __name__=='__main__':
 results=[]
 for slug,cfg in CASES.items():
  result=build(slug,cfg);results.append(result);print('BUILT',result)
 write_json(OUT/'CONTENT_INDEX.json',dict(bundleType='draft_only_content_inbox',authoredAt=NOW,scenarios=results,disclaimer='Fully Mock business content; media missing; no real capturing, video rendering or external delivery. Customer/Astra review pending.'))

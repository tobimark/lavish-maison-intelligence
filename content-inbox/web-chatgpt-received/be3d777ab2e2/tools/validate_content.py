#!/usr/bin/env python3
"""Offline content draft checks, not a substitute for project's runtime validator / reducer / L5.
Usage: python tools/validate_content.py --base content-inbox --schema /path/to/contracts/poc/scenario.schema.json
stdlib core; jsonschema optional for frozen Schema validation.
"""
from __future__ import annotations
import argparse, collections, datetime, hashlib, json, pathlib, re, sys

NAMES=['manifest','brand','discovery','analysis','script','video','delivery','events','assets','expected']
STAGES=['discovery','analysis','video','delivery']

def err(errors,code,msg):errors.append({'code':code,'message':msg})
def check(root,schema_file=None):
 errors=[];warnings=[];stage_out={};root=pathlib.Path(root)
 docs={}
 for n in NAMES:
  p=root/(n+'.json')
  if not p.is_file():err(errors,'MISSING_FILE',str(p));continue
  try:docs[n]=json.loads(p.read_text(encoding='utf-8-sig'))
  except Exception as ex:err(errors,'JSON_PARSE',f'{p}: {ex}')
 if len(docs)!=10:return dict(root=str(root),errors=errors,warnings=warnings,passed=False)
 mf=docs['manifest']; sid=mf['scenarioId'];slug=mf['slug'];ver=mf['scenarioVersion']
 for n in NAMES[1:]:
  for f,v in [('schemaVersion','1.0.0'),('scenarioId',sid),('scenarioVersion',ver)]:
   if docs[n].get(f)!=v:err(errors,'DOC_METADATA',f'{n}.{f} != {v}')
 files={f['path']:f for f in mf['files']}
 if set(files)!=set(n+'.json' for n in NAMES[1:]):err(errors,'MANIFEST_FILES',f'{list(files)}')
 for name,rec in files.items():
  p=root/name;raw=p.read_bytes()
  if rec['bytes']!=len(raw) or rec['sha256']!=hashlib.sha256(raw).hexdigest():err(errors,'MANIFEST_HASH',name)
 stage_out['manifest_hashes']='pass' if not any(e['code']=='MANIFEST_HASH' for e in errors) else 'fail'
 # frozen schema; missing media exceptions are counted, not silently ignored
 schema_errors=[]
 if schema_file:
  try:
   import jsonschema
   schema=json.loads(pathlib.Path(schema_file).read_text())
   for name in NAMES:
    validator=jsonschema.Draft202012Validator({'$schema':schema['$schema'],'$defs':schema['$defs'],'$ref':'#/$defs/'+name},format_checker=jsonschema.FormatChecker())
    for e in sorted(validator.iter_errors(docs[name]),key=lambda e:str(e.path)):
     schema_errors.append(dict(file=name+'.json',jsonPointer='/'+ '/'.join(str(x) for x in e.path),message=e.message))
   stage_out['frozen_schema']='fail (expected: missing MP4/poster fields)' if schema_errors else 'pass'
  except ImportError:
   stage_out['frozen_schema']='NOT_RUN (jsonschema unavailable)'
  except Exception as ex:
   err(errors,'SCHEMA_CHECK_ERROR',str(ex));stage_out['frozen_schema']='error'
 else:stage_out['frozen_schema']='NOT_RUN (schema path not supplied)'
 allowed_schema=[]
 for e in schema_errors:
  p=e['jsonPointer'];matches=re.fullmatch(r'/data/assets/(5|6)/(bytes|sha256|rightsStatus)',p)
  if e['file']=='assets.json' and matches:allowed_schema.append(e)
  else:err(errors,'UNEXPECTED_SCHEMA',str(e))
 if schema_errors and len(allowed_schema)!=len(schema_errors):err(errors,'SCHEMA_EXCEPTIONS','Unexpected frozen schema errors')
 if len(allowed_schema)==6:stage_out['draft_exceptions']='6 known, deliberately blocking runnable media asset properties'
 elif schema_errors:err(errors,'DRAFT_EXCEPTION_COUNT',f'{len(allowed_schema)} known errors, expected 6')
 # entities/index
 d={n:docs[n]['data'] for n in NAMES[1:]}
 idx={};kind_map={}
 for field,kind in [('products','product'),('evidence','evidence'),('signals','signal'),('trends','trend'),('analyses','analysis'),('briefs','brief'),('versions','script'),('videos','video'),('recipients','recipient'),('plans','plan'),('records','record'),('events','event'),('assets','asset')]:
  source={'products':'brand','evidence':'discovery','signals':'discovery','trends':'discovery','analyses':'analysis','briefs':'analysis','versions':'script','videos':'video','recipients':'delivery','plans':'delivery','records':'delivery','events':'events','assets':'assets'}[field]
  for o in d[source][field]:
   oid=o['id']
   if oid in idx:err(errors,'DUPLICATE_ID',oid)
   idx[oid]=o;kind_map[oid]=kind
   if not oid.startswith(sid+'.'+kind+'.'):err(errors,'BAD_ENTITY_ID',oid)
   if kind=='script':
    for nested,nkind in [('shots','shot'),('subtitles','subtitle')]:
     for y in o[nested]:
      if y['id'] in idx:err(errors,'DUPLICATE_ID',y['id'])
      idx[y['id']]=y;kind_map[y['id']]=nkind
      if not y['id'].startswith(sid+'.'+nkind+'.'):err(errors,'BAD_NESTED_ID',y['id'])
 br=d['brand']['brand'];idx[br['id']]=br;kind_map[br['id']]='brand'
 def require(ref,kind,context):
  if ref not in idx:err(errors,'DANGLING_REF',f'{context}: {ref}')
  elif kind_map[ref]!=kind:err(errors,'WRONG_REF_TYPE',f'{context}: {ref} expected {kind}, got {kind_map[ref]}')
 def refs(obj,key,kind):
  for x in obj.get(key,[]):require(x,kind,obj['id']+'/'+key)
 require(br['logoAssetId'],'asset','brand.logoAssetId')
 for o in d['brand']['products']:refs(o,'imageAssetIds','asset')
 for o in d['discovery']['signals']:refs(o,'evidenceIds','evidence')
 for o in d['discovery']['trends']:
  refs(o,'signalIds','signal')
  times=[pt['at'] for pt in o['points']];vals=[pt['value'] for pt in o['points']]
  if times!=sorted(times) or len(set(times))!=len(times):err(errors,'TREND_TIMES',o['id'])
  if times[0]!=o['window']['start'] or times[-1]!=o['window']['end']:err(errors,'TREND_WINDOW',o['id'])
  if o['direction']=='rising' and vals[-1]<=vals[0]:err(errors,'TREND_DIRECTION',o['id'])
 for o in d['analysis']['analyses']:refs(o,'trendIds','trend');refs(o,'evidenceIds','evidence')
 for o in d['analysis']['briefs']:require(o['analysisId'],'analysis',o['id']);refs(o,'productIds','product')
 for sc in d['script']['versions']:
  require(sc['briefId'],'brief',sc['id'])
  shots=sc['shots']
  if len(shots)!=4 or any(o['startMs']!=sum(x['durationMs'] for x in shots[:i]) for i,o in enumerate(shots)) or sum(o['durationMs'] for o in shots)!=15000:err(errors,'SHOT_TIMING',sc['id'])
  for shot in shots:refs(shot,'assetIds','asset')
  for su in sc['subtitles']:
   if not (0<=su['startMs']<su['endMs']<=15000):err(errors,'SUBTITLE_TIME',su['id'])
   if not any(sh['startMs']<=su['startMs']<su['endMs']<=sh['startMs']+sh['durationMs'] for sh in shots):err(errors,'SUBTITLE_SHOT_BOUNDARY',su['id'])
  subtitle_text=[x['text'] for x in sc['subtitles']]
  onscreen=[x['onScreenText'] for x in sc['shots']]
  if subtitle_text!=onscreen:err(errors,'SUBTITLE_TEXT',sc['id'])
 if set(s['language'] for s in d['script']['versions'])!={'en','ar'}:err(errors,'LANGUAGES','Need both EN/AR')
 for v in d['video']['videos']:
  require(v['scriptVersionId'],'script',v['id']);refs(v,'storyboardShotIds','shot');require(v['mp4AssetId'],'asset',v['id']);require(v['posterAssetId'],'asset',v['id']);refs(v,'subtitleAssetIds','asset')
  if v['scriptVersionId'] in idx and v['storyboardShotIds'] != [sh['id'] for sh in idx[v['scriptVersionId']]['shots']]:err(errors,'VIDEO_SHOTS',v['id'])
 for p in d['delivery']['plans']:
  require(p['scriptVersionId'],'script',p['id']);require(p['videoId'],'video',p['id']);refs(p,'recipientIds','recipient');refs(p,'attachmentAssetIds','asset')
  if idx[p['videoId']]['scriptVersionId'] != p['scriptVersionId']:err(errors,'DELIVERY_SCRIPT_MISMATCH',p['id'])
  if idx[p['videoId']]['mp4AssetId'] not in p['attachmentAssetIds']:err(errors,'DELIVERY_MISSING_MP4',p['id'])
 for r in d['delivery']['records']:require(r['planId'],'plan',r['id'])
 for rec in d['delivery']['recipients']:
  if not rec['email'].endswith('.invalid') or rec['isSimulated'] is not True:err(errors,'RECIPIENT_NOT_SIMULATED',rec['id'])
 if mf['entryBriefId'] not in idx or mf['entryScriptVersionId'] not in idx or mf['entryVideoId'] not in idx or mf['entryDeliveryId'] not in idx:err(errors,'ENTRY_DANGLING',sid)
 else:
  brf=idx[mf['entryBriefId']];script=idx[mf['entryScriptVersionId']];video=idx[mf['entryVideoId']];plan=idx[mf['entryDeliveryId']]
  if not (script['briefId']==brf['id'] and video['scriptVersionId']==script['id'] and plan['scriptVersionId']==script['id'] and plan['videoId']==video['id']):err(errors,'ENTRY_CHAIN',sid)
 # files and media hashes
 for a in d['assets']['assets']:
  if a['bytes'] is None or a['sha256'] is None:
   if not (a['kind'] in ('video','poster') and a['rightsStatus']=='pending'):err(errors,'UNEXPECTED_MISSING_ASSET',a['id'])
   continue
  path=root/'media'/a['uri'].split('/')[-1]
  if not path.is_file():err(errors,'MEDIA_FILE_ABSENT',str(path));continue
  raw=path.read_bytes()
  if len(raw)!=a['bytes'] or hashlib.sha256(raw).hexdigest()!=a['sha256']:err(errors,'MEDIA_HASH',a['id'])
  if path.suffix=='.vtt':
   if not raw.startswith(b'WEBVTT\n') or b' --> ' not in raw:err(errors,'BAD_VTT',a['id'])
 for e in d['events']['events']:
  if e['scenarioId']!=sid or e['scenarioVersion']!=ver or e['mode']!='mock':err(errors,'EVENT_METADATA',e['id'])
  if e['sequence']<1:err(errors,'EVENT_SEQUENCE',e['id'])
 ev=d['events']['events']
 if [e['sequence'] for e in ev]!=list(range(1,len(ev)+1)):err(errors,'EVENT_SEQUENCE','Sequence not dense')
 if [e['atMs'] for e in ev]!=sorted(e['atMs'] for e in ev):err(errors,'EVENT_TIME','Unsorted atMs')
 # Build staged-visible refs and independently verify output, dependency access and checkpoint snapshots (not same runtime reducer!)
 foundational={x for x,k in kind_map.items() if k in ('brand','product','asset','evidence','recipient')}
 visible=set();wf=dict(discovery='ready',analysis='locked',video='locked',delivery='locked'); active_script=None;active_video=None;delivery_records=[];ckmap={c['cursorSequence']:c for c in d['expected']['checkpoints']};
 if 0 not in ckmap:err(errors,'CKPT_MISSING','cursor0')
 else:
  init=dict(cursorSequence=0,workflow=dict(discovery='ready',analysis='locked',video='locked',delivery='locked'),visibleEntityIds=[],activeScriptVersionId=None,activeVideoId=None,deliveryRecordIds=[])
  if ckmap[0]!=init:err(errors,'CHECKPOINT_ZERO','cursor0 not initial state')
 stage_events=collections.Counter((e['stage'],e['type']) for e in ev)
 for st in STAGES:
  for typ in ('stage.started','stage.completed'):
   if stage_events[(st,typ)]!=1:err(errors,'STAGE_EVENT_COUNT',f'{st} {typ}: {stage_events[(st,typ)]}')
 for i,e in enumerate(ev,1):
  t=e['type'];st=e['stage'];p=e['payload']
  for ref in e['inputRefs']:
   if ref not in (foundational|visible):err(errors,'EVENT_FUTURE_INPUT',f'{e["id"]}: {ref}')
  expected_outputs=[]
  key={'signal.discovered':'signalId','trend.summarized':'trendId','analysis.presented':'analysisId','brief.presented':'briefId','script.presented':'scriptVersionId','video.queued':'videoId','video.available':'videoId','delivery.queued':'planId','delivery.simulated':'recordId'}.get(t)
  if key:expected_outputs=[p[key]]
  if e['outputRefs'] != expected_outputs:err(errors,'EVENT_OUTPUT',f'{e["id"]}: {e["outputRefs"]}, expected {expected_outputs}')
  direct_inputs=[]
  if t=='signal.discovered':direct_inputs=idx[p['signalId']]['evidenceIds']
  elif t=='trend.summarized':direct_inputs=idx[p['trendId']]['signalIds']
  elif t=='analysis.presented':
   a=idx[p['analysisId']];direct_inputs=a['trendIds']+a['evidenceIds']
  elif t=='brief.presented':
   a=idx[p['briefId']];direct_inputs=[a['analysisId']]+a['productIds']
  elif t=='script.presented':direct_inputs=[idx[p['scriptVersionId']]['briefId']]
  elif t=='script.confirmed':direct_inputs=[p['scriptVersionId']]
  elif t in ('video.queued','video.available'):
   v=idx[p['videoId']];direct_inputs=[v['scriptVersionId']]+v['storyboardShotIds']+[v['mp4AssetId'],v['posterAssetId']]+v['subtitleAssetIds']
  elif t=='video.progressed':direct_inputs=[p['videoId']]
  elif t=='delivery.queued':
   plan=idx[p['planId']];direct_inputs=[plan['scriptVersionId'],plan['videoId']]+plan['recipientIds']+plan['attachmentAssetIds']
  elif t=='delivery.simulated':direct_inputs=[idx[p['recordId']]['planId']]
  if e['inputRefs']!=direct_inputs:err(errors,'EVENT_DIRECT_DEPS',f'{e["id"]}: {e["inputRefs"]}; expected {direct_inputs}')
  if t=='stage.started':
   if wf[st]!='ready':err(errors,'EVENT_STAGE_START',e['id'])
   wf[st]='running'
  if t=='script.presented':wf['analysis']='awaiting_confirmation'
  if t=='script.confirmed':
   if p['scriptVersionId']!=mf['entryScriptVersionId']:err(errors,'SCRIPT_CONFIRM',e['id'])
   wf['analysis']='running'
  if t=='delivery.queued':
   active_video=idx[p['planId']]['videoId']
   if e['atMs']<idx[p['planId']]['scheduledVirtualMs']:err(errors,'DELIVERY_SCHEDULE',e['id'])
  if t=='delivery.simulated':
   r=idx[p['recordId']]
   if r['outcome']!='simulated_delivered' or r['atMs']!=e['atMs']:err(errors,'DELIVERY_RECEIPT',e['id'])
   delivery_records.append(r['id'])
  visible.update(e['outputRefs'])
  if t=='script.presented':
   sc=idx[p['scriptVersionId']]
   visible.update(x['id'] for x in sc['shots']);visible.update(x['id'] for x in sc['subtitles'])
   if active_script is None:active_script=sc['id']
  if t=='stage.completed':
   if wf[st]!='running':err(errors,'STAGE_COMPLETED_BAD_STATE',e['id'])
   wf[st]='completed'
   k=STAGES.index(st)
   if k<3:wf[STAGES[k+1]]='ready'
  if i in ckmap:
   c=ckmap[i];expected=dict(cursorSequence=i,workflow=wf,visibleEntityIds=sorted(visible),activeScriptVersionId=active_script,activeVideoId=active_video,deliveryRecordIds=delivery_records)
   if c!=expected:err(errors,'CHECKPOINT_STATIC',f'cursor{i} differs; runtime reducer NOT executed')
 if set(ckmap)!={0}|{e['sequence'] for e in ev if e['type']=='stage.completed'}:err(errors,'CHECKPOINT_SET','Expected 0+4 stage completed')
 if len(ev)!=28:err(errors,'EVENT_COUNT',f'Unexpected {len(ev)} events')
 if any(a['kind']=='video' and a['bytes'] is not None for a in d['assets']['assets']):warnings.append('Received video should be separately L5/probed; current authoring checker cannot guarantee readiness.')
 warnings.extend(['Frozen schema intentionally fails for 2 pending media assets (6 property errors).','Runtime reducer comparison, browser/media decode, client brand review: NOT_RUN.','Simulated delivered and failed records are authored future demo fixtures, not actual results.'])
 return {'scenarioId':sid,'scenarioVersion':ver,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z'),'files':len(docs),'events':len(ev),'checkpoints':len(ckmap),'assets':len(d['assets']['assets']),'schemaErrors':schema_errors,'draftAllowedSchemaExceptionCount':len(allowed_schema),'staticAuthoringChecks':stage_out,'errors':errors,'warnings':warnings,'ready':False,'runnable':False,'passAuthoringNonMedia':not errors,'l3RuntimeReducer':'NOT_RUN','l5Media':'NOT_RUN'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--base',default='content-inbox');p.add_argument('--schema');p.add_argument('--report');args=p.parse_args()
 base=pathlib.Path(args.base);results=[]
 for d in sorted(base.glob('*/1.0.0')):
  if d.is_dir():
   rep=check(d,args.schema);results.append(rep)
   (d/'VALIDATION_REPORT.json').write_text(json.dumps(rep,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   print(rep['scenarioId'],'authoring non-media pass',rep['passAuthoringNonMedia'],'schema errors',len(rep['schemaErrors']),'other errors',len(rep['errors']))
 report={'scenarios':results,'summary':{'scenarioCount':len(results),'nonMediaPassCount':sum(r['passAuthoringNonMedia'] for r in results),'runnableCount':0,'l3RuntimeReducer':'NOT_RUN','l5Media':'NOT_RUN'}}
 if args.report:pathlib.Path(args.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 return 0 if all(r['passAuthoringNonMedia'] for r in results) and len(results)>0 else 1
if __name__=='__main__':sys.exit(main())

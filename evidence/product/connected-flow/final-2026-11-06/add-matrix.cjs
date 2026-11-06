const fs=require('fs');
const p='docs/INTERACTION_AUDIT_MATRIX.csv';
let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n').replace(/\n$/,'');
const rows=[
['OV-explore-journey','Home','Explore the campaign','Open the SERENITY A 1.1.0 connected journey; one primary case entry','getCampaignJourney','Read only','URL','FLOW-E2E-HOME'],
['OV-journey-open','Home','Open the full journey','Open the same Campaign journey without stage','getCampaignJourney','Read only','URL','FLOW-E2E-HOME'],
['OV-journey-insight','Home','Journey stage summary: insight','Deep-link to insight stage for the exact campaign version','getCampaignJourney','Read only','URL','FLOW-E2E-HOME'],
['OV-journey-strategy','Home','Journey stage summary: strategy','Deep-link to strategy stage for the exact campaign version','getCampaignJourney','Read only','URL','FLOW-E2E-HOME'],
['OV-journey-creative','Home','Journey stage summary: creative','Deep-link to creative stage for the exact campaign version','getCampaignJourney','Read only','URL','FLOW-E2E-HOME'],
['OV-journey-social','Home','Journey stage summary: social','Deep-link to social stage for the exact campaign version','getCampaignJourney','Read only','URL','FLOW-E2E-HOME'],
['FLOW-stage-insight','Journey','Stage tab: Market insight','Navigate to the insight stage with active state truthful','getCampaignJourney','Read only','URL','FLOW-E2E-STAGES'],
['FLOW-stage-strategy','Journey','Stage tab: Campaign idea','Navigate to the strategy stage with active state truthful','getCampaignJourney','Read only','URL','FLOW-E2E-STAGES'],
['FLOW-stage-creative','Journey','Stage tab: Creative development','Navigate to the creative stage with active state truthful','getCampaignJourney','Read only','URL','FLOW-E2E-STAGES'],
['FLOW-stage-social','Journey','Stage tab: Social post','Navigate to the social stage with active state truthful','getCampaignJourney','Read only','URL','FLOW-E2E-STAGES'],
['FLOW-view-evidence','Journey Insight','View evidence','Open the prepared evidence dialog; close returns to insight','getCampaignJourney','Read only','UI only','FLOW-E2E-EVIDENCE'],
['FLOW-next-strategy','Journey Insight','Next: Campaign idea','Continue to strategy; no prior-stage completion required','getCampaignJourney','Read only','URL','FLOW-E2E-NEXT'],
['FLOW-open-brief','Journey Strategy','Open full brief','Open the exact Campaign Brief route','getCampaignJourney','Read only','URL','FLOW-E2E-BRIEF'],
['FLOW-next-creative','Journey Strategy','Next: Creative development','Continue to the creative stage','getCampaignJourney','Read only','URL','FLOW-E2E-NEXT'],
['FLOW-video','Journey Creative','Provided preview video','Native controls play the real 10.08s 720x960 MP4; no autoplay/regeneration','getProvidedAssets','No business mutation','None','FLOW-E2E-VIDEO'],
['FLOW-script-en','Journey Creative','EN concept script','Show the real EN four-shot script version','getCampaignJourney','Read only','UI only','FLOW-E2E-SCRIPT'],
['FLOW-script-ar','Journey Creative','AR concept script','Show the real AR four-shot draft; RTL text','getCampaignJourney','Read only','UI only','FLOW-E2E-SCRIPT'],
['FLOW-next-social','Journey Creative','Next: Social post','Continue to the social stage','getCampaignJourney','Read only','URL','FLOW-E2E-NEXT'],
['FLOW-social-stage','Journey Social','Social post workspace','Preview/enable edit of the exact EN or AR preset post','getCampaignJourney','Read only until explicit action','None','FLOW-E2E-SOCIAL'],
['FLOW-social-language-en','Journey Social','EN post language','Switch to English preset/draft without overwriting AR','getCampaignJourney','Only selection','UI only','FLOW-E2E-SOCIAL'],
['FLOW-social-language-ar','Journey Social','AR post language','Switch to Arabic preset/draft without overwriting EN; RTL preview','getCampaignJourney','Only selection','UI only','FLOW-E2E-SOCIAL'],
['FLOW-social-caption','Journey Social','Caption field','Edit the selected language caption; unsaved edits are guarded','SocialWorkflow','Draft form only','None until Save','FLOW-E2E-SOCIAL'],
['FLOW-social-cta','Journey Social','CTA field','Edit the selected language CTA; unsaved edits are guarded','SocialWorkflow','Draft form only','None until Save','FLOW-E2E-SOCIAL'],
['FLOW-social-hashtags','Journey Social','Hashtags field','Edit hashtags; parsed and saved with the draft','SocialWorkflow','Draft form only','None until Save','FLOW-E2E-SOCIAL'],
['FLOW-social-edit','Journey Social','Edit post','Explicitly prepare/reuse a local draft; browsing alone creates none','prepareSocialDraft','Creates/reuses draft','IndexedDB socialWorkflows','FLOW-E2E-SOCIAL'],
['FLOW-social-save','Journey Social','Save draft','Persist exact caption/CTA/hashtags; revision+1; clears review hash','saveSocialDraft','Draft write','IndexedDB socialWorkflows','FLOW-E2E-SOCIAL'],
['FLOW-social-review','Journey Social','Review post','Open the exact saved snapshot; block if script not confirmed','reviewSocialDraft','Review only after explicit action','IndexedDB reviewHash','FLOW-E2E-REVIEW'],
['FLOW-social-simulate','Journey Social','Simulate publish','Open confirm dialog only for a reviewed draft with no unsaved changes','simulateSocialPublish','No write until confirm','None','FLOW-E2E-PUBLISH'],
['FLOW-social-discard','Journey Social','Discard unsaved edits','Restore the saved baseline without deleting the draft','SocialWorkflow','Draft form only','None','FLOW-E2E-SOCIAL'],
['FLOW-social-confirm-creative','Journey Social','Review creative / confirm script','Explicitly confirm the selected source script before review','beginCampaignEdit + confirm','Session/confirmation write','IndexedDB sessions','FLOW-E2E-CONFIRM'],
['FLOW-social-review-cancel','Journey Social','Cancel review','Close review dialog without changing draft/review hash','reviewSocialDraft','No change','None','FLOW-E2E-REVIEW'],
['FLOW-social-review-confirm','Journey Social','Confirm review','Lock the exact saved snapshot to a review hash; ready to simulate','reviewSocialDraft','Review write','IndexedDB socialWorkflows','FLOW-E2E-REVIEW'],
['FLOW-social-publish-cancel','Journey Social','Cancel simulated publish','Close dialog without writing an attempt','simulateSocialPublish','No change','None','FLOW-E2E-PUBLISH'],
['FLOW-social-publish-confirm','Journey Social','Simulate publish confirm','Atomically store one immutable simulated attempt + idempotency receipt','simulateSocialPublish','Attempt write','IndexedDB socialWorkflows','FLOW-E2E-PUBLISH'],
['FLOW-social-view-post','Journey Social','View simulated post','Open the immutable internal simulated post record','getSocialPost','Read only','URL','FLOW-E2E-POST'],
['FLOW-social-detail-back','Simulated post detail','Back to social stage','Return to the exact Campaign social stage','getCampaignJourney','Read only','URL','FLOW-E2E-POST'],
];
const esc=v=>`"${String(v).replace(/"/g,'""')}"`;
for (const r of rows) s+='\n'+r.map(esc).join(',');
fs.writeFileSync(p,s+'\n');
console.log('added',rows.length,'rows; total lines',s.split('\n').length);

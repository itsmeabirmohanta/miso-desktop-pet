import fs from 'node:fs/promises';
import path from 'node:path';

// Native OOXML package, with no external document dependencies.
// Preset: standard_business_brief; memo_masthead without a decorative rule.
// Named overrides: 23 pt title, 9 pt metadata/source text, 12 pt subtitle.
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let body = '', links = [];
function p(text, style='Normal', extra='') { body += `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`; }
function h(t) { p(t,'Heading1'); }
function sub(t) { p(t,'Heading2'); }
function bullet(t) { p(t,'ListBullet','<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'); }
function page(t, subtitle) { if(body) body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; p(t,'Title'); if(subtitle) p(subtitle,'Subtitle'); }
function link(label,url) { const id=`rIdLink${links.length+1}`; links.push({id,url}); body+=`<w:p><w:pPr><w:pStyle w:val="Source"/></w:pPr><w:hyperlink r:id="${id}"><w:r><w:rPr><w:color w:val="2E74B5"/><w:u w:val="single"/></w:rPr><w:t>${esc(label)}</w:t></w:r></w:hyperlink></w:p>`; }

page('MISO privacy policy update','Website team handoff • Google OAuth verification');
p('Project: misoyourlittlebutler | Project number: 157672432161','Meta');
p('Prepared: 14 October 2026 | Status: owner details and support process confirmed','Meta');
h('What needs to change');
p('Update the existing privacy policy at https://miso.abirmahanta.in/privacy-policy. Google requested five explicit disclosures: Google data accessed, how it is used, who receives it, how it is protected, and how long it is retained or how it is deleted. A working demo-video link must also be supplied separately.');
p('Pages 2–4 contain proposed website wording. Merge these sections into the existing policy, preserving accurate disclosures for the website and other data. Publish only the policy text, with its effective date and contact details; omit handoff labels and internal instructions.');
sub('Facts checked against the current source');
bullet('MISO is a desktop Google Calendar companion. It requests openid, email, calendar.app.created, calendar.events, and calendar.calendarlist.readonly.');
bullet('Account details, refresh tokens, settings, and a reduced event cache are saved locally with operating-system-backed encryption. Calendar API responses can include more event details than the saved cache.');
bullet('AI is optional and off by default. Enabled AI receives typed commands and clarification context through the user-selected provider or endpoint.');
sub('Confirmed details and release evidence');
p('Publisher: Abir Mahanta. Privacy contact: abirmediagroup@gmail.com. The owner adopted deletion of support emails and attachments within 30 days after case closure or a verified deletion request, including removal from Trash. Provider-held backups follow provider retention rules.');
p('The local v1.0.7 package’s main and preload bundles match an in-memory release build of the reviewed source byte for byte. The local installer matches its saved checksum. No sale, advertising, or model-training functionality was found. This check does not establish that the publicly hosted installer is identical.');
p('Set [EFFECTIVE DATE] to the actual publication date. The AI disclosure below describes the current app; provider retention and training practices depend on the selected service and account settings. Do not promise that arbitrary third-party endpoints prohibit training without verifying their terms and settings.');
p('Owner routing: website team publishes and checks links; app owner confirms data handling; Cloud project owner resubmits and replies to Google. This document does not publish changes or submit verification.','Meta');

page('Proposed privacy policy copy','Part 1 of 3 • Google data access and use');
p('Internal instruction: remove this page title and subtitle when copying to the website.','Meta');
h('Privacy Policy — MISO: Your Little Butler');
p('Effective date: [EFFECTIVE DATE]');
p('MISO: Your Little Butler (MISO) is provided by Abir Mahanta. This policy explains how MISO accesses, uses, shares, protects, retains, and deletes Google user data when you connect a Google account.');
sub('Google user data we access');
p('With your permission, MISO accesses your Google account identifier, email address, and email-verification status to identify the account you connect. MISO receives OAuth credentials, including access and refresh tokens, to connect to Google services without asking for your Google password.');
p('MISO reads your calendar list, including calendar identifiers, names, time zones, access roles, and default reminder settings. It accesses events on calendars used for its features. Google Calendar responses may include event identifiers, titles, descriptions, locations, start and end times, recurrence, reminders, status, organizer and attendee details, and meeting or conference information where present.');
p('The local event cache saves a reduced set of fields, including identifiers, titles, dates and times, time zones, recurrence, reminders, status, and MISO category metadata. Other returned details may be processed temporarily in memory. Synchronization can read a broader change feed; the saved reminder cache is limited separately.');
p('MISO can create calendars and create, update, or delete events within the permissions you grant. Its current Google integration does not access Gmail messages, Google Drive files, or Google Contacts.');
sub('How we use Google user data');
p('MISO uses account details to distinguish connected accounts; calendar information to let you choose calendars; and event data to synchronize your agenda, display event details, and schedule desktop reminders. It creates calendars for tasks, birthdays and dates, and reminders, and performs event changes you request through its interface.');
p('Tokens maintain your authorized connection. A limited local cache supports reminders and continuity between synchronizations. Google user data is used to provide these user-facing features, rather than for unrelated profiling.');

page('Proposed privacy policy copy','Part 2 of 3 • Sharing and protection');
p('Internal instruction: remove this page title and subtitle when copying to the website.','Meta');
h('Sharing, transfer, and disclosure');
p('MISO communicates directly with Google to authenticate your account and perform the Google Calendar operations you authorize. The current desktop application stores its account credentials and calendar cache on your device rather than uploading them to a MISO-operated backend.');
p('AI command processing is optional and disabled by default. If you enable it, your typed command, original command and clarification question or answer when relevant, and current date, time zone, and locale are sent to the service you select. Supported choices include Anthropic, OpenAI, Google Gemini, a compatible endpoint, or a local server such as Ollama. Only your selected service receives that request.');
p('Typed text may contain calendar or personal information you include. The current command parser does not automatically send your full Google Calendar, Google OAuth tokens, or connected-account email address to the AI service. A locally configured server processes requests at the endpoint you choose.');
p('The selected AI service handles and retains request text according to its own terms and your account or endpoint settings. MISO does not set a uniform retention period for these services or remotely delete their records. Review the selected service’s privacy, retention, and training settings before sending sensitive text. For a local server, you control its storage and logging configuration.');
p('We do not sell Google user data or share it with advertisers, data brokers, or information resellers. We do not use it for advertising, creditworthiness, or lending decisions. Other disclosure is limited to what is necessary for security or compliance with applicable law, or a business transfer after obtaining explicit prior user consent.');
sub('Limited Use and AI model training');
p('MISO’s use and transfer of information received from Google APIs adhere to the Google API Services User Data Policy, including its Limited Use requirements. MISO does not use Google Workspace API data to develop, improve, or train generalized or non-personalized AI or machine-learning models. The current desktop integration does not send Google Calendar API responses to AI providers. Optional AI processes the command text you enter as described above.');
sub('How we protect sensitive data');
p('MISO uses HTTPS for communications with Google and operating-system-backed encryption for its saved local vault, including account details, refresh tokens, settings, and the reduced calendar cache. It refuses to open its data store when secure operating-system credential storage is unavailable.');
p('Google sign-in uses your browser, an authorization code with PKCE, and a state check. The local sign-in callback uses a loopback address on your own device. MISO does not receive your Google password. Encryption protects stored data; access to an unlocked device or software running under your OS account can still expose it.');

page('Proposed privacy policy copy','Part 3 of 3 • Retention, deletion, and contact');
p('Internal instruction: remove this page title and subtitle when copying to the website.','Meta');
h('Data retention and deletion');
p('Connected-account identifiers, email addresses, account settings, and refresh tokens remain in your local MISO profile until you remove the account or reset local personal data. The current desktop app does not keep a separate server-side copy of these records.');
p('The saved event cache contains at most 2,000 reduced event records. Successful refreshes normally replace it with events spanning approximately one day in the past through 35 days ahead. This is a synchronization window, not a guaranteed deletion deadline: a saved cache can remain while the app is closed, offline, or unable to refresh.');
sub('How you can remove your data');
bullet('Remove a connected account in MISO Settings. This removes its locally saved account entry, refresh token, selected calendars, and cached events from the active profile. MISO also attempts to revoke Google access; if revocation fails, revoke access directly through your Google Account.');
bullet('Use “Start from scratch” to clear the active profile’s local accounts, saved AI keys, cached reminders, and personal preferences. This retains the application’s Google OAuth client configuration.');
bullet('Manage or revoke MISO’s permission in your Google Account under third-party connections. Revocation stops future authorized Google access; it does not itself erase an already saved local cache. Remove the account or reset MISO to clear that local data.');
p('Removing an account or resetting MISO does not delete calendars or events from your Google account. To delete those records, use Google Calendar or an explicit event-deletion action in MISO. Google controls retention of the records held by Google.');
p('These controls apply to the active profile. Any separate recovery profile, exported copy, device backup, or third-party AI record must be handled separately. MISO does not promise secure erasure of backup copies or automatic removal of profile data during uninstall.');
p('AI providers retain requests according to the terms and settings described above. If you voluntarily send support emails or attachments, we delete them within 30 days after the support case closes or after a verified deletion request. We also remove those items from Trash. Any email-provider backups follow that provider’s retention rules; this process does not promise immediate deletion from those backups. Do not send Google tokens, passwords, or unnecessary calendar details.');
sub('Contact and deletion assistance');
p('For privacy questions, support-data deletion requests, or help removing MISO data, contact Abir Mahanta at abirmediagroup@gmail.com. Because the current app stores its Google data locally, we cannot remotely erase files on your device; we can explain how to remove them.');

page('Publishing and verification','Internal checklist • Do not publish this page');
h('Website release checks');
bullet('Merge the reviewed wording into /privacy-policy. Set the actual publication date and add working policy/provider links. The owner must carry out the adopted 30-day support-data deletion process; website wording alone does not implement it.');
bullet('Keep the policy publicly readable over HTTPS without login or an access request. Link it clearly from the homepage. Check that app, publisher, and website branding are consistent.');
bullet('Open the policy in a signed-out/private browser. Check desktop and mobile layouts, deletion instructions, privacy contact, and the five disclosure headings.');
sub('Demo video: separate required action');
p('Record the submitted app’s complete OAuth flow, with the consent screen in English and all requested scopes visible. Demonstrate each scope’s feature: account connection, calendar listing/selection, calendar creation, and event viewing, creation, editing, and deletion. Use a test account and synthetic events.');
p('Upload to an accessible host, such as an unlisted YouTube video or a Drive file with “Anyone with the link” viewing. Test playback while signed out; access must not require approval. Send the working link in a reply to Google’s verification email.');
sub('Cloud Console and response');
p('For project misoyourlittlebutler (157672432161), confirm the privacy-policy URL in Google Auth Platform branding and compare Data Access scopes with the released app. Follow the resubmission request in the verification workflow, then reply in the existing email thread with the policy and video links. Website publication alone does not complete verification.');
p('Reply template — send only after completing the actions:','Meta');
p('Hello Google Verification Team,\nWe have updated the privacy policy for MISO: Your Little Butler, project misoyourlittlebutler (157672432161), to describe Google data access, use, sharing, protection, and retention/deletion.\nPrivacy policy: https://miso.abirmahanta.in/privacy-policy\nPublicly accessible demo video: [VIDEO URL]\nWe have updated/resubmitted the verification request in Cloud Console. Please continue your review.\nThank you,\n[NAME / TEAM]');
sub('Official references');
link('Google: privacy-policy findings and required disclosures','https://support.google.com/cloud/answer/13806988?hl=en');
link('Google: demo-video requirements and inaccessible-link fix','https://support.google.com/cloud/answer/13804565?hl=en');
link('Google API Services User Data Policy — Limited Use','https://developers.google.com/terms/api-services-user-data-policy');
link('Google Workspace API User Data and Developer Policy','https://developers.google.com/workspace/workspace-api-user-data-developer-policy');

// Preserve manual line breaks within the reply paragraph.
body=body.replaceAll('\n','</w:t><w:br/><w:t xml:space="preserve">');
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function style(id,size,color,before,after,line=264,bold=false,keep=false){return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${id}"/>${id!=='Normal'?'<w:basedOn w:val="Normal"/>':''}<w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/><w:jc w:val="left"/><w:widowControl/>${keep?'<w:keepNext/>':''}</w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="${color}"/><w:sz w:val="${size}"/>${bold?'<w:b/>':''}</w:rPr></w:style>`;}
const styles=`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="${W}">${style('Normal',22,'20252B',0,120)}${style('Title',46,'0B2545',0,100,264,true,true)}${style('Subtitle',24,'555555',0,140,264,false,true)}${style('Heading1',32,'2E74B5',320,160,264,true,true)}${style('Heading2',26,'2E74B5',240,120,264,true,true)}${style('Heading3',24,'1F4D78',160,80,264,true,true)}${style('ListBullet',22,'20252B',0,160,280)}${style('Meta',18,'555555',0,100)}${style('Source',18,'555555',0,70)}</w:styles>`;
const section='<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708"/></w:sectPr>';
const types=['document','styles','numbering','header1','footer1'].map(n=>`<Override PartName="/word/${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${n==='document'?'document.main':n.startsWith('header')?'header':n.startsWith('footer')?'footer':n}+xml"/>`).join('');
const entries={
 '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${types}</Types>`,
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
 'word/document.xml':`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${section}</w:body></w:document>`,
 'word/styles.xml':styles,
 'word/numbering.xml':`<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`,
 'word/header1.xml':`<w:hdr xmlns:w="${W}"><w:p><w:pPr><w:pStyle w:val="Meta"/></w:pPr><w:r><w:t>MISO  |  Website team handoff</w:t></w:r></w:p></w:hdr>`,
 'word/footer1.xml':`<w:ftr xmlns:w="${W}"><w:p><w:pPr><w:pStyle w:val="Meta"/><w:jc w:val="right"/></w:pPr><w:r><w:t>Draft for factual review  •  </w:t></w:r><w:fldSimple w:instr="PAGE"/></w:p></w:ftr>`,
 'word/_rels/document.xml.rels':`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[['rIdStyles','styles','styles.xml'],['rIdNumbering','numbering','numbering.xml'],['rIdHeader','header','header1.xml'],['rIdFooter','footer','footer1.xml']].map(([id,t,f])=>`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${t}" Target="${f}"/>`).join('')}${links.map(l=>`<Relationship Id="${l.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(l.url)}" TargetMode="External"/>`).join('')}</Relationships>`
};
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(const n of b)c=table[(c^n)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
let offset=0,locals=[],centrals=[];
for(const [name,value] of Object.entries(entries)){
 const filename=Buffer.from(name),data=Buffer.from(value),checksum=crc(data);
 const local=Buffer.alloc(30); local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt32LE(checksum,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(checksum,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);central.writeUInt32LE(offset,42);
 locals.push(local,filename,data);centrals.push(central,filename);offset+=local.length+filename.length+data.length;
}
const central=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(Object.keys(entries).length,8);end.writeUInt16LE(Object.keys(entries).length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
const out=path.resolve('outputs/MISO-Website-Privacy-Policy-Update.docx');
await fs.writeFile(out,Buffer.concat([...locals,central,end]));
console.log(JSON.stringify({output:out,parts:Object.keys(entries).length,pagesPlanned:5,words:body.replace(/<[^>]*>/g,' ').split(/\s+/).length}));

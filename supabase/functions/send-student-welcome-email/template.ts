// Student welcome email — MASTER TEMPLATE.
//
// Edit the wording here; the Edge Function (index.ts) only injects the student's name.
// No credentials go in the email body: the email/password are inside the attached
// personalised Student Guide PDF.
//
// Email-client rules followed: table layout, inline styles, bgcolor attributes (Outlook),
// no JavaScript, no web fonts required, 600px max width, readable on a white fallback.

export const SITE_URL = 'https://academy.brokenenglish.in';
export const SITE_LABEL = 'academy.brokenenglish.in';
export const SUPPORT_EMAIL = 'mediabrkn01@gmail.com'; // same contact as the sign-in page and the guide
export const LOGO_URL = `${SITE_URL}/assets/email/be-logo-480.png`; // genuine logo, white on transparent

export const SUBJECT = {
  welcome: 'Thank You for Choosing Broken English – Your Student Login Details',
  // Sent when an admin sets a NEW password and emails the updated guide.
  credentials: 'Thank You for Choosing Broken English – Your Student Login Details',
};

const HEADING = 'Thank You for Choosing Broken English!';

const GUIDE_POINTS = [
  'How to log in to your student account',
  'How to navigate your dashboard',
  'How to access your course and classes',
  'How to watch the available lessons',
  'How to track your learning progress',
  'How to use the Pronunciation Workshop',
  'How to access other available student features',
];

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const INK = '#1d1b2c', BODY = '#3e3e50', MUTED = '#6f6f84', BRAND = '#ed1f51', BRAND2 = '#f05825', NAVY = '#0b0b16';

function p(html: string, extra = ''): string {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:${BODY};${extra}">${html}</p>`;
}

export function renderHtml(studentName: string, kind: 'welcome' | 'credentials'): string {
  const name = escapeHtml(studentName);
  const intro = kind === 'credentials'
    ? 'Your student login details have been updated. Your personalized Student Login Details &amp; Course Guide, with your new password, is attached to this email.'
    : 'Your student account has been created successfully. Your personalized Student Login Details &amp; Course Guide is attached to this email.';
  const points = GUIDE_POINTS.map((t) =>
    `<tr><td width="22" valign="top" style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:${BRAND};font-weight:bold">&#8226;</td>`
    + `<td valign="top" style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:${BODY}">${t}</td></tr>`).join('');

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(SUBJECT[kind])}</title>
<style>
  @media only screen and (max-width:620px){
    .be-wrap{width:100% !important}
    .be-pad{padding-left:22px !important;padding-right:22px !important}
    .be-h1{font-size:24px !important;line-height:31px !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#ecebf1;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Your Broken English student account is ready. Your login details and course guide are attached.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ecebf1" style="background:#ecebf1">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" class="be-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px">
    <!-- header -->
    <tr><td bgcolor="${NAVY}" align="center" style="background:${NAVY};border-radius:14px 14px 0 0;padding:30px 24px 26px">
      <img src="${LOGO_URL}" width="200" height="82" alt="Broken English" style="display:block;width:200px;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold">
    </td></tr>
    <tr><td height="4" bgcolor="${BRAND}" style="height:4px;line-height:4px;font-size:0;background:${BRAND};background-image:linear-gradient(90deg,${BRAND2},${BRAND} 55%,#ff0552)">&nbsp;</td></tr>
    <!-- body -->
    <tr><td bgcolor="#ffffff" class="be-pad" style="background:#ffffff;padding:36px 44px 12px">
      <h1 class="be-h1" style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:27px;line-height:34px;font-weight:bold;color:${INK}">${HEADING}</h1>
      ${p(`Dear ${name},`, `color:${INK};font-weight:bold`)}
      ${p('Thank you for choosing Broken English for your English learning journey.')}
      ${p('We are excited to have you as part of our learning community.')}
      ${p(intro)}
      ${p('The attached PDF explains:', 'margin-bottom:10px')}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px">${points}</table>
      ${p('Please keep the attached PDF safe for future reference.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>
        <td bgcolor="#fff7ed" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:13px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#9a3412">
          <b>Keep it private:</b> the attached guide contains your password. Please do not forward it or share it with anyone.
        </td></tr></table>
      ${p('To get started, open the Broken English website and sign in using the email address and password provided in the attached guide.')}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px"><tr>
        <td bgcolor="${BRAND}" style="border-radius:10px;background:${BRAND};background-image:linear-gradient(135deg,#ff6b06,#f9182f 50%,#ff0552)">
          <a href="${SITE_URL}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">Open Broken English</a>
        </td></tr></table>
      ${p(`If you experience any difficulty logging in or accessing your classes, please contact the Broken English support team using the contact details provided in the guide.`)}
      ${p('We wish you a wonderful learning experience!')}
      ${p(`Warm regards,<br><b style="color:${INK}">Broken English Team</b>`, 'margin-bottom:28px')}
    </td></tr>
    <!-- footer -->
    <tr><td bgcolor="#f6f5f9" class="be-pad" style="background:#f6f5f9;border-radius:0 0 14px 14px;padding:20px 44px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:${MUTED}">
      Support: <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};text-decoration:none">${SUPPORT_EMAIL}</a>
      &nbsp;&middot;&nbsp; <a href="${SITE_URL}" style="color:${BRAND};text-decoration:none">${SITE_LABEL}</a><br>
      You are receiving this email because a Broken English student account was created for this address.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderText(studentName: string, kind: 'welcome' | 'credentials'): string {
  const intro = kind === 'credentials'
    ? 'Your student login details have been updated. Your personalized Student Login Details & Course Guide, with your new password, is attached to this email.'
    : 'Your student account has been created successfully. Your personalized Student Login Details & Course Guide is attached to this email.';
  return [
    HEADING, '',
    `Dear ${studentName},`, '',
    'Thank you for choosing Broken English for your English learning journey.', '',
    'We are excited to have you as part of our learning community.', '',
    intro, '',
    'The attached PDF explains:',
    ...GUIDE_POINTS.map((t) => `- ${t}`), '',
    'Please keep the attached PDF safe for future reference.',
    'Keep it private: the attached guide contains your password. Please do not forward it or share it with anyone.', '',
    `To get started, open the Broken English website (${SITE_URL}) and sign in using the email address and password provided in the attached guide.`, '',
    'If you experience any difficulty logging in or accessing your classes, please contact the Broken English support team using the contact details provided in the guide.', '',
    'We wish you a wonderful learning experience!', '',
    'Warm regards,', 'Broken English Team', '',
    '--',
    `Support: ${SUPPORT_EMAIL} | ${SITE_LABEL}`,
  ].join('\n');
}

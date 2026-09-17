/* achievements.js — extracted verbatim from the original single-file index.html.
   Source lines: 1230-1263
   NOT an ES module: every global stays on `window` so inline onclick= handlers keep working. */
function renderAchievements(){
  if(!_viewGuardOk()){navigate('login');return;}
  const student = loadStudents()[currentSession.studentId];
  if(!student){logout();return;}
  const stats = getStudentStats(student.id);
  const earned = BADGES.filter(b=>b.check(stats));
  // Mark all currently earned badges as seen
  try{
    var seenKey = 'brokeneng_badgeseen_'+student.id;
    localStorage.setItem(seenKey, JSON.stringify(earned.map(function(b){return b.id;})));
  }catch(e){}
  const app = document.getElementById('app');
  app.innerHTML = sidebarHtml("achievements")+`
  <div id="main-content">
    ${topBarHtml(student)}
    ${mobileNavHtml("achievements")}
    <div style="padding:20px 16px 60px;max-width:960px">
      <h2 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;font-family:'Montserrat',sans-serif">Achievements</h2>
      <p style="font-size:13px;color:var(--muted);margin-bottom:24px">${earned.length} of ${BADGES.length} unlocked</p>
      <div class="ach-grid">
        ${BADGES.map(b=>{
          const got = b.check(stats);
          return`<div class="ach-card ${got?'earned':'locked-ach'}">
            <span class="ach-emoji">${b.emoji}</span>
            <div class="ach-name">${b.name}</div>
            <div class="ach-desc">${b.desc}</div>
            ${got?`<div class="ach-tag">Unlocked ✓</div>`:`<div class="ach-tag" style="background:rgba(255,255,255,.05);color:rgba(255,255,255,.25)">Locked</div>`}
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

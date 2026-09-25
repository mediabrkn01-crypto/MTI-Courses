/* student-guide.js — ADMIN app only. Builds the personalised "Student Welcome & Login Guide" PDF.

   ┌───────────────────────────────────────────────────────────────────────────────────────┐
   │ MASTER TEMPLATE — edit GUIDE below to change the guide for every future student.       │
   │ Only three values change per student: name, email and password. They are passed in by  │
   │ the Add Student / Set Password flow right after Supabase Auth accepted that password,  │
   │ and are never stored anywhere.                                                          │
   │                                                                                         │
   │ Screenshots live in /assets/guide/. To refresh them, replace those files (same names)  │
   │ with new captures of the student app at 1280×800 (2× is fine).                          │
   └───────────────────────────────────────────────────────────────────────────────────────┘ */
var GUIDE = {
  siteUrl: 'https://academy.brokenenglish.in',
  siteLabel: 'academy.brokenenglish.in',
  supportEmail: 'mediabrkn01@gmail.com',       // same contact shown on the student sign-in page
  fileName: 'Broken-English-Student-Guide-{name}.pdf',

  cover: {
    title: 'WELCOME TO BROKEN ENGLISH',
    subtitle: 'Your Student Login Details',
    useDetails: 'Use the email address and password above to sign in to your Broken English student account.',
    keepSafe: 'Please keep these login details safe and do not share your password with anyone. You can change your password at any time from your Profile.',
    contentsTitle: 'In this guide'
  },

  // Each section: title, intro, optional steps (numbered), bullets, images [{src, caption}], tip.
  sections: [
    {
      title: 'How to login',
      intro: 'Signing in takes less than a minute.',
      steps: [
        'Open the Broken English website: academy.brokenenglish.in',
        'The Student Login page opens.',
        'Enter your registered email address.',
        'Enter the password provided on the first page of this guide.',
        'Click Sign In.',
        'You will be taken to your Student Dashboard.'
      ],
      images: [{ src: 'assets/guide/01-login.jpg', caption: 'Step 1 — Sign in using your email and password.' }],
      tip: 'Forgot your password? Click "Forgot password?" on the sign-in page and we will email you a secure reset link.'
    },
    {
      title: 'Your Student Dashboard',
      intro: 'This is the first screen you see after signing in. It shows what to do next and how far you have come.',
      bullets: [
        ['Today\'s mission', 'Your next class. Click Continue mission to start it.'],
        ['Voice Score', 'Your overall course progress, shown as a level.'],
        ['Progress cards', 'Classes done, XP earned, Quizzes done and Classes unlocked.'],
        ['Journey progress', 'All 20 days of the course. Ticked days are complete.'],
        ['Your journey phases', 'The course is split into 5 phases of 4 days each.'],
        ['Left menu', 'Dashboard, The Course, Pronunciation Workshop, Live With Sreekanth and Achievements.']
      ],
      images: [{ src: 'assets/guide/02-dashboard.jpg', caption: 'Your Student Dashboard.' }]
    },
    {
      title: 'How to access your classes',
      intro: 'Your classes are in The Course — 20 missions across 5 phases.',
      steps: [
        'Click The Course in the left menu (or Continue mission on your Dashboard).',
        'Choose the class marked Up next and click Continue.',
        'Watch the class video.',
        'The class is marked complete when you finish the video. You can also click Mark Complete.',
        'Your progress is saved automatically, on every device you use.'
      ],
      images: [
        { src: 'assets/guide/03-course.jpg', caption: 'The Course — Completed, Up next and Locked classes.' },
        { src: 'assets/guide/04-lesson.jpg', caption: 'A class page: the video, mission objectives and the Mission challenge.' }
      ],
      tip: 'After you finish a class, its Mission challenge (a short quiz) unlocks. Score 70% or more to pass. Try the challenge to open the next class. Classes open one after another, and each new phase of 4 classes opens on a new day.'
    },
    {
      title: 'Pronunciation Workshop',
      intro: 'Short lessons that fix the everyday words people most often mispronounce. The workshop unlocks after you complete Day 4 of the course.',
      steps: [
        'Click Pronunciation Workshop in the left menu.',
        'Use the category buttons (All, Common, Animals, Hospital and more) to browse.',
        'Click a lesson card to open it.',
        'Watch the lesson. Finished lessons show a green tick.'
      ],
      images: [{ src: 'assets/guide/05-workshop.jpg', caption: 'Pronunciation Workshop.' }]
    },
    {
      title: 'Track your progress',
      intro: 'You can always see how far you have come:',
      bullets: [
        ['Completed', 'A green tick on classes you have finished.'],
        ['Up next', 'The next class for you to take.'],
        ['Locked', 'Classes that open as you move through the course.'],
        ['Course progress', 'The bar at the top of The Course (for example, 5/20).'],
        ['Journey progress', 'The row of days on your Dashboard.'],
        ['Voice Score', 'Your level rises as you complete more of the course.']
      ]
    },
    {
      title: 'More for you',
      bullets: [
        ['Achievements', 'Earn badges as you complete classes and pass quizzes. Open Achievements in the left menu to see them.'],
        ['Live With Sreekanth', 'Live sessions with Sreekanth. This unlocks after you complete all 30 classes — the 20 course classes and the 10 Pronunciation Workshop lessons.'],
        ['Profile', 'Click your initial at the top right to see your account details, how long your course access lasts, and to change your password.']
      ],
      images: [
        { src: 'assets/guide/06-achievements.jpg', caption: 'Achievements.' },
        { src: 'assets/guide/07-profile.jpg', caption: 'Your Profile — account details and password.' }
      ]
    }
  ],

  help: {
    title: 'Need help?',
    text: 'If you have trouble logging in or accessing your classes, contact the Broken English support team.'
  }
};

/* ─────────────────────────────── generator ─────────────────────────────── */
(function(){
  var JSPDF_URL='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var C={ ink:[20,20,32], body:[62,62,80], muted:[112,112,132], line:[226,224,232], soft:[246,245,249],
          brand:[237,31,81], brand2:[240,88,37], dark:[11,11,22], amber:[180,83,9], amberBg:[255,247,237] };

  function loadJsPDF(){
    if(window.jspdf&&window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise(function(res,rej){
      var s=document.createElement('script'); s.src=JSPDF_URL; s.crossOrigin='anonymous';
      s.onload=function(){ window.jspdf&&window.jspdf.jsPDF?res(window.jspdf.jsPDF):rej(new Error('PDF library failed to load')); };
      s.onerror=function(){ rej(new Error('Could not load the PDF library. Check your connection.')); };
      document.head.appendChild(s);
    });
  }
  function loadImg(src){
    return new Promise(function(res,rej){
      var i=new Image(); i.crossOrigin='anonymous';
      i.onload=function(){res(i);}; i.onerror=function(){rej(new Error('Missing image: '+src));};
      i.src=src;
    });
  }
  // Screenshot → rounded-corner JPEG sized for print (keeps the PDF small and sharp).
  function roundedJpeg(img,maxW,radiusRatio){
    var w=Math.min(maxW,img.naturalWidth), h=Math.round(img.naturalHeight*w/img.naturalWidth);
    var c=document.createElement('canvas'); c.width=w; c.height=h;
    var x=c.getContext('2d'); var r=Math.round(w*(radiusRatio||0.018));
    x.fillStyle='#ffffff'; x.fillRect(0,0,w,h);
    x.beginPath(); x.moveTo(r,0); x.arcTo(w,0,w,h,r); x.arcTo(w,h,0,h,r); x.arcTo(0,h,0,0,r); x.arcTo(0,0,w,0,r); x.closePath(); x.clip();
    x.drawImage(img,0,0,w,h);
    return {data:c.toDataURL('image/jpeg',0.86), w:w, h:h};
  }
  function pngFrom(img,maxW){
    var w=Math.min(maxW,img.naturalWidth), h=Math.round(img.naturalHeight*w/img.naturalWidth);
    var c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
    return {data:c.toDataURL('image/png'), w:w, h:h};
  }
  // Built-in PDF fonts only cover Latin-1. Names in other scripts are drawn as an image instead.
  var LATIN1=/^[\x20-\x7E\xA0-\xFF]*$/;
  function textImage(text,px,color,weight){
    var c=document.createElement('canvas'), x=c.getContext('2d');
    var font=(weight||'700')+' '+px+'px -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif';
    x.font=font; var w=Math.ceil(x.measureText(text).width)+8, h=Math.ceil(px*1.4);
    c.width=w*2; c.height=h*2; x=c.getContext('2d'); x.scale(2,2); x.font=font; x.fillStyle=color; x.textBaseline='middle';
    x.fillText(text,2,h/2);
    return {data:c.toDataURL('image/png'), w:w, h:h};
  }
  function safeFileName(name){
    var s=String(name||'Student').normalize('NFKD').replace(/[̀-ͯ]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
    return GUIDE.fileName.replace('{name}',s||'Student');
  }

  async function build(student){
    var JsPDF=await loadJsPDF();
    var doc=new JsPDF({unit:'mm',format:'a4',compress:true});
    var W=210,H=297,M=16,CW=W-2*M, y=0, pageNo=1;

    var logo=null; try{ if(typeof getLogoSrc==='function'&&getLogoSrc()) logo=pngFrom(await loadImg(getLogoSrc()),520); }catch(e){}
    var shots={};
    await Promise.all(GUIDE.sections.reduce(function(a,s){return a.concat(s.images||[]);},[]).map(function(im){
      return loadImg(im.src).then(function(i){shots[im.src]=roundedJpeg(i,1500);}).catch(function(){ shots[im.src]=null; });
    }));

    function color(c,fn){ doc[fn].apply(doc,c); }
    function footer(){
      doc.setFont('helvetica','normal'); doc.setFontSize(8); color(C.muted,'setTextColor');
      doc.text('Broken English  ·  Student Welcome & Login Guide',M,H-9);
      doc.text(String(pageNo),W-M,H-9,{align:'right'});
    }
    function newPage(){
      footer(); doc.addPage(); pageNo++;
      color(C.dark,'setFillColor'); doc.rect(0,0,W,12,'F');
      brandStripe(12,1.2);
      if(logo) doc.addImage(logo.data,'PNG',M,3.2,5.6*logo.w/logo.h,5.6);
      y=24;
    }
    function brandStripe(atY,h){
      var steps=40;
      for(var i=0;i<steps;i++){
        var t=i/(steps-1), r=Math.round(C.brand[0]+(C.brand2[0]-C.brand[0])*t), g=Math.round(C.brand[1]+(C.brand2[1]-C.brand[1])*t), b=Math.round(C.brand[2]+(C.brand2[2]-C.brand[2])*t);
        doc.setFillColor(r,g,b); doc.rect(W*i/steps,atY,W/steps+0.3,h,'F');
      }
    }
    function need(h){ if(y+h>H-18) newPage(); }
    function para(text,size,col,style,gap){
      doc.setFont('helvetica',style||'normal'); doc.setFontSize(size); color(col||C.body,'setTextColor');
      var lines=doc.splitTextToSize(text,CW); var lh=size*0.43;
      need(lines.length*lh+1);
      doc.text(lines,M,y+size*0.32); y+=lines.length*lh+(gap==null?3:gap);
    }
    function sectionTitle(n,title){
      need(22);
      color(C.brand,'setFillColor'); doc.roundedRect(M,y,9,9,2,2,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(255,255,255); doc.text(String(n),M+4.5,y+6.1,{align:'center'});
      doc.setFontSize(16); color(C.ink,'setTextColor'); doc.text(title.toUpperCase(),M+13,y+6.6);
      y+=14;
    }
    function steps(list){
      list.forEach(function(s,i){
        doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
        var lines=doc.splitTextToSize(s,CW-11); var h=lines.length*4.6+2.4;
        need(h);
        color(C.soft,'setFillColor'); doc.circle(M+3.2,y+2.9,3.2,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(9); color(C.brand,'setTextColor'); doc.text(String(i+1),M+3.2,y+4.1,{align:'center'});
        doc.setFont('helvetica','normal'); doc.setFontSize(10.5); color(C.body,'setTextColor'); doc.text(lines,M+10,y+4.1);
        y+=h;
      });
      y+=2;
    }
    function bullets(list){
      list.forEach(function(b){
        doc.setFontSize(10.5);
        var head=b[0]+': ';
        doc.setFont('helvetica','bold'); var hw=doc.getTextWidth(head);
        doc.setFont('helvetica','normal');
        var first=doc.splitTextToSize(b[1],CW-8-hw)[0]||'';
        var rest=b[1].slice(first.length).trim();
        var restLines=rest?doc.splitTextToSize(rest,CW-8):[];
        var h=(1+restLines.length)*4.6+2.2;
        need(h);
        color(C.brand,'setFillColor'); doc.circle(M+1.4,y+2.8,0.9,'F');
        doc.setFont('helvetica','bold'); color(C.ink,'setTextColor'); doc.text(head,M+5,y+4);
        doc.setFont('helvetica','normal'); color(C.body,'setTextColor'); doc.text(first,M+5+hw,y+4);
        if(restLines.length) doc.text(restLines,M+5,y+8.6);
        y+=h;
      });
      y+=2;
    }
    function image(im){
      var s=shots[im.src]; if(!s) return;
      var w=CW, h=w*s.h/s.w;
      if(h>150){ h=150; w=h*s.w/s.h; }
      need(h+10);
      var x=M+(CW-w)/2;
      doc.addImage(s.data,'JPEG',x,y,w,h,undefined,'FAST');
      color(C.line,'setDrawColor'); doc.setLineWidth(0.3); doc.roundedRect(x,y,w,h,2.4,2.4,'S');
      y+=h+4.5;
      doc.setFont('helvetica','italic'); doc.setFontSize(9); color(C.muted,'setTextColor');
      doc.text(im.caption,W/2,y,{align:'center'}); y+=7;
    }
    function callout(text,kind){
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      var lines=doc.splitTextToSize(text,CW-12); var h=lines.length*4.4+7;
      need(h+2);
      color(kind==='warn'?C.amberBg:C.soft,'setFillColor'); doc.roundedRect(M,y,CW,h,2.4,2.4,'F');
      color(kind==='warn'?C.amber:C.brand,'setFillColor'); doc.rect(M,y,1.4,h,'F');
      color(kind==='warn'?C.amber:C.body,'setTextColor'); doc.text(lines,M+6,y+5.4);
      y+=h+5;
    }

    /* ── Page 1: welcome + credentials ── */
    color(C.dark,'setFillColor'); doc.rect(0,0,W,78,'F');
    brandStripe(78,2);
    if(logo) doc.addImage(logo.data,'PNG',M,15,14*logo.w/logo.h,14);
    doc.setFont('helvetica','bold'); doc.setFontSize(23); doc.setTextColor(255,255,255);
    doc.text(GUIDE.cover.title,M,50);
    doc.setFont('helvetica','normal'); doc.setFontSize(12.5); doc.setTextColor(200,200,214);
    doc.text(GUIDE.cover.subtitle,M,60);
    y=94;

    // Credentials card
    var cardH=66;
    color(C.soft,'setFillColor'); color(C.line,'setDrawColor'); doc.setLineWidth(0.3);
    doc.roundedRect(M,y,CW,cardH,4,4,'FD');
    color(C.brand,'setFillColor'); doc.roundedRect(M,y,3,cardH,1.5,1.5,'F');
    var rows=[['STUDENT NAME',student.name,'name'],['LOGIN EMAIL',student.email,'email'],['PASSWORD',student.password,'pw']];
    rows.forEach(function(r,i){
      var ry=y+8+i*20;
      doc.setFont('helvetica','bold'); doc.setFontSize(8); color(C.muted,'setTextColor'); doc.text(r[0],M+10,ry);
      if(r[2]==='pw'){
        doc.setFont('courier','bold'); doc.setFontSize(17); color(C.ink,'setTextColor'); doc.text(r[1],M+10,ry+8.5);
      } else if(!LATIN1.test(r[1])){
        var ti=textImage(r[1],30,'#141420','700'); var th=7.2; doc.addImage(ti.data,'PNG',M+10,ry+2,th*ti.w/ti.h,th);
      } else {
        doc.setFont('helvetica','bold'); doc.setFontSize(r[2]==='email'?13:15); color(C.ink,'setTextColor');
        doc.text(doc.splitTextToSize(r[1],CW-20)[0],M+10,ry+8);
      }
      if(i<2){ color(C.line,'setDrawColor'); doc.line(M+10,ry+13,M+CW-8,ry+13); }
    });
    y+=cardH+8;

    para(GUIDE.cover.useDetails,11,C.body,'normal',4);
    // Website
    need(14);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); color(C.muted,'setTextColor'); doc.text('WEBSITE',M,y+3);
    doc.setFont('helvetica','bold'); doc.setFontSize(13); color(C.brand,'setTextColor');
    doc.textWithLink(GUIDE.siteLabel,M,y+10,{url:GUIDE.siteUrl});
    y+=17;
    callout(GUIDE.cover.keepSafe,'warn');

    // Contents
    y+=2;
    doc.setFont('helvetica','bold'); doc.setFontSize(11); color(C.ink,'setTextColor'); doc.text(GUIDE.cover.contentsTitle.toUpperCase(),M,y+3); y+=8;
    GUIDE.sections.concat([{title:GUIDE.help.title}]).forEach(function(s,i){
      doc.setFont('helvetica','normal'); doc.setFontSize(10.5); color(C.body,'setTextColor');
      doc.text((i+1)+'.  '+s.title,M+2,y+3); y+=6;
    });

    /* ── Guide sections (one reusable layout) ── */
    GUIDE.sections.forEach(function(s,i){
      // Sections flow on: start a new page only when there isn't room for the heading and
      // the first block of content (or on the first section, which follows the cover).
      var room=(s.images&&s.images.length)?175:95; // keep steps and their first screenshot together
      if(i===0||y>H-18-room) newPage();
      else { y+=6; color(C.line,'setDrawColor'); doc.setLineWidth(0.3); doc.line(M,y,W-M,y); y+=10; }
      sectionTitle(i+1,s.title);
      if(s.intro) para(s.intro,11,C.body,'normal',4);
      if(s.steps) steps(s.steps);
      if(s.bullets) bullets(s.bullets);
      (s.images||[]).forEach(image);
      if(s.tip) callout(s.tip);
    });

    /* ── Need help ── */
    need(60);
    y+=4;
    sectionTitle(GUIDE.sections.length+1,GUIDE.help.title);
    para(GUIDE.help.text,11,C.body,'normal',5);
    color(C.soft,'setFillColor'); doc.roundedRect(M,y,CW,26,3,3,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8); color(C.muted,'setTextColor');
    doc.text('EMAIL',M+8,y+8); doc.text('WEBSITE',M+CW/2,y+8);
    doc.setFontSize(12); color(C.brand,'setTextColor');
    doc.textWithLink(GUIDE.supportEmail,M+8,y+16,{url:'mailto:'+GUIDE.supportEmail});
    doc.textWithLink(GUIDE.siteLabel,M+CW/2,y+16,{url:GUIDE.siteUrl});
    y+=34;
    para('Welcome aboard — enjoy your classes!',11,C.ink,'bold',0);
    footer();

    doc.setProperties({title:'Broken English — Student Welcome & Login Guide',author:'Broken English',subject:'Student onboarding guide'});
    return {doc:doc,fileName:safeFileName(student.name)};
  }

  // Public: generate and download. student = {name, email, password} — password is the one
  // Supabase Auth has just accepted for this student; it is only held in memory by the caller.
  window.downloadStudentGuide=async function(student,btn){
    if(!student||!student.name||!student.email||!student.password) throw new Error('Student details are missing.');
    var label=btn?btn.innerHTML:'';
    if(btn){btn.disabled=true;btn.innerHTML='<span class="auth-spin" style="width:14px;height:14px"></span>Preparing PDF…';}
    try{
      var out=await build(student);
      out.doc.save(out.fileName);
      if(btn){btn.innerHTML='Downloaded ✓';setTimeout(function(){btn.disabled=false;btn.innerHTML=label;},1800);}
      return out.fileName;
    }catch(e){
      if(btn){btn.disabled=false;btn.innerHTML=label;}
      throw e;
    }
  };
  window._buildStudentGuide=build; // used by tests
})();

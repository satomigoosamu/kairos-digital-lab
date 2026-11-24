// Dependency-free, invented ASCII PDF. Contains no customer data.
export function syntheticPdf() {
  const commands=[];
  const text=(s,x,y)=>commands.push(`BT /F1 9 Tf 1 0 0 1 ${x} ${y} Tm (${s.replace(/[\\()]/g,'\\$&')}) Tj ET`);
  for(const [s,x] of [['Item',20],['content',60],['Ans',360],['revision',390],['answer',690]])text(s,x,560);
  for(const y of [540,480,420,360,300])commands.push(`20 ${y} 720 .5 re f`);
  const row=(n,y,q,ans,rev='',revAns='')=>{text(String(n),22,y);text(q,60,y);text(ans,365,y);if(rev)text(rev,390,y);if(revAns)text(revAns,695,y);};
  row(1,510,'Pick? (1) Amber (2) Blue','1','Shape? (1) Arc (2) Box','2');
  row(2,450,'Invented statement.','X');
  row(3,390,'Retired statement.','O','DELETE');
  row(4,330,'Pick? (1) A (2) B (3) C (4) D (5) E (6) F','6');
  const stream=commands.join('\n');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 800 600] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf='%PDF-1.4\n',offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const o of offsets.slice(1))pdf+=`${String(o).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

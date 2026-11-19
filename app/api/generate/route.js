import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export async function POST(req) {
  try {
    const body = await req.json();
    const { templateType, data } = body;

    let fileName = 'contract_template.docx';
    if (templateType === 'act_out') fileName = 'act_out_template.docx';
    if (templateType === 'act_in') fileName = 'act_in_template.docx';

    const filePath = path.resolve(process.cwd(), 'templates', fileName);
    const content = fs.readFileSync(filePath, 'binary');

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const encodedFileName = encodeURIComponent(`${fileName.split('_template')[0]}.docx`);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } catch (error) {
    console.error("Ошибка генерации:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
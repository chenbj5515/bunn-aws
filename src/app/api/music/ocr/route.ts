import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db/index';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

async function checkIsAdmin(userId: string): Promise<boolean> {
  const result = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return result[0]?.role === 'admin';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 });
    }

    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/png';

    const prompt = `这是一张歌词截图。请识别并提取其中的歌词文本。

要求：
1. 按行分割，每行一句歌词
2. 保持原文顺序
3. 返回 JSON 格式：{"lines": ["第一句", "第二句", ...]}
4. 只返回歌词原文，不要翻译
5. 如果图片中没有歌词文本，返回 {"lines": []}

请直接返回 JSON，不要包含 markdown 代码块。`;

    const result = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64Image}`,
            },
          ],
        },
      ],
    });

    let lines: string[] = [];
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        lines = parsed.lines || [];
      }
    } catch {
      lines = result.text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    return NextResponse.json({ lines });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR 识别失败' },
      { status: 500 }
    );
  }
}

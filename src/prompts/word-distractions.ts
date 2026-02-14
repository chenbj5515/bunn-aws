/**
 * 单词干扰项生成相关 Prompt
 */

export const CORRECT_PRONUNCIATION_SYSTEM = '你是日语发音专家。只返回标准的假名读音，不要任何解释或额外文字。';

export function getCorrectPronunciationPrompt(params: {
  word: string;
  meaning: Record<string, string>;
  kanaPronunciation: string;
}): string {
  const meaningStr = params.meaning.zh || params.meaning.en || Object.values(params.meaning)[0] || '未知';
  return `你是日语发音专家，请为汉字单词生成标准的假名读音。

单词: ${params.word}
意思: ${meaningStr}
现有读音: ${params.kanaPronunciation}

任务：生成这个汉字单词的标准假名读音。

注意：
- 考虑单词的意思和语境
- 返回最标准、最常用的读音
- 只返回假名，不要解释
- 如果现有读音已经正确，可以返回相同的读音

直接返回假名读音：`;
}

export const MEANING_DISTRACTIONS_SYSTEM = '你是日语教学助手，专门生成选择题的意思干扰项。返回标准JSON格式，无解释。';

export function getMeaningDistractionsPrompt(params: { word: string; zhMeaning: string }): string {
  return `为日语单词生成意思干扰项。

单词: ${params.word}
正确意思: ${params.zhMeaning}

任务：
1. 生成中文意思干扰项2个（与"${params.zhMeaning}"词性相同但意思明显不同）
2. 生成英文意思干扰项2个（对应中文干扰项的英文翻译）

要求：
- 干扰项与正确意思词性相同（名词、动词、形容词等）
- 意思要明显不同，不能是近义词
- 中文使用简体中文
- 英文要简洁准确

JSON格式：
{
  "zh": ["中文干扰1", "中文干扰2"],
  "en": ["English1", "English2"]
}

只返回JSON，无其他文字。`;
}

export function getPronunciationDistractionsSystemPrompt(correctPronunciation: string): string {
  return `你是错误发音制造专家！你的任务是故意制造错误的读音来迷惑学生。

🚫 绝对禁止事项：
1. 不能返回正确读音"${correctPronunciation}"
2. 不能返回任何与"${correctPronunciation}"完全相同的发音
3. 每个错误发音都必须与正确发音有明显的区别

✅ 任务目标：制造看似合理但明确错误的发音干扰项`;
}

export function getPronunciationDistractionsPrompt(params: {
  word: string;
  zhMeaning: string;
  correctPronunciation: string;
}): string {
  const { correctPronunciation } = params;
  return `你是错误发音制造专家，基于正确读音制造迷惑性的错误发音。

单词: ${params.word}
意思: ${params.zhMeaning}
正确读音: ${correctPronunciation}

🎯 任务：基于正确读音"${correctPronunciation}"，制造2个错误但具有迷惑性的假发音

📚 错误制造技巧（请严格使用）：
1. 浊音清音互换：
   - さ行↔ざ行：さかずき→さかすき、ざっし→さっし
   - た行↔だ行：たてもの→だてもの、だいがく→たいがく
   - か行↔が行：かみ→がみ、がっこう→かっこう
   - は行↔ば行：はなし→ばなし、ばんごう→はんごう

2. 長短音错误：
   - 短音→長音：こうえん→こうえん、せんせい→せえんせえい
   - 長音→短音：りょうり→りより、こうこう→ここう

3. 促音错误：
   - 追加促音：がくせい→がっくせい、せんせい→せっんせい
   - 移除促音：がっこう→がこう、せっけん→せけん

4. 拗音錯誤：
   - きゃ→きや：きゃく→きやく、しゅ→しゆ
   - りょ→りよ：りょうり→りよう

5. 汉字多读音迷惑：
   - 使用同一汉字的其他常见读音
   - 例：日（にち/ひ）、生（せい/なま）

⚠️ 严格要求：
- 必须基于"${correctPronunciation}"制造错误版本
- 错误发音要看起来合理但明确不正确
- 🚫 绝对禁止：不能返回正确读音"${correctPronunciation}"
- ❌ 禁止：不能返回任何与"${correctPronunciation}"完全相同的发音
- 返回格式：错误发音1,错误发音2

示例：
正确：さかずき → 错误：さかすき,ざかずき
正确：がっこう → 错误：かっこう,がこう

现在请为"${correctPronunciation}"制造2个错误发音：`;
}

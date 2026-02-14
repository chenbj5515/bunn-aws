// export const QUESTION_ANSWER_ACCURACY_THRESHOLD_PERCENT = 97;

export const QUESTION_ANSWER_ACCURACY_THRESHOLD_PERCENT = 100;

export const DAILY_TASK_QUESTION_COUNT = 12;

// export const DAILY_TASK_QUESTION_COUNT = 1;


export const QUESTION_CONFIG = {
  eligibility: {
    accuracyThresholdPercent: QUESTION_ANSWER_ACCURACY_THRESHOLD_PERCENT
  },
  dailyTask: {
    questionCount: DAILY_TASK_QUESTION_COUNT
  }
} as const;

// 结算视频（集中管理）
export const SETTLEMENT_VIDEO_URL =
  'https://i2ggfjkruhmrnyqd.public.blob.vercel-storage.com/videos/settlement.mp4';
export const SETTLEMENT_VIDEO_URL_ALT =
  'https://i2ggfjkruhmrnyqd.public.blob.vercel-storage.com/videos/settlement1.mp4';


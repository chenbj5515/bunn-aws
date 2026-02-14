import { pgTable, text, timestamp, foreignKey, uuid, integer, boolean, uniqueIndex, varchar, unique, serial, pgEnum, jsonb, numeric, primaryKey, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import type { LocalizedText, RequiredLocalizedText } from "@/types/locale"
import type { QuestionType } from "@/types/memo-card"

export const actionTypeEnum = pgEnum("action_type_enum", ['COMPLETE_SENTENCE_REVIEW', 'COMPLETE_WORD_REVIEW', 'COMPLETE_EXAM', 'FORGOT_WORD_MEANING', 'FORGOT_WORD_PRONUNCIATION', 'UNKNOWN_PHRASE_EXPRESSION', 'UNABLE_TO_UNDERSTAND_AUDIO', 'CREATE_MEMO', 'CREATE_WORD', 'COMPLETE_IMAGE_OCR', 'COMPLETE_TEXT_TRANSLATION_BY_EXTENSION', 'WORD_COMPLETE'])
export const examStatusEnum = pgEnum("exam_status_enum", ['initial', 'in_progress', 'completed'])
export const membershipPlanEnum = pgEnum("membership_plan_enum", ['MONTHLY'])
export const questionTypeEnum = pgEnum("question_type_enum", ['kana_from_japanese', 'translation_from_japanese', 'japanese_from_chinese', 'transcription_from_audio'])
export const relatedTypeEnum = pgEnum("related_type_enum", ['word_card', 'memo_card', 'exam', 'series', 'channel'])
export const userRoleEnum = pgEnum("user_role_enum", ['user', 'admin'])


// Better Auth 表 - 注意：使用 mode: 'date' 以兼容 Better Auth（它期望 Date 对象）
export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }),
	updatedAt: timestamp({ precision: 3, mode: 'date' }),
});

// AI 计费明细日志（用于长期留存与审计）
export const aiBillingLogs = pgTable('ai_billing_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'openai' | 'minimax' | 'redis'
    model: text('model'),
    inputTokens: integer('input_tokens').default(0),
    outputTokens: integer('output_tokens').default(0),
    chars: integer('chars').default(0),
    bytes: integer('bytes').default(0),
    ttlSeconds: integer('ttl_seconds').default(0),
    requests: integer('requests').default(0),
    ingressBytes: integer('ingress_bytes').default(0),
    egressBytes: integer('egress_bytes').default(0),
    costUsd: numeric('cost_usd').default('0'),
    createdAt: timestamp('created_at', { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const wordCard = pgTable("word_card", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	word: text().notNull(),
	kanaPronunciation: text().default('').notNull(),
	meaning: text().notNull(),
	meaning_new: jsonb("meaning_new"),  // 新字段用于安全迁移meaning数据
	meaningDistractions: jsonb("meaning_distractions"),  // 意思干扰项，存储多语言JSON格式：{zh: [], en: []}
	pronunciationDistractions: jsonb("pronunciation_distractions"),  // 发音干扰项，存储数组格式
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	userId: text("user_id").notNull(),
	reviewTimes: integer("review_times").default(0).notNull(),
	forgetCount: integer("forget_count").default(0).notNull(),
	memoCardId: uuid("memo_card_id").notNull(),
	adminPreTranslations: jsonb("admin_pre_translations"), // 系统管理员预设多语言翻译，用于复制功能
}, (table) => [
	foreignKey({
			columns: [table.memoCardId],
			foreignColumns: [memoCard.id],
			name: "fk_memo_card"
		}),
]);

// Better Auth 表
export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
	refreshTokenExpiresAt: timestamp({ precision: 3, mode: 'date' }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const examResults = pgTable("exam_results", {
	resultId: uuid("result_id").defaultRandom().primaryKey().notNull(),
	examId: uuid("exam_id").notNull(),
	question: text().notNull(),
	questionType: questionTypeEnum("question_type").notNull(),
	questionRef: uuid("question_ref").notNull(),
	userAnswer: text("user_answer").notNull(),
	referenceAnswer: text("reference_answer").notNull(),
	isCorrect: boolean("is_correct").default(false).notNull(),
	questionScore: integer("question_score").default(0).notNull(),
	createTime: timestamp("create_time", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const articles = pgTable("articles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	content: text().notNull(),
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	userId: text("user_id"),
	tags: text(),
	title: text(),
});

// Better Auth 表
export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().notNull(),
	image: text(),
	timezone: text().default('UTC'),  // 新增时区字段，默认为UTC
	role: userRoleEnum().default('user').notNull(),  // 新增角色字段，默认为普通用户
	achievementPoints: integer("achievementpoints").default(0).notNull(),  // 日语学习成就点数
	// 专栏查看权限：用户维度开关
	canViewColumns: boolean("can_view_columns").default(false).notNull(),
	// 答题统计相关
	correctAnswersCount: integer("correct_answers_count").default(0).notNull(),  // 答对次数
	totalAnswersCount: integer("total_answers_count").default(0).notNull(),  // 总答题次数
	// 自定义TTS相关
	ttsVoiceId: text("tts_voice_id"),
	preferredTTSVoice: text("preferred_tts_voice").default('haruka').notNull(), // 可选：'haruka' | 'custom'
	preferredUiLocale: text("preferred_ui_locale").default('en'),
	createdAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
}, (table) => [
	uniqueIndex("user_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

// Better Auth 表
export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'date' }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
}, (table) => [
	uniqueIndex("session_token_key").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const memoCard = pgTable("memo_card", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	translation: jsonb().notNull(),
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	recordFilePath: text("record_file_path"),
	originalText: text("original_text").notNull(),
	reviewTimes: integer("review_times").default(0),
	forgetCount: integer("forget_count").default(0).notNull(),
	userId: text("user_id").default('chenbj').notNull(),
	kanaPronunciation: jsonb("kana_pronunciation"),
	contextUrl: text("context_url"),
	videoId: text('video_id'),
	rubyTranslations: jsonb("ruby_translations"),   // 存储ruby元素的翻译
	wordSegmentation: jsonb("word_segmentation"),  // 存储句子拆分成单词的信息，JSON格式
	platform: text('platform'),      // 内容类型：'youtube', 'nextflix series'等
	seriesId: uuid('series_id').references(() => series.id, { onDelete: 'set null' }),          // 关联到具体内容的ID
	characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }), // 关联到角色ID
	channelId: text('channel_id').references(() => channels.channelId, { onDelete: 'set null' }), // 关联到YouTube频道ID
	// 关联到书籍或漫画的ID：
	// - 对于传统书籍模式：指向 books.id
	// - 对于漫画模式：指向 comics.id
	// 由于一个字段无法在数据库层面同时引用两张表，这里不再声明外键约束，
	// 由业务代码通过上下文保证一致性
	bookId: uuid('book_id'),
	chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }), // 关联到章节ID
	lastCorrectTime: timestamp("last_correct_time", { precision: 6, withTimezone: true, mode: 'string' }), // 最近答对的时间
	lastWrongTime: timestamp("last_wrong_time", { precision: 6, withTimezone: true, mode: 'string' }), // 最近答错的时间
	contextInfo: jsonb("context_info").$type<RequiredLocalizedText[]>(), // 上下文信息，格式：[{en: "aaa", zh: "bbb", zh-TW: "ccc"}]
	adminPreTranslations: jsonb("admin_pre_translations"), // 系统管理员预设多语言翻译，用于复制功能
	avatarUrl: text("avatar_url"), // 记忆卡片头像URL
	// 卡片自定义问题（多语言JSON：{ zh, en, 'zh-TW' }）
	question: jsonb("question").$type<LocalizedText | string>(),
	// 问题类型：null/未设置=描述型，'reading'=读音型
	questionType: text("question_type").$type<QuestionType>(),
	// 问答题相关字段
	hasQuestionAnswerSubmission: boolean("has_question_answer_submission").default(false).notNull(),
	questionAnswerSubmissions: jsonb("question_answer_submissions"), // 存储历史记录数组
	lastQuestionAnswerSubmittedAt: timestamp("last_question_answer_submitted_at", {
		precision: 6,
		withTimezone: true,
		mode: 'string'
	}),
	// 可选：指向来源的书摘句子（包括漫画台词句子）
	highlightSentenceId: uuid('highlight_sentence_id').references(() => bookHighlightSentences.id, {
		onDelete: 'set null',
	}),
}, (table) => [
	foreignKey({
		columns: [table.videoId, table.userId],
		foreignColumns: [videos.videoId, videos.userId],
		name: 'fk_memo_card_video'
	}),
	index('memo_card_video_idx').on(table.videoId),
]);

export const userSubscription = pgTable("user_subscription", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	stripeCustomerId: text("stripe_customer_id"),  // Stripe 客户ID
	stripeCustomerEmail: text("stripe_customer_email"),  // Stripe 客户邮箱
	startTime: timestamp("start_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	endTime: timestamp("end_time", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	subscriptionType: text("subscription_type").default('subscription').notNull(), // 订阅类型：'subscription'或'oneTime'
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_subscription_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const exams = pgTable("exams", {
	examId: uuid("exam_id").defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	examName: varchar("exam_name", { length: 255 }).notNull(),
	totalScore: integer("total_score").default(0).notNull(),
	status: examStatusEnum().default('initial').notNull(),
	durationSeconds: integer("duration_seconds"),
	createTime: timestamp("create_time", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userActionLogs = pgTable("user_action_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	actionType: actionTypeEnum("action_type").notNull(),
	relatedId: uuid("related_id"),
	relatedType: relatedTypeEnum("related_type"),
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text(),
	email: varchar({ length: 255 }).notNull(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	emailVerified: boolean("email_verified").default(false),
	image: text(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const series = pgTable('series', {
	id: uuid('id').primaryKey().defaultRandom(),
	title: text('title').notNull(),         // 系列标题
	platform: text('platform').notNull(),   // 平台名称，如"netflix"
	coverUrl: text('cover_url').notNull(),  // 封面图片URL
	// 可以根据需要添加其他字段，如描述、评分等
});

export const seriesMetadata = pgTable('series_metadata', {
	id: uuid('id').primaryKey().defaultRandom(),
	seriesId: uuid('series_id')
		.notNull()
		.references(() => series.id, { onDelete: 'cascade' }),
	memoCardId: uuid('memo_card_id')
		.notNull()
		.references(() => memoCard.id, { onDelete: 'cascade' }),
	season: integer('season'),              // 季数
	episode: integer('episode'),            // 集数
	episodeTitle: text('episode_title'),    // 集标题
	watchId: text('watch_id'),              // 观看ID
	// 可以添加其他剧集特有的元数据
});

export const userSeriesMaterials = pgTable('user_series_materials', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	seriesId: uuid('series_id')
		.notNull()
		.references(() => series.id, { onDelete: 'cascade' }),
	customCoverUrl: text('custom_cover_url').notNull(),
	customTitleUrl: text('custom_title_url'),
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique('user_series_materials_unique').on(table.userId, table.seriesId),
]);

// 角色表 - 存储剧集中的角色信息
export const characters = pgTable('characters', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),           // 角色名称
	description: text('description'),       // 角色描述
	avatarUrl: text('avatar_url'),          // 角色头像URL
	seriesId: uuid('series_id').references(() => series.id, { onDelete: 'set null' }),  // 关联的剧集ID
	channelId: text('channel_id').references(() => channels.channelId, { onDelete: 'set null' }),  // 关联的频道ID
	// 通用关联（推荐新逻辑使用）：例如 refType="comic", refId=comics.id
	refType: text('ref_type'),
	refId: text('ref_id'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // 用户ID，确保用户只能选择自己上传的角色
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	// 漫画阅读器按 (userId, refType, refId) 查询并按 createTime 排序
	index('characters_ref_idx').on(table.userId, table.refType, table.refId, table.createTime),
]);

// YouTube频道表 - 存储YouTube频道信息
export const channels = pgTable('channels', {
	channelId: text('channel_id').primaryKey().notNull(), // YouTube频道ID作为主键
	channelName: text('channel_name').notNull(),          // 频道名称
	avatarUrl: text('avatar_url'),                        // 频道头像URL
	bannerUrl: text('banner_url'),                        // 频道顶部横幅URL
	description: text('description'),                     // 频道描述（可选）
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 视频表 - 以视频为基准维度（video_id + user_id 复合主键）
export const videos = pgTable('videos', {
	videoId: text('video_id').notNull(),                 // YouTube视频ID
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), // 用户ID
	channelId: text('channel_id').references(() => channels.channelId, { onDelete: 'cascade' }), // 频道ID（可空，兼容历史数据）
	videoTitle: text('video_title'),                     // 视频标题（可空，历史数据可能缺失）
	thumbnailUrl: text('thumbnail_url'),                 // 视频缩略图URL
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	primaryKey({ columns: [table.videoId, table.userId], name: 'videos_pk' }),
]);

// 网页来源表 - 存储不同网站域名的信息
export const domainSources = pgTable('domain_sources', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	domain: text('domain').notNull(),         // 存储域名，如"zenn.dev"
	displayName: text('display_name'),        // 显示名称，如"Zenn"
	iconUrl: text('icon_url'),                // 域名图标URL
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique('domain_sources_unique').on(table.userId, table.domain),
]);

// 书摘表 - 存储用户从截图中提取的书摘内容
export const bookHighlights = pgTable('book_highlights', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	// 关联到 books / chapters，用于书籍模式导航
	bookId: uuid('book_id')
		.references(() => books.id, { onDelete: 'set null' }),
	// 关联到 comics，用于漫画模式导航
	comicId: uuid('comic_id')
		.references(() => comics.id, { onDelete: 'set null' }),
	chapterId: uuid('chapter_id')
		.references(() => chapters.id, { onDelete: 'set null' }),
	pageNumber: integer('page_number'),
	imageUrl: text('image_url').notNull(), // 截图图片地址
	thumbnailUrl: text('thumbnail_url'), // 预留缩略图字段
	title: text('title'), // 书摘标题，可选
	status: text('status')
		.notNull()
		.default('done'), // processing | done | failed
	ocrRawText: text('ocr_raw_text'), // OCR 识别后的纯文本
	rubyContent: text('ruby_content'), // Ruby 可交互文本的 JSON 字符串
	plainText: text('plain_text'), // 纯文本（用于搜索/展示）
	// 漫画模式：整页漫画台词的结构化数据快照（JSON 数组）
	// 结构示例：
	// [
	//   { "index": 0, "speaker": "角色A", "speakerType": "character", "sentence": "今天天气真好。" },
	//   { "index": 1, "speaker": "旁白", "speakerType": "narration", "sentence": "这是一个美丽的早晨。" }
	// ]
	comicDialogues: jsonb('comic_dialogues'),
	sourceType: text('source_type'), // url | book | exam | other
	sourceText: text('source_text'), // 来源描述字符串，例如《XX书》第3章 P.45 或链接等
	aiOcrRawResponse: text('ai_ocr_raw_response'), // OCR 服务原始返回（JSON 字符串）
	aiRubyRawResponse: text('ai_ruby_raw_response'), // Ruby 生成 AI 原始返回（JSON 字符串）
	createdAt: timestamp('created_at', { precision: 6, withTimezone: true, mode: 'string' })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true, mode: 'string' })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
}, (table) => [
	// 漫画阅读器翻页：按 (userId, comicId, chapterId) + (pageNumber, createdAt) 做范围查询和排序
	index('book_highlights_comic_page_nav_idx').on(
		table.userId,
		table.comicId,
		table.chapterId,
		table.pageNumber,
		table.createdAt,
	),
	// 漫画阅读器“跨话”取首/末页：按 (userId, comicId, chapterId) 做过滤
	index('book_highlights_comic_chapter_idx').on(table.userId, table.comicId, table.chapterId),
]);

// 书摘句子表 - 存储每条书摘拆分后的句子及其Ruby信息
export const bookHighlightSentences = pgTable('book_highlight_sentences', {
	id: uuid('id').primaryKey().defaultRandom(),
	highlightId: uuid('highlight_id')
		.notNull()
		.references(() => bookHighlights.id, { onDelete: 'cascade' }),
	index: integer('index').notNull(),
	// 漫画台词：句子 -> 角色（旁白也可以是一个特殊角色：name="旁白"）
	characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
	sentenceText: text('sentence_text').notNull(),
	kanaPronunciation: text('kana_pronunciation'),
	rubyTranslations: text('ruby_translations'),
	translation: jsonb('translation'),
	createdAt: timestamp('created_at', { precision: 6, withTimezone: true, mode: 'string' })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true, mode: 'string' })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
}, (table) => [
	// 漫画阅读器按 highlightId 查询并按 index 排序
	index('book_highlight_sentences_highlight_idx').on(table.highlightId, table.index),
]);

// MemoCard消息历史表 - 存储语法分析对话历史
export const memoCardMessages = pgTable('memo_card_messages', {
	id: uuid('id').primaryKey().defaultRandom(),
	memoCardId: uuid('memo_card_id')
		.notNull()
		.references(() => memoCard.id, { onDelete: 'cascade' }),
	role: text('role').notNull(),  // 'user' 或 'assistant'
	content: text('content').notNull(),
	isInitialAnalysis: boolean('is_initial_analysis').default(false),
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	messageOrder: integer('message_order'),  // 改为普通integer类型，由触发器设置值
}, (table) => [
	// 创建索引以便快速查询特定卡片的消息
	uniqueIndex('memo_card_messages_unique_order').on(table.memoCardId, table.messageOrder),
]);

// 用户使用日志表 - 记录用户的token和图片使用情况
export const userUsageLogs = pgTable('user_usage_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	ipAddress: text('ip_address'),                    // 用户IP地址
	tokensUsed: integer('tokens_used').default(0),    // 使用的token数量
	imagesUploaded: integer('images_uploaded').default(0), // 上传的图片数量
	totalImageSize: integer('total_image_size').default(0), // 上传图片的总大小(KB)
	tokenCostEstimate: numeric('token_cost_estimate').default('0'), // token费用估算
	imageCostEstimate: numeric('image_cost_estimate').default('0'), // 图片费用估算
	visionApiCalls: integer('vision_api_calls').default(0), // 使用的Google Vision API调用次数
	visionApiCostEstimate: numeric('vision_api_cost_estimate').default('0'), // Vision API费用估算
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 统一聚合用量表（免费：按天；订阅：按订阅周期）
export const usage = pgTable('usage', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	// 订阅维度（订阅用户使用），为空表示免费用户的行
	subscriptionId: uuid('subscription_id').references(() => userSubscription.id, { onDelete: 'set null' }),
	// 免费用户按天维度（YYYY-MM-DD，基于用户时区）；订阅用户该字段为空
	periodKey: text('period_key'),
	// 统计周期边界（订阅：订阅起讫；免费：当日 00:00/23:59:59.999）
	startTime: timestamp('start_time', { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp('end_time', { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	// 基础 token 计数
	tokensIn: integer('tokens_in').default(0).notNull(),
	tokensOut: integer('tokens_out').default(0).notNull(),
	tokensTotal: integer('tokens_total').default(0).notNull(),
	// 模型维度
	gpt4oIn: integer('gpt4o_in').default(0).notNull(),
	gpt4oOut: integer('gpt4o_out').default(0).notNull(),
	gpt4oTotal: integer('gpt4o_total').default(0).notNull(),
	gpt4oMiniIn: integer('gpt4o_mini_in').default(0).notNull(),
	gpt4oMiniOut: integer('gpt4o_mini_out').default(0).notNull(),
	gpt4oMiniTotal: integer('gpt4o_mini_total').default(0).notNull(),
	// 成本（微美元）
	costTotalMicro: integer('cost_total_micro').default(0).notNull(),
	costOpenaiMicro: integer('cost_openai_micro').default(0).notNull(),
	costMinimaxTtsMicro: integer('cost_minimax_tts_micro').default(0).notNull(),
	costVercelBlobMicro: integer('cost_vercel_blob_micro').default(0).notNull(),
	updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	// 业务幂等唯一性：订阅周期内唯一
	unique('usage_user_subscription_unique').on(table.userId, table.subscriptionId),
	// 免费用户：按天唯一
	unique('usage_user_period_unique').on(table.userId, table.periodKey),
	// 辅助索引
	index('usage_user_idx').on(table.userId),
	index('usage_subscription_idx').on(table.subscriptionId),
	index('usage_period_idx').on(table.periodKey),
	index('usage_updated_at_idx').on(table.updatedAt),
]);

// 免费用户按天聚合用量表（与 FREE_KEYS 一致的聚合维度）
export const freeUsageDaily = pgTable('free_usage_daily', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	periodKey: text('period_key').notNull(), // 用户时区日维度，格式 YYYY-MM-DD
	timezone: text('timezone'),
	// 计数聚合
	tokensTotal: integer('tokens_total').default(0).notNull(),
	ttsTimes: integer('tts_times').default(0).notNull(),
	vercelBlobTimes: integer('vercel_blob_times').default(0).notNull(),
	updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique('free_usage_daily_unique').on(table.userId, table.periodKey),
]);

// 用户-频道关联表 - 存储用户与YouTube频道的关联关系
export const userChannels = pgTable('user_channels', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	channelId: text('channel_id')
		.notNull()
		.references(() => channels.channelId, { onDelete: 'cascade' }),
	channelName: text('channel_name'),                // 频道名称
	avatarUrl: text('avatar_url'),                    // 频道头像URL
	bannerUrl: text('banner_url'),                    // 频道顶部横幅URL
	createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique('user_channels_unique').on(table.userId, table.channelId),
]);

// 漫画表 - 存储漫画信息
export const comics = pgTable('comics', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(), // 漫画名
    coverUrl: text('cover_url').notNull(), // 封面图片 URL
    createdAt: timestamp('created_at', { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    createdBy: text('created_by').notNull(), // 创建者用户ID
});

export const books = pgTable('books', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(), // 书名
    coverUrl: text('cover_url').notNull(), // 封面图片 URL
    createdAt: timestamp('created_at', { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    createdBy: text('created_by').notNull(), // 创建者用户ID
});

// 章节表 - 存储书籍的章节信息
export const chapters = pgTable('chapters', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(), // 章节名
    chapterNumber: integer('chapter_number').notNull(), // 章数
    // 这里的 bookId 在历史上用于书籍章节：
    // - 对于书籍模式：指向 books.id
    // - 对于漫画模式：指向 comics.id
    // 无法对同一列同时声明到两张表的外键约束，因此这里去掉数据库层面的 FK，
    // 保留非空约束，由业务逻辑根据上下文区分是书籍还是漫画
    bookId: uuid('book_id')
        .notNull(),
    createTime: timestamp("create_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updateTime: timestamp("update_time", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
    // 确保同一本书中章节号唯一
    unique('chapters_book_chapter_unique').on(table.bookId, table.chapterNumber),
	// 漫画阅读器按 comicId(bookId) 取章节并按 chapterNumber 排序
	index('chapters_book_idx').on(table.bookId, table.chapterNumber),
]);

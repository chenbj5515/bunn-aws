import { relations } from "drizzle-orm/relations";
import { memoCard, wordCard, user, account, session, userSubscription, series, seriesMetadata, channels } from "./schema";

export const wordCardRelations = relations(wordCard, ({one}) => ({
	memoCard: one(memoCard, {
		fields: [wordCard.memoCardId],
		references: [memoCard.id]
	}),
}));

export const memoCardRelations = relations(memoCard, ({many, one}) => ({
	wordCards: many(wordCard),
	seriesMetadata: one(seriesMetadata),
	series: one(series, {
		fields: [memoCard.seriesId],
		references: [series.id],
		relationName: 'seriesMemoCards'
	}),
	channel: one(channels, {
		fields: [memoCard.channelId],
		references: [channels.channelId]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	sessions: many(session),
	userSubscriptions: many(userSubscription),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userSubscriptionRelations = relations(userSubscription, ({one}) => ({
	user: one(user, {
		fields: [userSubscription.userId],
		references: [user.id]
	}),
}));

export const seriesRelations = relations(series, ({many}) => ({
	memoCards: many(memoCard, {
		relationName: 'seriesMemoCards'
	}),
}));

export const seriesMetadataRelations = relations(seriesMetadata, ({one}) => ({
	memoCard: one(memoCard, {
		fields: [seriesMetadata.memoCardId],
		references: [memoCard.id]
	}),
}));

export const channelsRelations = relations(channels, ({many}) => ({
	memoCards: many(memoCard)
}));
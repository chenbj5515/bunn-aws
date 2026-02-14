#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { CacheStack } from '../lib/cache-stack';
import { AppStack } from '../lib/app-stack';
import { BatchStack } from '../lib/batch-stack';

/**
 * Bunn AWS CDK 应用入口
 * 
 * 架构概览：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  CloudFront (CDN)                                           │
 * │       │                                                      │
 * │       ▼                                                      │
 * │  ┌─────────┐     ┌──────────────────┐                       │
 * │  │   ALB   │────▶│  ECS Fargate     │                       │
 * │  └─────────┘     │  (Next.js 容器)   │                       │
 * │                  └──────────────────┘                       │
 * │                         │                                    │
 * │              ┌──────────┴──────────┐                        │
 * │              ▼                     ▼                        │
 * │  ┌──────────────────┐  ┌──────────────────┐                │
 * │  │  RDS PostgreSQL  │  │ ElastiCache Redis│                │
 * │  └──────────────────┘  └──────────────────┘                │
 * │              ▲                     ▲                        │
 * │              └──────────┬──────────┘                        │
 * │  ┌─────────────┐        │                                    │
 * │  │ EventBridge │───▶ Lambda (Batch)                         │
 * │  └─────────────┘                                            │
 * └─────────────────────────────────────────────────────────────┘
 */

const app = new cdk.App();

// 环境配置
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1', // 东京区域
};

// 应用名称前缀
const appName = 'bunn';

// 1. 网络栈 - VPC, 子网, 安全组
const networkStack = new NetworkStack(app, `${appName}-network`, {
  env,
  appName,
});

// 2. 数据库栈 - RDS PostgreSQL
const databaseStack = new DatabaseStack(app, `${appName}-database`, {
  env,
  appName,
  vpc: networkStack.vpc,
  securityGroup: networkStack.dbSecurityGroup,
});

// 3. 缓存栈 - ElastiCache Redis
const cacheStack = new CacheStack(app, `${appName}-cache`, {
  env,
  appName,
  vpc: networkStack.vpc,
  securityGroup: networkStack.redisSecurityGroup,
});

// 4. 应用栈 - ECS Fargate (Next.js)
const appStack = new AppStack(app, `${appName}-app`, {
  env,
  appName,
  vpc: networkStack.vpc,
  securityGroup: networkStack.appSecurityGroup,
  databaseUrl: databaseStack.databaseUrl,
  redisUrl: cacheStack.redisUrl,
});

// 5. 批处理栈 - Lambda (Batch 任务)
const batchStack = new BatchStack(app, `${appName}-batch`, {
  env,
  appName,
  vpc: networkStack.vpc,
  securityGroup: networkStack.lambdaSecurityGroup,
  databaseUrl: databaseStack.databaseUrl,
  redisUrl: cacheStack.redisUrl,
});

// 添加依赖关系
databaseStack.addDependency(networkStack);
cacheStack.addDependency(networkStack);
appStack.addDependency(databaseStack);
appStack.addDependency(cacheStack);
batchStack.addDependency(databaseStack);
batchStack.addDependency(cacheStack);

app.synth();

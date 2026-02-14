import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

interface BatchStackProps extends cdk.StackProps {
  appName: string;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  databaseUrl: string;
  redisUrl: string;
}

/**
 * 批处理栈 - Lambda (Batch 任务)
 * 
 * 用于处理定时任务、后台处理等不需要实时响应的任务
 */
export class BatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BatchStackProps) {
    super(scope, id, props);

    const { appName, vpc, securityGroup, redisUrl } = props;

    // 示例：创建一个定时任务 Lambda
    const cleanupFunction = new lambda.Function(this, 'CleanupFunction', {
      functionName: `${appName}-cleanup`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Cleanup task started');
          // TODO: 实现清理逻辑
          // - 清理过期数据
          // - 发送汇总邮件
          // - 等等
          return { statusCode: 200, body: 'Cleanup completed' };
        };
      `),
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      environment: {
        NODE_ENV: 'production',
        REDIS_URL: redisUrl,
        // DATABASE_URL 通过 Secrets Manager 注入
      },
    });

    // 创建定时触发规则（每天凌晨 3 点执行）
    const rule = new events.Rule(this, 'CleanupRule', {
      ruleName: `${appName}-cleanup-rule`,
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '3',
        day: '*',
        month: '*',
        year: '*',
      }),
      description: 'Daily cleanup task',
    });

    rule.addTarget(new targets.LambdaFunction(cleanupFunction));

    // 输出
    new cdk.CfnOutput(this, 'CleanupFunctionArn', {
      value: cleanupFunction.functionArn,
      description: 'Cleanup Lambda ARN',
    });
  }
}

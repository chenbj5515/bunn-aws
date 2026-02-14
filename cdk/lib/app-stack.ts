import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

interface AppStackProps extends cdk.StackProps {
  appName: string;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  databaseUrl: string;
}

/**
 * 应用栈 - ECS Fargate (Next.js)
 */
export class AppStack extends cdk.Stack {
  public readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const { appName, vpc, securityGroup, databaseUrl } = props;

    // 创建 ECS 集群
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `${appName}-cluster`,
      vpc,
      containerInsights: true,
    });

    // 创建 ECR 仓库（存放 Docker 镜像）
    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `${appName}-app`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // 创建 Fargate 服务 + ALB
    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      serviceName: `${appName}-service`,
      cluster,
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512,
      desiredCount: 1, // 生产环境建议 2+
      publicLoadBalancer: true,
      taskImageOptions: {
        // 初始使用 placeholder 镜像，部署后替换为实际镜像
        image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
        containerPort: 3000,
        environment: {
          NODE_ENV: 'production',
          // DATABASE_URL 通过 Secrets Manager 注入，这里只是占位
          // 实际部署时需要配置 secrets
        },
      },
      taskSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [securityGroup],
      circuitBreaker: {
        rollback: true,
      },
    });

    // 配置健康检查
    this.service.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200-399',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // 配置自动扩缩容
    const scaling = this.service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // 输出
    new cdk.CfnOutput(this, 'LoadBalancerDns', {
      value: this.service.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS',
    });

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
    });
  }
}

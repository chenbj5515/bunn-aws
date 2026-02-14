import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

interface CacheStackProps extends cdk.StackProps {
  appName: string;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

/**
 * 缓存栈 - ElastiCache Redis
 * 
 * 使用 Redis 7.x 单节点模式（开发/小规模生产）
 * 生产环境可升级为 Cluster 模式或 Replication Group
 */
export class CacheStack extends cdk.Stack {
  public readonly redisEndpoint: string;
  public readonly redisUrl: string;

  constructor(scope: Construct, id: string, props: CacheStackProps) {
    super(scope, id, props);

    const { appName, vpc, securityGroup } = props;

    // 创建 ElastiCache 子网组
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      cacheSubnetGroupName: `${appName}-redis-subnet-group`,
      description: 'Subnet group for Redis cluster',
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      }).subnetIds,
    });

    // 创建 ElastiCache Redis 复制组（单节点，可扩展为多节点）
    const redisCluster = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupDescription: `${appName} Redis cluster`,
      replicationGroupId: `${appName}-redis`,
      
      // Redis 引擎配置
      engine: 'redis',
      engineVersion: '7.1',
      cacheNodeType: 'cache.t4g.micro', // 开发环境用小实例，生产环境升级
      
      // 单节点模式（非集群模式）
      numCacheClusters: 1,
      automaticFailoverEnabled: false, // 单节点不支持自动故障转移
      multiAzEnabled: false, // 开发环境禁用，生产环境建议开启
      
      // 网络配置
      cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
      securityGroupIds: [securityGroup.securityGroupId],
      
      // 端口
      port: 6379,
      
      // 快照和备份
      snapshotRetentionLimit: 1, // 保留 1 天快照，生产环境建议增加
      snapshotWindow: '03:00-05:00', // UTC 时间
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      
      // 加密
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: false, // 如需 TLS，设为 true 并更新连接字符串
      
      // 参数
      cacheParameterGroupName: 'default.redis7',
      
      // 日志
      // logDeliveryConfigurations: [], // 可配置 CloudWatch 日志
    });

    // 确保子网组先创建
    redisCluster.addDependency(subnetGroup);

    // 获取 Redis 端点
    // 对于 ReplicationGroup，使用 PrimaryEndPoint
    this.redisEndpoint = redisCluster.attrPrimaryEndPointAddress;
    this.redisUrl = `redis://${this.redisEndpoint}:6379`;

    // 输出
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisEndpoint,
      description: 'Redis primary endpoint',
    });

    new cdk.CfnOutput(this, 'RedisUrl', {
      value: this.redisUrl,
      description: 'Redis connection URL',
    });
  }
}

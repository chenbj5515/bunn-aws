import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.StackProps {
  appName: string;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
}

/**
 * 数据库栈 - RDS PostgreSQL
 */
export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.Secret;
  public readonly databaseUrl: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { appName, vpc, securityGroup } = props;

    // 创建数据库密钥
    this.dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: `${appName}/database`,
      description: 'RDS PostgreSQL credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '/@"\'\\',
        passwordLength: 32,
      },
    });

    // 创建 RDS PostgreSQL 实例
    this.dbInstance = new rds.DatabaseInstance(this, 'Database', {
      instanceIdentifier: `${appName}-db`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO // 开发环境用小实例，生产环境升级
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [securityGroup],
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      databaseName: 'bunn_db',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP3,
      multiAz: false, // 生产环境建议开启
      deletionProtection: false, // 生产环境建议开启
      backupRetention: cdk.Duration.days(7),
      publiclyAccessible: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // 删除时创建快照
    });

    // 构建 DATABASE_URL
    // 注意：实际使用时需要从 Secrets Manager 获取密码
    this.databaseUrl = `postgresql://postgres:PASSWORD@${this.dbInstance.instanceEndpoint.hostname}:5432/bunn_db`;

    // 输出
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbInstance.instanceEndpoint.hostname,
      description: 'RDS endpoint',
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'Database secret ARN',
    });
  }
}

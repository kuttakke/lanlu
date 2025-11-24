/**
 * 插件参数定义
 */
export interface PluginParameter {
  type: 'string' | 'int' | 'bool';
  desc: string;
  default_value?: string;
}

/**
 * 插件元数据
 */
export interface PluginInfo {
  name: string;
  type: 'metadata' | 'login' | 'download';
  namespace: string;
  login_from?: string;
  author: string;
  version: string;
  description: string;
  parameters: PluginParameter[];
  oneshot_arg?: string;
  cooldown?: number;
  url_regex?: string;
  icon?: string;
  permissions?: string[];
}

/**
 * 插件执行结果
 */
export interface PluginResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 插件基础接口
 */
export abstract class BasePlugin {
  abstract getPluginInfo(): PluginInfo;

  /**
   * 处理命令行参数
   */
  async handleCommand(args: string[]): Promise<void> {
    const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];

    switch (action) {
      case 'plugin_info':
        await this.outputPluginInfo();
        break;
      case 'run':
        await this.runPlugin(args);
        break;
      default:
        this.outputError('Invalid action. Use --action=plugin_info or --action=run');
    }
  }

  /**
   * 输出插件信息JSON
   */
  protected async outputPluginInfo(): Promise<void> {
    const info = this.getPluginInfo();
    console.log(JSON.stringify(info, null, 2));
  }

  /**
   * 运行插件逻辑（由子类实现）
   */
  protected abstract runPlugin(args: string[]): Promise<void>;

  /**
   * 输出执行结果JSON
   */
  protected outputResult(result: PluginResult): void {
    console.log(JSON.stringify(result));
  }

  /**
   * 输出错误信息
   */
  protected outputError(error: string): void {
    console.log(JSON.stringify({ success: false, error }));
  }

  /**
   * 从命令行参数中解析参数
   */
  protected parseParams(args: string[]): Record<string, any> {
    const paramsArg = args.find(arg => arg.startsWith('--params='));
    if (paramsArg) {
      try {
        return JSON.parse(paramsArg.substring(9));
      } catch (e) {
        console.error('Failed to parse params:', e);
        return {};
      }
    }
    return {};
  }

  /**
   * 获取oneshot参数
   */
  protected getOneshotParam(args: string[]): string {
    return args.find(arg => arg.startsWith('--oneshot='))?.substring(10) || '';
  }
}
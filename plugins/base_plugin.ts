/**
 * 插件参数定义
 */
export interface PluginParameter {
  type: 'string' | 'int' | 'bool';
  name?: string;
  desc: string;
  default_value?: string;
  value?: any;
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

  protected async log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, meta?: unknown): Promise<void> {
    try {
      const ts = new Date().toISOString();
      const namespace = this.getPluginInfo()?.namespace || 'unknown';
      const metaStr = meta === undefined ? '' : ` meta=${this.safeJson(meta)}`;
      const line = `${ts} ${level} namespace=${namespace} msg=${message}${metaStr}\n`;

      try {
        await Deno.writeTextFile('./data/logs/plugins.log', line, { append: true });
        return;
      } catch {
        // ignore and fall back
      }

      try {
        await Deno.writeTextFile(`./data/plugins/${namespace}/plugins.log`, line, { append: true });
      } catch {
        // ignore logging failures
      }
    } catch {
      // ignore logging failures
    }
  }

  protected logDebug(message: string, meta?: unknown): Promise<void> {
    return this.log('DEBUG', message, meta);
  }
  protected logInfo(message: string, meta?: unknown): Promise<void> {
    return this.log('INFO', message, meta);
  }
  protected logWarn(message: string, meta?: unknown): Promise<void> {
    return this.log('WARN', message, meta);
  }
  protected logError(message: string, meta?: unknown): Promise<void> {
    return this.log('ERROR', message, meta);
  }

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

  private safeJson(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '"<unserializable>"';
    }
  }

  /**
   * 获取oneshot参数
   */
  protected getOneshotParam(args: string[]): string {
    return args.find(arg => arg.startsWith('--oneshot='))?.substring(10) || '';
  }
}

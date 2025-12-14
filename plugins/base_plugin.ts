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
        const parsed = JSON.parse(paramsArg.substring(9));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return this.coerceParamsFromSchema(parsed as Record<string, unknown>);
        }
        return {};
      } catch (e) {
        console.error('Failed to parse params:', e);
        return {};
      }
    }
    return {};
  }

  private coerceParamsFromSchema(params: Record<string, unknown>): Record<string, unknown> {
    const info = this.getPluginInfo();
    const schema = info?.parameters || [];
    const out: Record<string, unknown> = { ...params };

    for (const def of schema) {
      const name = def?.name;
      if (!name) continue;
      if (!(name in out)) continue;

      const value = out[name];
      if (def.type === 'bool') {
        out[name] = this.coerceBool(value);
      } else if (def.type === 'int') {
        const coerced = this.coerceInt(value);
        if (coerced !== undefined) out[name] = coerced;
      } else if (def.type === 'string') {
        if (value === null || value === undefined) out[name] = '';
        else out[name] = String(value);
      }
    }

    return out;
  }

  private coerceBool(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === '' || v === '0' || v === 'false' || v === 'no' || v === 'n' || v === 'off') return false;
      if (v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on') return true;
      return v !== '0';
    }
    return Boolean(value);
  }

  private coerceInt(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string') {
      const v = value.trim();
      if (v === '') return 0;
      const n = Number.parseInt(v, 10);
      return Number.isNaN(n) ? undefined : n;
    }
    return undefined;
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

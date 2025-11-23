#!/usr/bin/env deno run --allow-net --allow-read

import { BasePlugin, PluginInfo, PluginParameter, PluginResult } from '../base_plugin.ts';

/**
 * E-Hentai下载插件
 * 处理E-Hentai画廊下载URL生成
 */
class EHentaiDownloadPlugin extends BasePlugin {
  getPluginInfo(): PluginInfo {
    return {
      name: "E*Hentai Downloader",
      type: "download",
      namespace: "ehdl",
      login_from: "ehlogin",
      author: "Difegue",
      version: "1.2",
      description: "Downloads the given e*hentai URL and adds it to LANraragi. This uses GP to call the archiver, so make sure you have enough!",
      parameters: [
        { type: "bool", desc: "Force resampled archive download", default_value: "0" }
      ],
      url_regex: "https?://e(-|x)hentai.org/g/.*/.*"
    };
  }

  protected async runPlugin(args: string[]): Promise<void> {
    try {
      const params = this.parseParams(args);
      const url = this.getUrlFromArgs(args);

      if (!url) {
        this.outputError('No URL provided. Use --url=https://e-hentai.org/g/XXX/YYY/');
        return;
      }

      const result = await this.provideUrl(url, {
        forceresampled: params.forceresampled || false
      });

      this.outputResult(result);
    } catch (error) {
      this.outputError(`Plugin execution failed: ${error.message}`);
    }
  }

  /**
   * 从命令行参数获取URL
   */
  private getUrlFromArgs(args: string[]): string {
    const urlArg = args.find(arg => arg.startsWith('--url='));
    return urlArg ? urlArg.substring(6) : '';
  }

  /**
   * 处理下载URL生成
   */
  private async provideUrl(url: string, params: { forceresampled: boolean }): Promise<PluginResult> {
    try {
      // 验证URL格式
      const urlMatch = url.match(/https?:\/\/e(-|x)hentai\.org\/g\/([0-9]*)\/([0-z]*)\/*.*/);
      if (!urlMatch) {
        return { success: false, error: "Not a valid E-H URL!" };
      }

      const [, domainPrefix, gID, gToken] = urlMatch;
      const domain = domainPrefix === 'ex' ? 'https://exhentai.org' : 'https://e-hentai.org';

      // 生成archiver URL
      const archiverUrl = `${domain}/archiver.php?gid=${gID}&token=${gToken}`;

      // 检查archiver URL是否有效
      const checkResult = await this.checkArchiverUrl(archiverUrl);
      if (!checkResult.success) {
        return checkResult;
      }

      // 获取下载URL
      const downloadResult = await this.getDownloadUrl(archiverUrl, params.forceresampled);
      if (!downloadResult.success) {
        return downloadResult;
      }

      return {
        success: true,
        data: {
          download_url: downloadResult.data.finalUrl,
          archive_size: params.forceresampled ? 'resampled' : 'original'
        }
      };
    } catch (error) {
      return { success: false, error: `URL processing failed: ${error.message}` };
    }
  }

  /**
   * 检查archiver URL是否有效
   */
  private async checkArchiverUrl(archiverUrl: string): Promise<PluginResult> {
    try {
      const response = await fetch(archiverUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return { success: false, error: `Failed to access archiver: ${response.statusText}` };
      }

      const html = await response.text();

      if (html.includes('Invalid archiver key')) {
        return { success: false, error: `Invalid archiver key. (${archiverUrl})` };
      }

      if (html.includes('This page requires you to log on.')) {
        return { success: false, error: 'Invalid E*Hentai login credentials. Please make sure the login plugin has proper settings set.' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Archiver check failed: ${error.message}` };
    }
  }

  /**
   * 获取最终下载URL
   */
  private async getDownloadUrl(archiverUrl: string, forceresampled: boolean): Promise<PluginResult> {
    try {
      const dltype = forceresampled ? 'res' : 'org';
      const dlcheck = forceresampled ? 'Download+Resample+Archive' : 'Download+Original+Archive';

      const formData = new FormData();
      formData.append('dltype', dltype);
      formData.append('dlcheck', dlcheck);

      const response = await fetch(archiverUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return { success: false, error: `POST request failed: ${response.statusText}` };
      }

      const content = await response.text();

      // 检查GP不足
      if (content.includes('Insufficient funds')) {
        return { success: false, error: 'You do not have enough GP to download this URL.' };
      }

      // 解析最终URL
      const finalUrlMatch = content.match(/document\.location = "([^"]+)"/);
      if (!finalUrlMatch) {
        const archiveType = forceresampled ? 'resampled' : 'original size';
        return {
          success: false,
          error: `Couldn't proceed with ${archiveType} download: <pre>${content}</pre>`
        };
      }

      let finalUrl = finalUrlMatch[1];

      // 添加start=1参数自动触发下载
      const url = new URL(finalUrl);
      url.searchParams.set('start', '1');
      finalUrl = url.toString();

      return { success: true, data: { finalUrl } };
    } catch (error) {
      return { success: false, error: `Download URL generation failed: ${error.message}` };
    }
  }
}

// 运行插件
if (import.meta.main) {
  const plugin = new EHentaiDownloadPlugin();
  await plugin.handleCommand(Deno.args);
}
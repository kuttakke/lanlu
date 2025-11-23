#!/usr/bin/env deno run --allow-net --allow-read

import { BasePlugin, PluginInfo, PluginParameter, PluginResult } from '../base_plugin.ts';

/**
 * E-Hentai元数据插件
 * 从E-Hentai搜索并获取画廊标签和元数据
 */
class EHentaiMetadataPlugin extends BasePlugin {
  getPluginInfo(): PluginInfo {
    return {
      name: "E-Hentai",
      type: "metadata",
      namespace: "ehplugin",
      login_from: "ehlogin",
      author: "Difegue and others",
      version: "2.6",
      description: "Searches g.e-hentai for tags matching your archive. This plugin will use the source: tag of the archive if it exists.",
      parameters: [
        { type: "string", desc: "Forced language to use in searches (Japanese won't work due to EH limitations)" },
        { type: "bool", desc: "Fetch using thumbnail first (falls back to title)" },
        { type: "bool", desc: "Search using gID from title (falls back to title)" },
        { type: "bool", desc: "Use ExHentai (enable to search for fjorded content without star cookie)" },
        { type: "bool", desc: "Save the original title when available instead of the English or romanised title" },
        { type: "bool", desc: "Fetch additional timestamp (time posted) and uploader metadata" },
        { type: "bool", desc: "Search only expunged galleries" }
      ],
      oneshot_arg: "E-H Gallery URL (Will attach tags matching this exact gallery to your archive)",
      cooldown: 4,
      icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAAOASURBVDhPjVNbaFRXFF3n3puZyZ3EzJ1HkpIohthAP0InYMAKUUpfVFDylY9Bg1CJ+UllfLSEIoIEtBan7Y9t8KO0pSU0lH74oQZsMWImkSBalUADqR8mTVOTyXMymcfd7nPuNZpo2yzm3DmPfdZZZ+91MDyYJA0g+AMkStY3i8Brn392jjYKIclK7hP0rNzK7XkIIM8BdlRgkdYvvhya7bcUGT0ugKbXNZ4zcsCS+Qoycyl3y39DCL5qoJ+DpUKvM6mwzIcsFQCfjtmfL+LQX5cRa+9AOp12A57Btm1UV1ejoaHBIbTupDB/YB/yg5fcEKDo3VaUnPoWlLZBfg1zOwU6OjqQSr2o1DAMJJNJNDU1OYTBeynMNFbBPHoRwirnxOWgVW2DVhbh4wsQQR2p3VWgxXGX4uWQxJxyFyvLKHpzDzy7tsOz+w1olkMmQfKW+z/Gmc7javxvKC0t5SSywtCfRFplDYlNIRJlES65QYEbRNYQrf77bxFtKRauOYj6+vook8m4IweBAFtNXfl+CtP1FszD56VuLo6J/O/XYT98AL1+FwojQxChSuRuXsV3X55mywbR1taGlpYWlbfx8XHEYjFVFEfhQ2UyCriKAv2sapjIF/+agndZ3dmrZP1GpH/4Fb1eu0XF9vT0UHd3t+onEgkaGxuj8vJy+UieQfPzASxQNqxwyyyD2D5YmoU9PwfP3naETS+i0Siam5vBJOjq6kI8HkdNTQ2y2SzkVmZQXyydPMIEC+y/eRQfuQAU8mreznBVhIAvBFwb+YeLdA+6z0RFRQUmJiZUzFMohVKFr/UUq5jmAU/ofM5KGkWN74HY8MarnBtv8Wq1T350DLquw+PxyO1rIOC3KJicQbZ/SFpeKUGBvVfGchhaZDOEybnIs4U0HTYfOP+OABcVvb29qjCyL2FZlrysTqHJPBY+OMwbpGBJmIPx2g5FbuzYC30ze9KxJEQYmIlWclom1Xh0dBR1dXWKNBwOQxxtP0SJn/qBne+vGlmBXwtHATmujtfDP9nn3Hj9WBn4FefiB3Gi8xM32IFSKA05cvc2Jh894rysKbqCaZq48MWn+OaPrUBjTKUD37+Fqam/EYnwM30OklBK/V8spqYIRh3hB8evd4YH3ZW1YELaEKGE32sQKt6mK7/86M68CHnYhgkTifNqQ21trVKyvsm1gYEBegL+M2W04901FQAAAABJRU5ErkJggg=="
    };
  }

  protected async runPlugin(args: string[]): Promise<void> {
    try {
      const params = this.parseParams(args);
      const oneshotParam = this.getOneshotParam(args);

      // 从环境变量或参数中获取必要信息
      const lrrInfo = {
        archive_title: Deno.env.get('ARCHIVE_TITLE') || '',
        existing_tags: Deno.env.get('EXISTING_TAGS') || '',
        thumbnail_hash: Deno.env.get('THUMBNAIL_HASH') || '',
        oneshot_param: oneshotParam
      };

      const result = await this.getTags(
        lrrInfo,
        params.lang || '',
        params.usethumbs || false,
        params.search_gid || false,
        params.enablepanda || false,
        params.jpntitle || false,
        params.additionaltags || false,
        params.expunged || false
      );

      this.outputResult(result);
    } catch (error) {
      this.outputError(`Plugin execution failed: ${error.message}`);
    }
  }

  private async getTags(
    lrrInfo: any,
    lang: string,
    usethumbs: boolean,
    search_gid: boolean,
    enablepanda: boolean,
    jpntitle: boolean,
    additionaltags: boolean,
    expunged: boolean
  ): Promise<PluginResult> {
    let gID = "";
    let gToken = "";
    const domain = enablepanda ? 'https://exhentai.org' : 'https://e-hentai.org';
    let hasSrc = false;

    // 从oneshot参数或source标签提取gallery IDs
    if (lrrInfo.oneshot_param && lrrInfo.oneshot_param.match(/.*\/g\/([0-9]*)\/([0-z]*)\/*.*/)) {
      const match = lrrInfo.oneshot_param.match(/.*\/g\/([0-9]*)\/([0-z]*)\/*.*/);
      if (match) {
        gID = match[1];
        gToken = match[2];
      }
    } else if (lrrInfo.existing_tags && lrrInfo.existing_tags.match(/.*source:\s*(?:https?:\/\/)?e(?:x|-)hentai\.org\/g\/([0-9]*)\/([0-z]*)\/*.*/gi)) {
      const match = lrrInfo.existing_tags.match(/.*source:\s*(?:https?:\/\/)?e(?:x|-)hentai\.org\/g\/([0-9]*)\/([0-z]*)\/*.*/gi);
      if (match) {
        const srcMatch = match[0].match(/g\/([0-9]*)\/([0-z]*)/);
        if (srcMatch) {
          gID = srcMatch[1];
          gToken = srcMatch[2];
          hasSrc = true;
        }
      }
    }

    if (!gID) {
      // 搜索matching gallery
      const searchResult = await this.lookupGallery(
        lrrInfo.archive_title,
        lrrInfo.existing_tags,
        lrrInfo.thumbnail_hash,
        domain,
        lang,
        usethumbs,
        search_gid,
        expunged
      );

      if (searchResult.success) {
        gID = searchResult.data.gID;
        gToken = searchResult.data.gToken;
      } else {
        return searchResult;
      }
    }

    if (!gID) {
      return { success: false, error: "No matching EH Gallery Found!" };
    }

    // 获取tags
    const tagsResult = await this.getTagsFromEH(gID, gToken, jpntitle, additionaltags);
    if (!tagsResult.success) {
      return tagsResult;
    }

    const hashData: any = { tags: tagsResult.data.tags };

    // 添加source URL和title
    if (hashData.tags) {
      if (!hasSrc) {
        const sourceUrl = `${domain.replace('https://', '')}/g/${gID}/${gToken}`;
        hashData.tags += `, source:${sourceUrl}`;
      }
      hashData.title = tagsResult.data.title;
    }

    return { success: true, data: hashData };
  }

  private async lookupGallery(
    title: string,
    tags: string,
    thumbhash: string,
    domain: string,
    defaultlanguage: string,
    usethumbs: boolean,
    search_gid: boolean,
    expunged: boolean
  ): Promise<PluginResult> {
    try {
      // 缩略图反向搜索
      if (thumbhash && usethumbs) {
        const url = `${domain}?f_shash=${thumbhash}&fs_similar=on&fs_covers=on`;
        const result = await this.ehentaiParse(url);
        if (result.success) {
          return result;
        }
      }

      // 使用标题中的gID搜索
      if (search_gid) {
        const titleGidMatch = title.match(/\[([0-9]+)\]/g);
        if (titleGidMatch) {
          const gid = titleGidMatch[0].replace(/\[|\]/g, '');
          const url = `${domain}?f_search=gid:${gid}`;
          const result = await this.ehentaiParse(url);
          if (result.success) {
            return result;
          }
        }
      }

      // 常规文本搜索
      let url = `${domain}?advsearch=1&f_sfu=on&f_sft=on&f_sfl=on&f_search=${encodeURIComponent(`"${title}"`)}`;

      // 添加artist标签
      const artistMatch = tags.match(/.*artist:\s?([^,]*),*.*/gi);
      if (artistMatch && artistMatch[0]) {
        const artist = artistMatch[0].replace(/.*artist:\s?([^,]*),*.*/gi, '$1');
        if (/^[\x00-\x7F]*$/.test(artist)) {
          url += `+${encodeURIComponent(`artist:${artist}`)}`;
        }
      }

      // 添加语言覆盖
      if (defaultlanguage) {
        url += `+${encodeURIComponent(`language:${defaultlanguage}`)}`;
      }

      // 搜索已删除画廊
      if (expunged) {
        url += "&f_sh=on";
      }

      return await this.ehentaiParse(url);
    } catch (error) {
      return { success: false, error: `Gallery lookup failed: ${error.message}` };
    }
  }

  private async ehentaiParse(url: string): Promise<PluginResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const html = await response.text();

      // 检查是否被临时禁止
      if (html.includes('Your IP address has been')) {
        return { success: false, error: 'Temporarily banned from EH for excessive pageloads.' };
      }

      // 解析搜索结果
      const glinkMatch = html.match(/<a[^>]*href="[^"]*\/g\/(\d+)\/([^"\/]*)[^"]*"[^>]*>\s*<div[^>]*class="glink"[^>]*>/i);
      if (glinkMatch) {
        const gID = glinkMatch[1];
        const gToken = glinkMatch[2];
        return { success: true, data: { gID, gToken } };
      }

      return { success: false, error: 'No gallery found in search results' };
    } catch (error) {
      return { success: false, error: `Search failed: ${error.message}` };
    }
  }

  private async getTagsFromEH(
    gID: string,
    gToken: string,
    jpntitle: boolean,
    additionaltags: boolean
  ): Promise<PluginResult> {
    try {
      const response = await fetch('https://api.e-hentai.org/api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: JSON.stringify({
          method: "gdata",
          gidlist: [[parseInt(gID), gToken]],
          namespace: 1
        })
      });

      if (!response.ok) {
        return { success: false, error: `API request failed: ${response.statusText}` };
      }

      const json = await response.json();

      if (json.error) {
        return { success: false, error: json.error };
      }

      const data = json.gmetadata[0];
      if (!data) {
        return { success: false, error: 'No metadata returned from API' };
      }

      const tags = [...data.tags, `category:${data.category.toLowerCase()}`];

      if (additionaltags) {
        if (data.uploader) {
          tags.push(`uploader:${data.uploader}`);
        }
        if (data.posted) {
          tags.push(`timestamp:${data.posted}`);
        }
      }

      const title = jpntitle && data.title_jpn ? data.title_jpn : data.title;

      return {
        success: true,
        data: {
          tags: tags.join(', '),
          title: this.htmlUnescape(title)
        }
      };
    } catch (error) {
      return { success: false, error: `API call failed: ${error.message}` };
    }
  }

  private htmlUnescape(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}

// 运行插件
if (import.meta.main) {
  const plugin = new EHentaiMetadataPlugin();
  await plugin.handleCommand(Deno.args);
}
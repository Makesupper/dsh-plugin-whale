import { soundLibrary } from '../data/sounds.js';
import { formatMeritCount, formatTokenLabel, formatWhaleWeight, formatWeightDelta } from '../format.js';
const VALID_CYCLES = new Set([0, 9, 21, 49, 108, 1080]);
export function createWhaleTools(whale) {
    const whaleSpeak = {
        name: 'whale_speak',
        description: '让深度求索 3D 鲸鱼娘即时朗读一段话，并在朗读期间自动敲击电子木鱼伴奏投喂白米饭增重。',
        parameters: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: '需要鲸鱼娘朗读的文本内容（自动切句并通过 Web Speech 播报 + 木鱼伴奏）'
                },
                knockCount: {
                    type: 'number',
                    description: '可选立即投喂的白米饭份数/体重增量（1 ~ 108，默认 1kg）'
                }
            },
            required: ['text']
        },
        output: {
            schema: { type: 'object' },
            render: (_args, res) => {
                let text = `🐋 鲸鱼娘正在播报（共切分 ${res.enqueuedCount} 句，木鱼伴奏已就绪）：\n`;
                text += `「${res.currentSpeech.text}」\n`;
                text += `🍚 投喂白米饭 ${formatWeightDelta(res.amount)} | 今日增重：${formatWeightDelta(res.todayMerit)} | 当前体重：${formatWhaleWeight(res.totalMerit)}`;
                return [{ type: 'text', text }];
            }
        },
        async execute(args) {
            const rawText = typeof args?.text === 'string' ? args.text.trim() : '';
            const added = rawText ? whale.enqueueLlmSpeech(rawText, 'tool') : [];
            const rawCount = Number(args?.knockCount);
            const count = Number.isFinite(rawCount) ? Math.min(108, Math.max(1, Math.floor(rawCount))) : 1;
            const knockRes = whale.knock(count);
            return {
                ...knockRes,
                enqueuedCount: added.length,
                enqueuedSegments: added
            };
        }
    };
    const whaleKnock = {
        name: 'whale_knock',
        description: '给 3D 鲸鱼娘投喂白米饭并敲击木鱼伴奏（count 表示单次投喂份数/增重kg，上限 108），返回当前语音台词与体重信息。',
        parameters: {
            type: 'object',
            properties: {
                count: {
                    type: 'number',
                    description: '本次投喂白米饭份数（整数 1 ~ 108，默认 1，每次增重 1kg）'
                },
                sound: {
                    type: 'string',
                    enum: ['whale_deep', 'whale_song', 'whale_echo', 'whale_52hz', 'sandalwood', 'whitewood', 'bell'],
                    description: '可选指定鲸鱼叫声与伴奏音色：whale_deep(蓝鲸深鸣), whale_song(座头长歌), whale_echo(虎鲸清越), whale_52hz(52Hz低语), sandalwood(紫檀沉音), whitewood(清脆白木), bell(古刹清磬)'
                }
            },
            required: []
        },
        output: {
            schema: { type: 'object' },
            render: (_args, res) => {
                let text = `🍚 投喂白米饭 ${formatWeightDelta(res.amount)}！\n`;
                text += `【今日增重】${formatWeightDelta(res.todayMerit)}  |  【当前总体重】${formatWhaleWeight(res.totalMerit)}\n`;
                text += `【鲸鱼娘当前台词】「${res.currentSpeech.text}」\n`;
                text += `🔔 伴奏音色：${res.soundDisplayName} (${res.soundType})`;
                return [{ type: 'text', text }];
            }
        },
        async execute(args) {
            const rawCount = Number(args?.count);
            const count = Number.isFinite(rawCount)
                ? Math.min(108, Math.max(1, Math.floor(rawCount)))
                : 1;
            if (args?.sound && (soundLibrary[args.sound])) {
                whale.setSoundType(args.sound);
            }
            const result = whale.knock(count);
            const soundDef = soundLibrary[result.soundType];
            return {
                ...result,
                soundDisplayName: soundDef.displayName
            };
        }
    };
    const whaleAutoKnock = {
        name: 'whale_auto_knock',
        description: '控制服务端常驻自动木鱼伴奏任务（开始、停止或查询状态）。注：朗读 LLM 回复时客户端会自动伴奏，此工具用于开启独立常驻伴奏。',
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['start', 'stop', 'status'],
                    description: '操作类型："start"、"stop" 或 "status"'
                },
                cycle: {
                    type: 'number',
                    description: '目标次数：0(无尽伴奏), 9, 21, 49, 108, 1080。默认为 108 次。'
                },
                intervalMs: {
                    type: 'number',
                    description: '每次敲击的间隔毫秒数，范围 200 ~ 60000，默认 1200 毫秒'
                }
            },
            required: ['action']
        },
        output: {
            schema: { type: 'object' },
            render: (_args, res) => {
                if (res.action === 'stop') {
                    return [{
                            type: 'text',
                            text: `⏹️ 鲸鱼娘常驻伴奏已停止。本轮共完成伴奏敲击 ${res.currentCount} 次。`
                        }];
                }
                if (res.action === 'status') {
                    return [{
                            type: 'text',
                            text: `📊 鲸鱼娘伴奏状态：${res.running ? '运行中' : '已停止'} | 周期：${res.cycleTitle} | 已完成：${res.currentCount}/${res.targetCount === 0 ? '∞' : res.targetCount} 次 | 间隔：${res.intervalMs}ms`
                        }];
                }
                let note = '';
                if (res.cycleFallbackNote) {
                    note = `\n⚠️ 提示：${res.cycleFallbackNote}`;
                }
                return [{
                        type: 'text',
                        text: `▶️ 鲸鱼娘常驻木鱼伴奏已启动！\n目标：${res.cycleTitle} | 节奏：每 ${res.intervalMs}ms 敲击一次${note}`
                    }];
            }
        },
        async execute(args) {
            if (args?.action === 'stop') {
                const status = whale.stopAutoKnock();
                return { action: 'stop', ...status };
            }
            if (args?.action === 'status') {
                const status = whale.getAutoKnockStatus();
                return { action: 'status', ...status };
            }
            const rawCycle = Number(args?.cycle);
            let cycle = 108;
            let cycleFallbackNote;
            if (args?.cycle === undefined || args?.cycle === null) {
                cycle = 108;
            }
            else if (Number.isFinite(rawCycle) && VALID_CYCLES.has(Math.floor(rawCycle))) {
                cycle = Math.floor(rawCycle);
            }
            else {
                cycle = 108;
                cycleFallbackNote = `传入的周期 (${args?.cycle}) 非标准圆满周期，已自动归一为 108 次。`;
            }
            const rawInterval = Number(args?.intervalMs);
            const interval = Number.isFinite(rawInterval)
                ? Math.min(60000, Math.max(200, Math.floor(rawInterval)))
                : undefined;
            const status = whale.startAutoKnock(cycle, interval, cycle === 0 ? '深海常驻伴奏' : `${cycle} 次伴奏圆满`);
            return { action: 'start', cycleFallbackNote, ...status };
        }
    };
    const whaleGetMerit = {
        name: 'whale_get_merit',
        description: '查看鲸鱼娘体重簿、今日增重、当前总体重（过1000kg显示为t）、会话度化 Token 统计以及按日历史明细。',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        },
        output: {
            schema: { type: 'object' },
            render: (_args, res) => {
                let text = `🐋 【鲸鱼娘体重簿总览】\n`;
                text += `• 今日增重：${formatWeightDelta(res.todayMerit)} (今日投喂消耗 ${formatTokenLabel(res.todayTokens)})\n`;
                text += `• 当前总体重：${formatWhaleWeight(res.totalMerit)} (累计消耗 ${formatTokenLabel(res.totalTokens)})\n`;
                text += `• 缓冲池蓄力余数：${res.pendingTokens ?? 0} Tokens\n\n`;
                text += `📅 【近期投喂记录】\n`;
                if (res.records && res.records.length > 0) {
                    for (const item of res.records.slice(0, 7)) {
                        const tokInfo = item.tokens ? ` (消耗 ${formatTokenLabel(item.tokens)})` : '';
                        const meritText = item.count >= 0
                            ? `增重 ${formatWeightDelta(item.count)}`
                            : `减重 ${formatWeightDelta(item.count)}`;
                        text += `  - ${item.displayDate} (${item.dateKey})：${meritText}${tokInfo}\n`;
                    }
                }
                else {
                    text += `  (暂无历史记录)\n`;
                }
                return [{ type: 'text', text }];
            }
        },
        async execute() {
            return whale.getMeritStats();
        }
    };
    const whalePlaySound = {
        name: 'whale_play_sound',
        description: '切换或获取鲸鱼娘伴奏音色与鲸叫（蓝鲸深鸣、座头长歌、虎鲸清越、52Hz低语、紫檀木鱼等）。',
        parameters: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['whale_deep', 'whale_song', 'whale_echo', 'whale_52hz', 'sandalwood', 'whitewood', 'bell'],
                    description: '音色类型：whale_deep(蓝鲸深鸣), whale_song(座头长歌), whale_echo(虎鲸清越), whale_52hz(52Hz低语), sandalwood(紫檀沉音), whitewood(清脆白木), bell(古刹清磬)'
                }
            },
            required: []
        },
        output: {
            schema: { type: 'object' },
            render: (_args, res) => {
                let text = `🔔 【伴奏木鱼音色】当前音色：${res.currentSound.displayName}\n`;
                text += `描述：${res.currentSound.description}\n`;
                text += `本地音频资源路径：${res.soundFilePath}\n`;
                return [{ type: 'text', text }];
            }
        },
        async execute(args) {
            if (args?.type && (soundLibrary[args.type])) {
                whale.setSoundType(args.type);
            }
            const soundType = whale.getSoundType();
            const def = soundLibrary[soundType];
            return {
                currentSound: def,
                soundFilePath: whale.getSoundFile(soundType)
            };
        }
    };
    const whaleFeedTokens = {
        name: 'whale_feed_tokens',
        description: '外部或手动补记 Token 消耗量（日常会话已由 session/event 自动折算投喂增重）。',
        parameters: {
            type: 'object',
            properties: {
                tokens: {
                    type: 'number',
                    description: '手动补记的 Token 数量（非负整数）'
                }
            },
            required: ['tokens']
        },
        output: {
            schema: { type: 'object' },
            render: (_args, res) => {
                const step = res.tokensPerMerit ?? 10000;
                const absStep = Math.abs(step);
                let text = `⚡ 补记消耗 ${formatTokenLabel(res.tokensConsumed)}！\n`;
                if (res.meritGained > 0) {
                    text += `🍚 投喂白米饭 ${formatWeightDelta(res.meritGained)}（触发木鱼伴奏 ${res.knocksTriggered} 次）！\n`;
                }
                else if (res.meritGained < 0) {
                    text += `💥 鲸鱼娘减重 ${formatWeightDelta(res.meritGained)}！\n`;
                }
                else {
                    text += `🌊 投喂蓄力中：当前缓冲池 ${res.pendingTokens} / ${formatMeritCount(absStep)} Tokens。\n`;
                }
                text += `【体重状况】今日增重: ${formatWeightDelta(res.todayMerit)} | 当前体重: ${formatWhaleWeight(res.totalMerit)}`;
                return [{ type: 'text', text }];
            }
        },
        async execute(args) {
            const rawTokens = Number(args?.tokens);
            const tokens = Number.isFinite(rawTokens) && rawTokens > 0
                ? Math.round(rawTokens)
                : 0;
            const res = whale.feedTokens(tokens);
            return {
                ...res,
                tokensPerMerit: whale.getTokensPerMerit()
            };
        }
    };
    return [whaleSpeak, whaleKnock, whaleAutoKnock, whaleGetMerit, whalePlaySound, whaleFeedTokens];
}
//# sourceMappingURL=index.js.map
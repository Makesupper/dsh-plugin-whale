import Schema from './shims.js';
export const Config = Schema.object({
    defaultSound: Schema.union(['whale_deep', 'whale_song', 'whale_echo', 'whale_52hz', 'sandalwood', 'whitewood', 'bell'])
        .default('whale_deep')
        .description('默认鲸鱼叫声与伴奏音色：whale_deep(蓝鲸深鸣)、whale_song(座头长歌)、whale_echo(虎鲸清越)、whale_52hz(52Hz低语)等'),
    accompanimentIntervalMs: Schema.number()
        .min(200)
        .max(60000)
        .default(1200)
        .description('鲸鱼娘语音朗读 LLM 回复时的木鱼自动伴奏节拍间隔(毫秒，范围 200 ~ 60000)'),
    autoKnockIntervalMs: Schema.number()
        .min(200)
        .max(60000)
        .default(1200)
        .description('常驻自动敲击节拍间隔(毫秒，范围 200 ~ 60000)'),
    autoKnockMaxDurationMs: Schema.number()
        .min(1000)
        .max(86400000)
        .default(1800000)
        .description('常驻自动伴奏单次最大持续时长(毫秒，默认 30 分钟自动停止)'),
    voiceEnabled: Schema.boolean()
        .default(true)
        .description('是否默认开启 LLM 即时回复语音朗读'),
    voiceRate: Schema.number()
        .min(0.1)
        .max(2.0)
        .default(0.92)
        .description('鲸鱼娘语音语速 (0.1 ~ 2.0，默认 0.92 轻快灵动)'),
    voicePitch: Schema.number()
        .min(0.1)
        .max(2.0)
        .default(1.05)
        .description('鲸鱼娘语音音调 (0.1 ~ 2.0，默认 1.05 清亮少女音)'),
    volume: Schema.number()
        .min(0.0)
        .max(1.0)
        .default(1.0)
        .description('声音音量 (0.0 ~ 1.0)'),
    storagePath: Schema.string()
        .description('体重与投喂记录自定义持久化存储路径（留空则优先使用 $DSH_HOME/whale-data/merit_history.json，否则保存在 ~/.dsh/whale-data/）'),
    tokenKnockEnabled: Schema.boolean()
        .default(true)
        .description('是否开启按会话消耗 Token 自动投喂增重'),
    tokensPerMerit: Schema.number()
        .min(-10000000)
        .max(10000000)
        .default(10000)
        .description('每多少 Token 投喂增重 1kg（默认 10000）；负数表示每 abs(N) Token 减重 1kg'),
    modelUrl: Schema.string()
        .default('')
        .description('可选外部 3D 模型 URL（.glb / .gltf），留空则使用内置 3D 深度求索鲸鱼娘模型'),
    resetRuntimeState: Schema.boolean()
        .default(false)
        .description('启动时清除已保存的音色与阈值状态（一次性）')
});
//# sourceMappingURL=config.js.map
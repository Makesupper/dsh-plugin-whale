# dsh-plugin-whale

**深度求索 3D 鲸鱼娘伴侣插件（DeepSeek 3D Whale Companion）**

基于 `dsh-plugin` 架构打造的前后端一体悬浮伴侣插件：
- **3D 深度求索鲸鱼娘舞台（`WhaleStage3D`）**：内置零外部依赖的程序化 3D 深度求索鲸鱼娘模型（含 3D 透视投影、呼吸起伏、双马尾鳍与鲸尾摆动、眨眼、随语音实时口型同步、伴奏迷你木鱼与深海声呐水波纹），并预留外部 `.glb` / `.gltf` 3D 模型挂载槽。
- **LLM 即时回复语音朗读（完全替换模式）**：监听 DSH `session/event` 中的 `assistant/message`，自动清洗 Markdown 与代码块、按自然句切分推入实时语音队列，由前端 `Web Speech API` 即时朗读。
- **朗读期间木鱼自动伴奏**：当鲸鱼娘开始朗读 LLM 回复时，自动按设定节拍（默认 `1200ms`，可在面板切换 `600ms / 900ms / 1200ms / 1800ms`）敲击电子木鱼/清磬伴奏并积攒功德；朗读完毕后自动停止伴奏。同时也支持手动点击互动与常驻伴奏开关。

## 构建与测试

```bash
cd dsh-plugin-whale
npm test
```

## 预留外部 3D 模型加载方式

1. **挂件设置面板切换**：点击挂件下方 `⚙ 鲸鱼设置` -> `🧊 3D模型`，填入 `.glb` / `.gltf` 模型地址并保存。
2. **前端事件动态切换**：
   ```js
   window.dispatchEvent(new CustomEvent('dsh-whale:load-model', {
     detail: { url: '/path/to/deepseek-whale.glb' }
   }))
   ```

## 许可证

本项目基于 [MIT License](./LICENSE) 开源，Copyright (c) 2026 Makesupper。

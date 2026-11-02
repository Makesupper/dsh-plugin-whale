import type { SoundDefinition, MuyuSoundType } from '../types.js'

export const soundLibrary: Record<MuyuSoundType, SoundDefinition> = {
  whale_deep: {
    id: 'whale_deep',
    displayName: '蓝鲸深鸣',
    description: '深沉悠远，低频潜游，宛若深海古老巨灵的召唤',
    fileName: 'whale_deep.wav'
  },
  whale_song: {
    id: 'whale_song',
    displayName: '座头长歌',
    description: '空灵宛转，旋律起伏，如穿透透光海层的优美圣歌',
    fileName: 'whale_song.wav'
  },
  whale_echo: {
    id: 'whale_echo',
    displayName: '虎鲸清越',
    description: '轻快清亮，声呐脉冲，水晶般晶莹透亮的回响',
    fileName: 'whale_echo.wav'
  },
  whale_52hz: {
    id: 'whale_52hz',
    displayName: '52Hz 低语',
    description: '纯净共鸣，孤独疗愈，直抵心灵深处的温柔频率',
    fileName: 'whale_52hz.wav'
  },
  sandalwood: {
    id: 'sandalwood',
    displayName: '紫檀沉音',
    description: '浑厚沉稳，声如古庙老木，定心凝神',
    fileName: 'muyu.wav'
  },
  whitewood: {
    id: 'whitewood',
    displayName: '清脆白木',
    description: '轻盈通透，高频脆爽，提神醒脑',
    fileName: 'muyu_bright.wav'
  },
  bell: {
    id: 'bell',
    displayName: '古刹清磬',
    description: '悠扬致远，余音绕梁，震荡心扉',
    fileName: 'muyu_bell.wav'
  }
}

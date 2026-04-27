import { CommentData, AgentNode } from './types';

export const MOCK_COMMENTS: CommentData[] = [
  { id: '1', user: 'TeslaFan_01', content: 'Model Y的新悬挂感觉不错，但是今天早上刹车感觉有点硬。', platform: 'xiaohongshu', timestamp: '2小时前', likes: 124, status: 'pending', sentiment: 'neutral', riskLevel: 'low' },
  { id: '2', user: 'AutoCritic', content: '大促来了！Model Y脚垫半价，仅限今日！抢购点击...', platform: 'xiaohongshu', timestamp: '3小时前', likes: 5, status: 'pending', sentiment: 'neutral', riskLevel: 'low' },
  { id: '3', user: 'DriveSafe', content: '高速上刹车失灵了，太恐怖了，完全失控。我们要讨个说法！', platform: 'xiaohongshu', timestamp: '5小时前', likes: 892, status: 'pending', sentiment: 'negative', riskLevel: 'high' },
  { id: '4', user: 'EV_Life', content: '刚提了Y，超爱白色内饰，科技感拉满。', platform: 'xiaohongshu', timestamp: '6小时前', likes: 45, status: 'pending', sentiment: 'positive', riskLevel: 'low' },
  { id: '5', user: 'SpamBot99', content: '兼职刷单，日入500，私聊我。', platform: 'xiaohongshu', timestamp: '1小时前', likes: 0, status: 'pending', sentiment: 'neutral', riskLevel: 'low' },
  { id: '6', user: 'AngryOwner', content: '开车时屏幕死机了三次，太危险了，这就是所谓的智能车？', platform: 'xiaohongshu', timestamp: '1天前', likes: 330, status: 'pending', sentiment: 'negative', riskLevel: 'medium' },
  { id: '7', user: 'TechBro', content: 'FSD Beta太强了，环岛处理得很完美，遥遥领先。', platform: 'xiaohongshu', timestamp: '2天前', likes: 56, status: 'pending', sentiment: 'positive', riskLevel: 'low' },
  { id: '8', user: 'ConcernedMom', content: '听说刹车变硬的传闻，带孩子坐车安全吗？有点不敢开了。', platform: 'xiaohongshu', timestamp: '4小时前', likes: 112, status: 'pending', sentiment: 'negative', riskLevel: 'medium' },
  { id: '9', user: 'AdAccount', content: '新车必备陶瓷镀晶，点击主页链接查看详情。', platform: 'xiaohongshu', timestamp: '30分钟前', likes: 2, status: 'pending', sentiment: 'neutral', riskLevel: 'low' },
  { id: '10', user: 'LegalEagle', content: '我们正在组织关于幽灵刹车问题的集体诉讼，请受害者联系。', platform: 'xiaohongshu', timestamp: '10分钟前', likes: 1500, status: 'pending', sentiment: 'negative', riskLevel: 'high' },
];

export const INITIAL_NODES: AgentNode[] = [
  { id: 'n1', type: 'dataset', label: '数据集 #202601', x: 100, y: 300, status: 'completed' },
  { id: 'n2', type: 'agent', label: '情感分析 Agent', x: 350, y: 300, status: 'idle', prompt: '分析评论的情感倾向（正面/负面/中性）。' },
  { id: 'n3', type: 'agent', label: '风险提取 Agent', x: 600, y: 200, status: 'idle', prompt: '识别法律风险、安全隐患和公关危机。' },
  { id: 'n4', type: 'output', label: '生成报告', x: 850, y: 300, status: 'idle' },
];

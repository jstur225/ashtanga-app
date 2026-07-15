export interface Pose {
  id: string
  name: string
  sanskrit: string
  category: 'standing' | 'seated' | 'inversion'
  image: string
  thumbnail: string
  steps: string[]
}

export interface PoseCategory {
  id: Pose['category']
  name: string
}

export const POSE_CATEGORIES: PoseCategory[] = [
  { id: 'standing', name: '站立体式' },
  { id: 'seated', name: '坐立体式' },
  { id: 'inversion', name: '倒立' },
]

export const POSES: Pose[] = [
  {
    id: 'ip-surya-a-02',
    name: '拜日 A · 02（IP 样片）',
    sanskrit: 'Surya Namaskara A · 02',
    category: 'standing',
    image: '/poses/ip-v1/surya-a-02.png',
    thumbnail: '/poses/ip-v1/surya-a-02.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'ip-surya-a-05',
    name: '拜日 A · 05（IP 样片）',
    sanskrit: 'Surya Namaskara A · 05',
    category: 'standing',
    image: '/poses/ip-v1/surya-a-05.png',
    thumbnail: '/poses/ip-v1/surya-a-05.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'ip-virabhadrasana-2',
    name: '战士二式（IP 样片）',
    sanskrit: 'Virabhadrasana II',
    category: 'standing',
    image: '/poses/ip-v1/virabhadrasana-2.png',
    thumbnail: '/poses/ip-v1/virabhadrasana-2.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'ip-prasarita-padottanasana-c',
    name: '双角 C（IP 样片）',
    sanskrit: 'Prasarita Padottanasana C',
    category: 'standing',
    image: '/poses/ip-v1/prasarita-padottanasana-c.png',
    thumbnail: '/poses/ip-v1/prasarita-padottanasana-c.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'ip-marichyasana-a',
    name: '圣哲马里奇 A（IP 样片）',
    sanskrit: 'Marichyasana A',
    category: 'seated',
    image: '/poses/ip-v1/marichyasana-a.png',
    thumbnail: '/poses/ip-v1/marichyasana-a.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'ip-supta-padangusthasana-01',
    name: '仰卧手抓大脚趾 01（IP 样片）',
    sanskrit: 'Supta Padangusthasana · 01',
    category: 'seated',
    image: '/poses/ip-v1/supta-padangusthasana-01.png',
    thumbnail: '/poses/ip-v1/supta-padangusthasana-01.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'ip-sirsasana',
    name: '头倒立（IP 样片）',
    sanskrit: 'Sirsasana',
    category: 'inversion',
    image: '/poses/ip-v1/sirsasana.png',
    thumbnail: '/poses/ip-v1/sirsasana.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'ip-savasana',
    name: '休息术（IP 样片）',
    sanskrit: 'Savasana',
    category: 'seated',
    image: '/poses/ip-v1/savasana.png',
    thumbnail: '/poses/ip-v1/savasana.png',
    steps: ['首批 IP 风格样片，仅用于检查手机端视觉效果。'],
  },
  {
    id: 'standing-forward-fold',
    name: '站立前屈',
    sanskrit: 'Padangusthasana · Padahastasana',
    category: 'standing',
    image: '/poses/standing-forward-fold.webp',
    thumbnail: '/poses/standing-forward-fold-thumb.webp',
    steps: [
      '双脚分开与髋同宽，双手叉腰',
      '呼气，前屈向下，手抓大脚趾',
      '吸气，抬头延展，看眉心',
      '呼气，前屈看鼻尖，停留 5 次呼吸',
      '吸气抬头，呼气松开大脚趾，手掌放在脚掌下',
      '吸气，抬头延展，看眉心',
      '呼气，前屈看鼻尖，停留 5 次呼吸',
      '吸气抬头，呼气双手叉腰；吸气起身，呼气回到山式',
    ],
  },
  {
    id: 'upavishta-konasana',
    name: '坐角式',
    sanskrit: 'Upaviṣṭa Koṇāsana',
    category: 'seated',
    image: '/poses/upavishta-konasana.webp',
    thumbnail: '/poses/upavishta-konasana-thumb.webp',
    steps: [
      '从下犬式，吸气跳穿，双腿尽可能宽地分开坐下',
      '抓住脚的两侧，抬起头部和胸部',
      '呼气，内收腹部，缓慢将头部和胸部放在地板上',
      '停留 5 次呼吸（随练习进步可下巴贴地）',
      '吸气，只抬起头部',
      '呼气，抓住脚的两侧',
      '吸气，抬起身体坐直，双腿分开伸直向上看',
      '后续串联体位回到下犬式',
    ],
  },
  {
    id: 'supta-konasana',
    name: '睡角式',
    sanskrit: 'Supta Koṇāsana',
    category: 'seated',
    image: '/poses/supta-konasana.webp',
    thumbnail: '/poses/supta-konasana-thumb.webp',
    steps: [
      '从背部伸展式，吸气双腿并拢平躺，用力伸直双腿',
      '呼气，吸气抬起双腿',
      '呼气，双腿越过头顶，向两侧打开，抓住大脚趾',
      '停留 5 次呼吸，腹部完全内收（不用根锁）',
      '吸气，不弯曲双腿进入坐角式',
      '后续串联体位回到下犬式',
    ],
  },
  {
    id: 'matsyasana',
    name: '鱼式',
    sanskrit: 'Matsyāsana',
    category: 'inversion',
    image: '/poses/matsyasana.webp',
    thumbnail: '/poses/matsyasana-thumb.webp',
    steps: [
      '如肩倒立式一样躺下',
      '吸气做莲花式，双手按压头部两侧地板',
      '呼气，抬头，头顶放在地板上，背部向上拱起',
      '抓住双脚，伸直手臂',
      '停留 5 次呼吸',
      '放平头部，解开莲花式',
      '后翻轮式回到四柱',
    ],
  },
  {
    id: 'uttana-padasana',
    name: '完全鱼式',
    sanskrit: 'Uttāna Pādāsana',
    category: 'inversion',
    image: '/poses/uttana-padasana.webp',
    thumbnail: '/poses/uttana-padasana-thumb.webp',
    steps: [
      '如肩倒立式一样躺下',
      '抬头，头顶放在地板上，背部拱起',
      '如船式伸展双腿，伸直手臂与双腿平行',
      '手掌并拢，收紧整个身体',
      '停留 5 次呼吸',
      '后翻轮式回到四柱',
    ],
  },
]

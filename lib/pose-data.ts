export type PoseSectionId = 'surya-a' | 'surya-b' | 'standing' | 'seated' | 'finishing'

export interface Pose {
  id: string
  name: string
  sanskrit: string
  aliases: string[]
  section: PoseSectionId
  order: number
  marker: string
  sourceFilename: string
  image: string
  thumbnail: string
  cueName?: string
  breath?: string
  drishti?: string
  drishtiSanskrit?: string
  assetStatus: 'generated' | 'needs-regeneration' | 'approved'
  instructionStatus: 'pending' | 'approved'
}

export interface PoseSection {
  id: PoseSectionId
  name: string
}

export const POSE_SECTIONS: PoseSection[] = [
  { id: 'surya-a', name: '拜日 A' },
  { id: 'surya-b', name: '拜日 B' },
  { id: 'standing', name: '站立体式' },
  { id: 'seated', name: '坐立体式' },
  { id: 'finishing', name: '结束体式' },
]

const NAMES: Record<string, { zh: string; sanskrit: string; aliases: string[] }> = {
  'SURYA NAMASKARA A': { zh: '拜日 A', sanskrit: 'Sūrya Namaskāra A', aliases: ["拜日式 A"] },
  'SURYA NAMASKARA B': { zh: '拜日 B', sanskrit: 'Sūrya Namaskāra B', aliases: ["拜日式 B"] },
  'PADANGUSTHASANA': { zh: '手抓大脚趾式', sanskrit: 'Padangusthasana', aliases: [] },
  'PADAHASTASANA': { zh: '手压脚掌式', sanskrit: 'Padahastasana', aliases: ["手在脚下式"] },
  'TRIKONASANA': { zh: '三角伸展式', sanskrit: 'Trikonasana', aliases: ["三角式"] },
  'PARSVAKONASANA': { zh: '侧角伸展式', sanskrit: 'Parsvakonasana', aliases: ["侧角式"] },
  'PRASARITA PADHOTTANASANA': { zh: '双角式', sanskrit: 'Prasarita Padottanasana', aliases: ["宽腿前屈式"] },
  'PARSVOTTANASANA': { zh: '加强侧伸展式', sanskrit: 'Parsvottanasana', aliases: ["侧伸展式"] },
  'UTTHITA HASTA PADANGUSTHASANA': { zh: '单腿手抓大脚趾式', sanskrit: 'Utthita Hasta Padangusthasana', aliases: ["单腿站立伸展式"] },
  'ARDHA BADDHA PADMOTTANASANA': { zh: '半莲花加强前屈式', sanskrit: 'Ardha Baddha Padmottanasana', aliases: ["半束莲花站立前屈式"] },
  'UTKATASANA': { zh: '幻椅式', sanskrit: 'Utkatasana', aliases: ["椅子式"] },
  'VIRABADRASANA': { zh: '战士式', sanskrit: 'Virabhadrasana', aliases: ["勇士式"] },
  'DANDASANA': { zh: '手杖式', sanskrit: 'Dandasana', aliases: ["坐山式"] },
  'PASCHIMOTTANASANA': { zh: '坐立前屈式', sanskrit: 'Paschimottanasana', aliases: ["背部伸展式"] },
  'PURVOTTANASANA': { zh: '反台式', sanskrit: 'Purvottanasana', aliases: ["东面伸展式"] },
  'ARDHA BADDHA PADMA PASCHIMOTTANASANA': { zh: '半束莲花坐立前屈式', sanskrit: 'Ardha Baddha Padma Paschimottanasana', aliases: [] },
  'TRIANG MUKHA EKA PADA PASCHIMOTTANASANA': { zh: '单腿折叠坐立前屈式', sanskrit: 'Trianga Mukhaikapada Paschimottanasana', aliases: [] },
  'JANU SIRSASANA': { zh: '单腿头碰膝式', sanskrit: 'Janu Sirsasana', aliases: ["头碰膝式"] },
  'MARICHYASANA': { zh: '圣哲马里奇式', sanskrit: 'Marichyasana', aliases: ["马里奇式"] },
  'NAVASANA': { zh: '船式', sanskrit: 'Navasana', aliases: [] },
  'BUJAPIDASANA': { zh: '肩压式', sanskrit: 'Bhujapidasana', aliases: ["双臂支撑式"] },
  'KURMASANA': { zh: '龟式', sanskrit: 'Kurmasana', aliases: [] },
  'SUPTA KURMASANA': { zh: '睡龟式', sanskrit: 'Supta Kurmasana', aliases: ["卧龟式"] },
  'GARBHA PINDASANA': { zh: '胎儿式', sanskrit: 'Garbha Pindasana', aliases: ["胎藏式"] },
  'KUKKUTASANA': { zh: '公鸡式', sanskrit: 'Kukkutasana', aliases: [] },
  'BADDHAKONASANA': { zh: '束角式', sanskrit: 'Baddha Konasana', aliases: [] },
  'UPAVISTHA KONASANA': { zh: '坐角式', sanskrit: 'Upavistha Konasana', aliases: [] },
  'SUPTA KONASANA': { zh: '仰卧角式', sanskrit: 'Supta Konasana', aliases: [] },
  'SUPTA PADANGUSTHASANA': { zh: '仰卧手抓大脚趾式', sanskrit: 'Supta Padangusthasana', aliases: [] },
  'UBHAYA PADANGUSTHASANA': { zh: '双手抓大脚趾式', sanskrit: 'Ubhaya Padangusthasana', aliases: [] },
  'URDVA MUKHA PASCHIMOTTANASANA': { zh: '向上坐立前屈式', sanskrit: 'Urdhva Mukha Paschimottanasana', aliases: [] },
  'SETU BANDHASANA': { zh: '桥式', sanskrit: 'Setu Bandhasana', aliases: ["桥锁式"] },
  'URDVA DANURASANA': { zh: '轮式', sanskrit: 'Urdhva Dhanurasana', aliases: ["上弓式"] },
  'SARVANGASANA': { zh: '肩倒立式', sanskrit: 'Sarvangasana', aliases: [] },
  'HALASANA': { zh: '犁式', sanskrit: 'Halasana', aliases: [] },
  'KARNAPIDASANA': { zh: '膝碰耳式', sanskrit: 'Karnapidasana', aliases: ["耳压膝式"] },
  'URDVA PADMASANA': { zh: '倒立莲花式', sanskrit: 'Urdhva Padmasana', aliases: ["向上莲花式"] },
  'PINDASANA': { zh: '胎儿收束式', sanskrit: 'Pindasana', aliases: ["团身式"] },
  'MATSYASANA': { zh: '鱼式', sanskrit: 'Matsyasana', aliases: [] },
  'UTTANA PADASANA': { zh: '伸展腿式', sanskrit: 'Uttana Padasana', aliases: ["上举腿式"] },
  'SIRSASANA': { zh: '头倒立式', sanskrit: 'Sirsasana', aliases: [] },
  'BADDHA PADMASANA': { zh: '束莲花式', sanskrit: 'Baddha Padmasana', aliases: [] },
  'YOGA MUDRA': { zh: '瑜伽身印', sanskrit: 'Yoga Mudra', aliases: ["瑜伽印式"] },
  'PADMASANA': { zh: '莲花式', sanskrit: 'Padmasana', aliases: [] },
  'UTPLUTHIH': { zh: '上提式', sanskrit: 'Utpluthih', aliases: ["上提莲花式"] },
  'SAVASANA': { zh: '休息术', sanskrit: 'Savasana', aliases: ["挺尸式","大休息"] },
}

const SURYA_STEPS: Record<string, { count: string; cueName: string; breath: string; drishti: string; drishtiSanskrit: string }> = {
  'surya-a/surya-a-01.png': { count: 'Samasthitiḥ', cueName: '山式（准备）', breath: '准备', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-a/surya-a-02.png': { count: 'Ekam', cueName: '双臂上举', breath: '吸气', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'surya-a/surya-a-03.png': { count: 'Dve', cueName: '站立前屈', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-a/surya-a-04.png': { count: 'Trīṇi', cueName: '半前屈', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-a/surya-a-05.png': { count: 'Catvāri', cueName: '四柱支撑', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-a/surya-a-06.png': { count: 'Pañca', cueName: '上犬式', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-a/surya-a-07.png': { count: 'Ṣaṭ', cueName: '下犬式', breath: '呼气，停留 5 次呼吸', drishti: '肚脐', drishtiSanskrit: 'nābhicakre' },
  'surya-a/surya-a-08.png': { count: 'Sapta', cueName: '半前屈', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-a/surya-a-09.png': { count: 'Aṣṭau', cueName: '站立前屈', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-a/surya-a-10.png': { count: 'Nava', cueName: '双臂上举', breath: '吸气', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'surya-a/surya-a-11.png': { count: 'Samasthitiḥ', cueName: '山式', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-b/surya-b-01.png': { count: 'Samasthitiḥ', cueName: '山式（准备）', breath: '准备', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-b/surya-b-02.png': { count: 'Ekam', cueName: '幻椅式', breath: '吸气', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'surya-b/surya-b-03.png': { count: 'Dve', cueName: '站立前屈', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-b/surya-b-04.png': { count: 'Trīṇi', cueName: '半前屈', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-b/surya-b-05.png': { count: 'Catvāri', cueName: '四柱支撑', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-b/surya-b-06.png': { count: 'Pañca', cueName: '上犬式', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-b/surya-b-07.png': { count: 'Ṣaṭ', cueName: '下犬式', breath: '呼气', drishti: '肚脐', drishtiSanskrit: 'nābhicakre' },
  'surya-b/surya-b-08.png': { count: 'Sapta', cueName: '战士一式（右侧）', breath: '吸气', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'surya-b/surya-b-09.png': { count: 'Aṣṭau', cueName: '四柱支撑', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-b/surya-b-10.png': { count: 'Nava', cueName: '上犬式', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-b/surya-b-11.png': { count: 'Daśa', cueName: '下犬式', breath: '呼气', drishti: '肚脐', drishtiSanskrit: 'nābhicakre' },
  'surya-b/surya-b-12.png': { count: 'Ekādaśa', cueName: '战士一式（左侧）', breath: '吸气', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'surya-b/surya-b-13.png': { count: 'Dvādaśa', cueName: '四柱支撑', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-b/surya-b-14.png': { count: 'Trayodaśa', cueName: '上犬式', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-b/surya-b-15.png': { count: 'Caturdaśa', cueName: '下犬式', breath: '呼气，停留 5 次呼吸', drishti: '肚脐', drishtiSanskrit: 'nābhicakre' },
  'surya-b/surya-b-16.png': { count: 'Pañcadaśa', cueName: '半前屈', breath: '吸气', drishti: '眉心', drishtiSanskrit: 'bhrūmadhye' },
  'surya-b/surya-b-17.png': { count: 'Ṣoḍaśa', cueName: '站立前屈', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'surya-b/surya-b-18.png': { count: 'Saptadaśa', cueName: '幻椅式', breath: '吸气', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'surya-b/surya-b-19.png': { count: 'Samasthitiḥ', cueName: '山式', breath: '呼气', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
}

const STANDING_DETAILS: Record<string, { sanskrit: string; cueName: string; breath: string; drishti: string; drishtiSanskrit: string }> = {
  'standing/padangusthasana.png': { sanskrit: 'Pādāṅguṣṭhāsana', cueName: '手抓大脚趾式', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/padahastasana.png': { sanskrit: 'Pāda Hastāsana', cueName: '手压脚掌式', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/trikonasana-01.png': { sanskrit: 'Utthita Trikoṇāsana', cueName: '三角伸展式', breath: '呼气进入，停留 5 次呼吸', drishti: '上方手指', drishtiSanskrit: 'hastāgre' },
  'standing/trikonasana-02.png': { sanskrit: 'Parivṛtta Trikoṇāsana', cueName: '扭转三角式', breath: '呼气进入，停留 5 次呼吸', drishti: '上方手指', drishtiSanskrit: 'hastāgre' },
  'standing/parsvakonasana-01.png': { sanskrit: 'Utthita Pārśvakoṇāsana', cueName: '侧角伸展式', breath: '呼气进入，停留 5 次呼吸', drishti: '上方手指', drishtiSanskrit: 'hastāgre' },
  'standing/parsvakonasana-02.png': { sanskrit: 'Parivṛtta Pārśvakoṇāsana', cueName: '扭转侧角式', breath: '呼气进入，停留 5 次呼吸', drishti: '上方手指', drishtiSanskrit: 'hastāgre' },
  'standing/prasarita-padottanasana-a.png': { sanskrit: 'Prasārita Pādottānāsana A', cueName: '双角式 A', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/prasarita-padottanasana-b.png': { sanskrit: 'Prasārita Pādottānāsana B', cueName: '双角式 B', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/prasarita-padottanasana-c.png': { sanskrit: 'Prasārita Pādottānāsana C', cueName: '双角式 C', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/prasarita-padottanasana-d.png': { sanskrit: 'Prasārita Pādottānāsana D', cueName: '双角式 D', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/parsvottanasana.png': { sanskrit: 'Pārśvottānāsana', cueName: '加强侧伸展式', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/utthita-hasta-padangusthasana-01.png': { sanskrit: 'Utthita Hasta Pādāṅguṣṭhāsana', cueName: '单腿手抓大脚趾式', breath: '呼气进入，停留 5 次呼吸', drishti: '抬起脚的大脚趾', drishtiSanskrit: 'pādāgra' },
  'standing/utthita-hasta-padangusthasana-02.png': { sanskrit: 'Utthita Pārśvasahita', cueName: '单腿侧伸展式', breath: '呼气向侧方展开，停留 5 次呼吸', drishti: '侧方', drishtiSanskrit: 'pārśva' },
  'standing/utthita-hasta-padangusthasana-03.png': { sanskrit: 'Utthita Hasta Pādāṅguṣṭhāsana B', cueName: '单腿前伸式', breath: '呼气松手，停留 5 次呼吸', drishti: '抬起脚的大脚趾', drishtiSanskrit: 'pādāgra' },
  'standing/ardha-baddha-padmottanasana.png': { sanskrit: 'Ardha Baddha Padmottānāsana', cueName: '半莲花加强前屈式', breath: '呼气进入，停留 5 次呼吸', drishti: '鼻尖', drishtiSanskrit: 'nāsāgre' },
  'standing/utkatasana.png': { sanskrit: 'Utkaṭāsana', cueName: '幻椅式', breath: '吸气进入，停留 5 次呼吸', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'standing/virabhadrasana-1.png': { sanskrit: 'Vīrabhadrāsana A', cueName: '战士一式', breath: '吸气进入，停留 5 次呼吸', drishti: '拇指', drishtiSanskrit: 'aṅguṣṭhamadhye' },
  'standing/virabhadrasana-2.png': { sanskrit: 'Vīrabhadrāsana B', cueName: '战士二式', breath: '呼气展开，停留 5 次呼吸', drishti: '前方手指', drishtiSanskrit: 'hastāgre' },
}

const RAW_POSES: Array<[string, string, PoseSectionId, number, string]> = [
  ['surya-a/surya-a-01.png', 'SURYA NAMASKARA A', 'surya-a', 1, '01'],
  ['surya-a/surya-a-02.png', 'SURYA NAMASKARA A', 'surya-a', 2, '02'],
  ['surya-a/surya-a-03.png', 'SURYA NAMASKARA A', 'surya-a', 3, '03'],
  ['surya-a/surya-a-04.png', 'SURYA NAMASKARA A', 'surya-a', 4, '04'],
  ['surya-a/surya-a-05.png', 'SURYA NAMASKARA A', 'surya-a', 5, '05'],
  ['surya-a/surya-a-06.png', 'SURYA NAMASKARA A', 'surya-a', 6, '06'],
  ['surya-a/surya-a-07.png', 'SURYA NAMASKARA A', 'surya-a', 7, '07'],
  ['surya-a/surya-a-08.png', 'SURYA NAMASKARA A', 'surya-a', 8, '08'],
  ['surya-a/surya-a-09.png', 'SURYA NAMASKARA A', 'surya-a', 9, '09'],
  ['surya-a/surya-a-10.png', 'SURYA NAMASKARA A', 'surya-a', 10, '10'],
  ['surya-a/surya-a-11.png', 'SURYA NAMASKARA A', 'surya-a', 11, '11'],
  ['surya-b/surya-b-01.png', 'SURYA NAMASKARA B', 'surya-b', 1, '01'],
  ['surya-b/surya-b-02.png', 'SURYA NAMASKARA B', 'surya-b', 2, '02'],
  ['surya-b/surya-b-03.png', 'SURYA NAMASKARA B', 'surya-b', 3, '03'],
  ['surya-b/surya-b-04.png', 'SURYA NAMASKARA B', 'surya-b', 4, '04'],
  ['surya-b/surya-b-05.png', 'SURYA NAMASKARA B', 'surya-b', 5, '05'],
  ['surya-b/surya-b-06.png', 'SURYA NAMASKARA B', 'surya-b', 6, '06'],
  ['surya-b/surya-b-07.png', 'SURYA NAMASKARA B', 'surya-b', 7, '07'],
  ['surya-b/surya-b-08.png', 'SURYA NAMASKARA B', 'surya-b', 8, '08'],
  ['surya-b/surya-b-09.png', 'SURYA NAMASKARA B', 'surya-b', 9, '09'],
  ['surya-b/surya-b-10.png', 'SURYA NAMASKARA B', 'surya-b', 10, '10'],
  ['surya-b/surya-b-11.png', 'SURYA NAMASKARA B', 'surya-b', 11, '11'],
  ['surya-b/surya-b-12.png', 'SURYA NAMASKARA B', 'surya-b', 12, '12'],
  ['surya-b/surya-b-13.png', 'SURYA NAMASKARA B', 'surya-b', 13, '13'],
  ['surya-b/surya-b-14.png', 'SURYA NAMASKARA B', 'surya-b', 14, '14'],
  ['surya-b/surya-b-15.png', 'SURYA NAMASKARA B', 'surya-b', 15, '15'],
  ['surya-b/surya-b-16.png', 'SURYA NAMASKARA B', 'surya-b', 16, '16'],
  ['surya-b/surya-b-17.png', 'SURYA NAMASKARA B', 'surya-b', 17, '17'],
  ['surya-b/surya-b-18.png', 'SURYA NAMASKARA B', 'surya-b', 18, '18'],
  ['surya-b/surya-b-19.png', 'SURYA NAMASKARA B', 'surya-b', 19, '19'],
  ['standing/padangusthasana.png', 'PADANGUSTHASANA', 'standing', 1, ''],
  ['standing/padahastasana.png', 'PADAHASTASANA', 'standing', 2, ''],
  ['standing/trikonasana-01.png', 'TRIKONASANA', 'standing', 3, '01'],
  ['standing/trikonasana-02.png', 'TRIKONASANA', 'standing', 4, '02'],
  ['standing/parsvakonasana-01.png', 'PARSVAKONASANA', 'standing', 5, '01'],
  ['standing/parsvakonasana-02.png', 'PARSVAKONASANA', 'standing', 6, '02'],
  ['standing/prasarita-padottanasana-a.png', 'PRASARITA PADHOTTANASANA', 'standing', 7, 'A'],
  ['standing/prasarita-padottanasana-b.png', 'PRASARITA PADHOTTANASANA', 'standing', 8, 'B'],
  ['standing/prasarita-padottanasana-c.png', 'PRASARITA PADHOTTANASANA', 'standing', 9, 'C'],
  ['standing/prasarita-padottanasana-d.png', 'PRASARITA PADHOTTANASANA', 'standing', 10, 'D'],
  ['standing/parsvottanasana.png', 'PARSVOTTANASANA', 'standing', 11, ''],
  ['standing/utthita-hasta-padangusthasana-01.png', 'UTTHITA HASTA PADANGUSTHASANA', 'standing', 12, '01'],
  ['standing/utthita-hasta-padangusthasana-02.png', 'UTTHITA HASTA PADANGUSTHASANA', 'standing', 13, '02'],
  ['standing/utthita-hasta-padangusthasana-03.png', 'UTTHITA HASTA PADANGUSTHASANA', 'standing', 14, '03'],
  ['standing/ardha-baddha-padmottanasana.png', 'ARDHA BADDHA PADMOTTANASANA', 'standing', 15, ''],
  ['standing/utkatasana.png', 'UTKATASANA', 'standing', 16, ''],
  ['standing/virabhadrasana-1.png', 'VIRABADRASANA', 'standing', 17, '1'],
  ['standing/virabhadrasana-2.png', 'VIRABADRASANA', 'standing', 18, '2'],
  ['seated/dandasana.png', 'DANDASANA', 'seated', 1, ''],
  ['seated/paschimottanasana-a.png', 'PASCHIMOTTANASANA', 'seated', 2, 'A'],
  ['seated/paschimottanasana-b.png', 'PASCHIMOTTANASANA', 'seated', 3, 'B'],
  ['seated/paschimottanasana-c.png', 'PASCHIMOTTANASANA', 'seated', 4, 'C'],
  ['seated/purvottanasana.png', 'PURVOTTANASANA', 'seated', 5, ''],
  ['seated/ardha-baddha-padma-paschimottanasana.png', 'ARDHA BADDHA PADMA PASCHIMOTTANASANA', 'seated', 6, ''],
  ['seated/triang-mukha-eka-pada-paschimottanasana.png', 'TRIANG MUKHA EKA PADA PASCHIMOTTANASANA', 'seated', 7, ''],
  ['seated/janu-sirsasana-a.png', 'JANU SIRSASANA', 'seated', 8, 'A'],
  ['seated/janu-sirsasana-b.png', 'JANU SIRSASANA', 'seated', 9, 'B'],
  ['seated/janu-sirsasana-c.png', 'JANU SIRSASANA', 'seated', 10, 'C'],
  ['seated/marichyasana-a.png', 'MARICHYASANA', 'seated', 11, 'A'],
  ['seated/marichyasana-b.png', 'MARICHYASANA', 'seated', 12, 'B'],
  ['seated/marichyasana-c.png', 'MARICHYASANA', 'seated', 13, 'C'],
  ['seated/marichyasana-d.png', 'MARICHYASANA', 'seated', 14, 'D'],
  ['seated/navasana.png', 'NAVASANA', 'seated', 15, ''],
  ['seated/bhujapidasana-01.png', 'BUJAPIDASANA', 'seated', 16, '01'],
  ['seated/bhujapidasana-02.png', 'BUJAPIDASANA', 'seated', 17, '02'],
  ['seated/kurmasana.png', 'KURMASANA', 'seated', 18, ''],
  ['seated/supta-kurmasana.png', 'SUPTA KURMASANA', 'seated', 19, ''],
  ['seated/garbha-pindasana.png', 'GARBHA PINDASANA', 'seated', 20, ''],
  ['seated/kukkutasana.png', 'KUKKUTASANA', 'seated', 21, ''],
  ['seated/baddha-konasana-a.png', 'BADDHAKONASANA', 'seated', 22, 'A'],
  ['seated/baddha-konasana-b.png', 'BADDHAKONASANA', 'seated', 23, 'B'],
  ['seated/baddha-konasana-c.png', 'BADDHAKONASANA', 'seated', 24, 'C'],
  ['seated/upavishta-konasana-01.png', 'UPAVISTHA KONASANA', 'seated', 25, '01'],
  ['seated/upavishta-konasana-02.png', 'UPAVISTHA KONASANA', 'seated', 26, '02'],
  ['seated/supta-konasana-01.png', 'SUPTA KONASANA', 'seated', 27, '01'],
  ['seated/supta-konasana-02.png', 'SUPTA KONASANA', 'seated', 28, '02'],
  ['seated/supta-padangusthasana-01.png', 'SUPTA PADANGUSTHASANA', 'seated', 29, '01'],
  ['seated/supta-padangusthasana-02.png', 'SUPTA PADANGUSTHASANA', 'seated', 30, '02'],
  ['seated/ubhaya-padangusthasana-01.png', 'UBHAYA PADANGUSTHASANA', 'seated', 31, '01'],
  ['seated/ubhaya-padangusthasana-02.png', 'UBHAYA PADANGUSTHASANA', 'seated', 32, '02'],
  ['seated/urdhva-mukha-paschimottanasana-01.png', 'URDVA MUKHA PASCHIMOTTANASANA', 'seated', 33, '01'],
  ['seated/urdhva-mukha-paschimottanasana-02.png', 'URDVA MUKHA PASCHIMOTTANASANA', 'seated', 34, '02'],
  ['seated/setu-bandhasana.png', 'SETU BANDHASANA', 'seated', 35, ''],
  ['finishing/urdhva-dhanurasana.png', 'URDVA DANURASANA', 'finishing', 1, ''],
  ['finishing/paschimottanasana.png', 'PASCHIMOTTANASANA', 'finishing', 2, ''],
  ['finishing/sarvangasana.png', 'SARVANGASANA', 'finishing', 3, ''],
  ['finishing/halasana.png', 'HALASANA', 'finishing', 4, ''],
  ['finishing/karnapidasana.png', 'KARNAPIDASANA', 'finishing', 5, ''],
  ['finishing/urdhva-padmasana.png', 'URDVA PADMASANA', 'finishing', 6, ''],
  ['finishing/pindasana.png', 'PINDASANA', 'finishing', 7, ''],
  ['finishing/matsyasana.png', 'MATSYASANA', 'finishing', 8, ''],
  ['finishing/uttana-padasana.png', 'UTTANA PADASANA', 'finishing', 9, ''],
  ['finishing/sirsasana.png', 'SIRSASANA', 'finishing', 10, ''],
  ['finishing/baddha-padmasana.png', 'BADDHA PADMASANA', 'finishing', 11, ''],
  ['finishing/yoga-mudra.png', 'YOGA MUDRA', 'finishing', 12, ''],
  ['finishing/padmasana.png', 'PADMASANA', 'finishing', 13, ''],
  ['finishing/utpluthih.png', 'UTPLUTHIH', 'finishing', 14, ''],
  ['finishing/savasana.png', 'SAVASANA', 'finishing', 15, ''],
]

export const POSES: Pose[] = RAW_POSES.map(([sourceFilename, sourceName, section, order, marker]) => {
  const names = NAMES[sourceName]
  const basename = sourceFilename.split('/').pop()?.replace(/\.png$/, '') ?? sourceFilename
  const suryaStep = SURYA_STEPS[sourceFilename]
  const standingDetails = STANDING_DETAILS[sourceFilename]
  const name = suryaStep?.count ?? standingDetails?.sanskrit ?? (marker ? `${names.zh} · ${marker}` : names.zh)
  const publicBase = `/poses/primary-series-ip-v1/${sourceFilename.replace(/\.png$/, '')}`

  return {
    id: `${section}-${basename}`,
    name,
    sanskrit: standingDetails?.sanskrit ?? (suryaStep ? names.sanskrit : (marker ? `${names.sanskrit} · ${marker}` : names.sanskrit)),
    aliases: suryaStep
      ? [...names.aliases, suryaStep.cueName]
      : standingDetails
        ? [...names.aliases, standingDetails.cueName]
        : names.aliases,
    section,
    order,
    marker,
    sourceFilename,
    image: `${publicBase}.webp`,
    thumbnail: `${publicBase}-thumb.webp`,
    cueName: suryaStep?.cueName ?? standingDetails?.cueName,
    breath: suryaStep?.breath ?? standingDetails?.breath,
    drishti: suryaStep?.drishti ?? standingDetails?.drishti,
    drishtiSanskrit: suryaStep?.drishtiSanskrit ?? standingDetails?.drishtiSanskrit,
    assetStatus: 'generated',
    instructionStatus: suryaStep ? 'approved' : 'pending',
  }
})

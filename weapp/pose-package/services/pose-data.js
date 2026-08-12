// 由 scripts/sync-weapp-pose-library.mjs 从网页版真源生成，请勿手工改动。
const POSE_SECTIONS = [
  {
    "id": "surya-a",
    "name": "拜日 A"
  },
  {
    "id": "surya-b",
    "name": "拜日 B"
  },
  {
    "id": "standing",
    "name": "站立体式"
  },
  {
    "id": "seated",
    "name": "坐立体式"
  },
  {
    "id": "finishing",
    "name": "结束体式"
  }
];

const POSES = [
  {
    "id": "surya-a-surya-a-01",
    "name": "Samasthitiḥ",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 1,
    "image": "../../images/surya-a/surya-a-01.png",
    "listName": "Samasthitiḥ",
    "cueName": "山式（准备）",
    "breath": "准备",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "山式站立，准备进入拜日式 A。",
    "vinyasaCount": 9
  },
  {
    "id": "surya-a-surya-a-02",
    "name": "Ekam",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 2,
    "image": "../../images/surya-a/surya-a-02.png",
    "listName": "Ekam",
    "cueName": "双臂上举",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "双手举过头合十，微微抬头。",
    "vinyasaCount": 9,
    "vinyasaStep": "1"
  },
  {
    "id": "surya-a-surya-a-03",
    "name": "Dve",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 3,
    "image": "../../images/surya-a/surya-a-03.png",
    "listName": "Dve",
    "cueName": "站立前屈",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "前弯，手放脚掌两边，鼻尖碰膝盖。",
    "vinyasaCount": 9,
    "vinyasaStep": "2"
  },
  {
    "id": "surya-a-surya-a-04",
    "name": "Trīṇi",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 4,
    "image": "../../images/surya-a/surya-a-04.png",
    "listName": "Trīṇi",
    "cueName": "半前屈",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "抬头。",
    "vinyasaCount": 9,
    "vinyasaStep": "3"
  },
  {
    "id": "surya-a-surya-a-05",
    "name": "Catvāri",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 5,
    "image": "../../images/surya-a/surya-a-05.png",
    "listName": "Catvāri",
    "cueName": "四柱支撑",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "跳或走到平板式，身体保持一直线。",
    "vinyasaCount": 9,
    "vinyasaStep": "4"
  },
  {
    "id": "surya-a-surya-a-06",
    "name": "Pañca",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 6,
    "image": "../../images/surya-a/surya-a-06.png",
    "listName": "Pañca",
    "cueName": "上犬式",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "胸口往前送，后弯进入上犬式。",
    "vinyasaCount": 9,
    "vinyasaStep": "5"
  },
  {
    "id": "surya-a-surya-a-07",
    "name": "Ṣaṭ",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 7,
    "image": "../../images/surya-a/surya-a-07.png",
    "listName": "Ṣaṭ",
    "cueName": "下犬式",
    "breath": "呼气",
    "drishti": "肚脐",
    "drishtiSanskrit": "nābhicakre",
    "action": "腰部上提，脚跟踩地，进入下犬式。",
    "vinyasaCount": 9,
    "vinyasaStep": "6",
    "holdBreaths": 5
  },
  {
    "id": "surya-a-surya-a-08",
    "name": "Sapta",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 8,
    "image": "../../images/surya-a/surya-a-08.png",
    "listName": "Sapta",
    "cueName": "半前屈",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "跳回两手之间，抬头。",
    "vinyasaCount": 9,
    "vinyasaStep": "7"
  },
  {
    "id": "surya-a-surya-a-09",
    "name": "Aṣṭau",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 9,
    "image": "../../images/surya-a/surya-a-09.png",
    "listName": "Aṣṭau",
    "cueName": "站立前屈",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "前弯，鼻尖碰膝盖。",
    "vinyasaCount": 9,
    "vinyasaStep": "8"
  },
  {
    "id": "surya-a-surya-a-10",
    "name": "Nava",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 10,
    "image": "../../images/surya-a/surya-a-10.png",
    "listName": "Nava",
    "cueName": "双臂上举",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "起身，双手举过头合十。",
    "vinyasaCount": 9,
    "vinyasaStep": "9"
  },
  {
    "id": "surya-a-surya-a-11",
    "name": "Samasthitiḥ",
    "sanskrit": "Sūrya Namaskāra A",
    "section": "surya-a",
    "order": 11,
    "image": "../../images/surya-a/surya-a-11.png",
    "listName": "Samasthitiḥ",
    "cueName": "山式",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "回到山式。",
    "vinyasaCount": 9
  },
  {
    "id": "surya-b-surya-b-01",
    "name": "Samasthitiḥ",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 1,
    "image": "../../images/surya-b/surya-b-01.png",
    "listName": "Samasthitiḥ",
    "cueName": "山式（准备）",
    "breath": "准备",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "山式站立，准备进入拜日式 B。",
    "vinyasaCount": 17
  },
  {
    "id": "surya-b-surya-b-02",
    "name": "Ekam",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 2,
    "image": "../../images/surya-b/surya-b-02.png",
    "listName": "Ekam",
    "cueName": "坐椅式",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "屈膝，手臂高举过头合十。",
    "vinyasaCount": 17,
    "vinyasaStep": "1"
  },
  {
    "id": "surya-b-surya-b-03",
    "name": "Dve",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 3,
    "image": "../../images/surya-b/surya-b-03.png",
    "listName": "Dve",
    "cueName": "站立前屈",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "腿打直前弯，鼻尖碰膝盖。",
    "vinyasaCount": 17,
    "vinyasaStep": "2"
  },
  {
    "id": "surya-b-surya-b-04",
    "name": "Trīṇi",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 4,
    "image": "../../images/surya-b/surya-b-04.png",
    "listName": "Trīṇi",
    "cueName": "半前屈",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "抬头。",
    "vinyasaCount": 17,
    "vinyasaStep": "3"
  },
  {
    "id": "surya-b-surya-b-05",
    "name": "Catvāri",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 5,
    "image": "../../images/surya-b/surya-b-05.png",
    "listName": "Catvāri",
    "cueName": "四柱支撑",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "进入平板式，身体保持一直线。",
    "vinyasaCount": 17,
    "vinyasaStep": "4"
  },
  {
    "id": "surya-b-surya-b-06",
    "name": "Pañca",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 6,
    "image": "../../images/surya-b/surya-b-06.png",
    "listName": "Pañca",
    "cueName": "上犬式",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "进入上犬式。",
    "vinyasaCount": 17,
    "vinyasaStep": "5"
  },
  {
    "id": "surya-b-surya-b-07",
    "name": "Ṣaṭ",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 7,
    "image": "../../images/surya-b/surya-b-07.png",
    "listName": "Ṣaṭ",
    "cueName": "下犬式",
    "breath": "呼气",
    "drishti": "肚脐",
    "drishtiSanskrit": "nābhicakre",
    "action": "进入下犬式。",
    "vinyasaCount": 17,
    "vinyasaStep": "6"
  },
  {
    "id": "surya-b-surya-b-08",
    "name": "Sapta",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 8,
    "image": "../../images/surya-b/surya-b-08.png",
    "listName": "Sapta",
    "cueName": "英雄式 A（右侧）",
    "breath": "吸气",
    "drishti": "指尖",
    "drishtiSanskrit": "hastāgre",
    "action": "右脚踩到两手之间，右膝蹲低，左腿打直，手臂高举。",
    "vinyasaCount": 17,
    "vinyasaStep": "7"
  },
  {
    "id": "surya-b-surya-b-09",
    "name": "Aṣṭau",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 9,
    "image": "../../images/surya-b/surya-b-09.png",
    "listName": "Aṣṭau",
    "cueName": "四柱支撑",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "回到平板式。",
    "vinyasaCount": 17,
    "vinyasaStep": "8"
  },
  {
    "id": "surya-b-surya-b-10",
    "name": "Nava",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 10,
    "image": "../../images/surya-b/surya-b-10.png",
    "listName": "Nava",
    "cueName": "上犬式",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "进入上犬式。",
    "vinyasaCount": 17,
    "vinyasaStep": "9"
  },
  {
    "id": "surya-b-surya-b-11",
    "name": "Daśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 11,
    "image": "../../images/surya-b/surya-b-11.png",
    "listName": "Daśa",
    "cueName": "下犬式",
    "breath": "呼气",
    "drishti": "肚脐",
    "drishtiSanskrit": "nābhicakre",
    "action": "进入下犬式。",
    "vinyasaCount": 17,
    "vinyasaStep": "10"
  },
  {
    "id": "surya-b-surya-b-12",
    "name": "Ekādaśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 12,
    "image": "../../images/surya-b/surya-b-12.png",
    "listName": "Ekādaśa",
    "cueName": "英雄式 A（左侧）",
    "breath": "吸气",
    "drishti": "指尖",
    "drishtiSanskrit": "hastāgre",
    "action": "左脚踩到两手之间，左膝蹲低，右腿打直，手臂高举。",
    "vinyasaCount": 17,
    "vinyasaStep": "11"
  },
  {
    "id": "surya-b-surya-b-13",
    "name": "Dvādaśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 13,
    "image": "../../images/surya-b/surya-b-13.png",
    "listName": "Dvādaśa",
    "cueName": "四柱支撑",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "回到平板式。",
    "vinyasaCount": 17,
    "vinyasaStep": "12"
  },
  {
    "id": "surya-b-surya-b-14",
    "name": "Trayodaśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 14,
    "image": "../../images/surya-b/surya-b-14.png",
    "listName": "Trayodaśa",
    "cueName": "上犬式",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "进入上犬式。",
    "vinyasaCount": 17,
    "vinyasaStep": "13"
  },
  {
    "id": "surya-b-surya-b-15",
    "name": "Caturdaśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 15,
    "image": "../../images/surya-b/surya-b-15.png",
    "listName": "Caturdaśa",
    "cueName": "下犬式",
    "breath": "呼气",
    "drishti": "肚脐",
    "drishtiSanskrit": "nābhicakre",
    "action": "进入下犬式。",
    "vinyasaCount": 17,
    "vinyasaStep": "14",
    "holdBreaths": 5
  },
  {
    "id": "surya-b-surya-b-16",
    "name": "Pañcadaśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 16,
    "image": "../../images/surya-b/surya-b-16.png",
    "listName": "Pañcadaśa",
    "cueName": "半前屈",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "跳回两手之间，抬头。",
    "vinyasaCount": 17,
    "vinyasaStep": "15"
  },
  {
    "id": "surya-b-surya-b-17",
    "name": "Ṣoḍaśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 17,
    "image": "../../images/surya-b/surya-b-17.png",
    "listName": "Ṣoḍaśa",
    "cueName": "站立前屈",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "前弯，鼻尖碰膝盖。",
    "vinyasaCount": 17,
    "vinyasaStep": "16"
  },
  {
    "id": "surya-b-surya-b-18",
    "name": "Saptadaśa",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 18,
    "image": "../../images/surya-b/surya-b-18.png",
    "listName": "Saptadaśa",
    "cueName": "坐椅式",
    "breath": "吸气",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "action": "屈膝起身，手臂高举过头合十。",
    "vinyasaCount": 17,
    "vinyasaStep": "17"
  },
  {
    "id": "surya-b-surya-b-19",
    "name": "Samasthitiḥ",
    "sanskrit": "Sūrya Namaskāra B",
    "section": "surya-b",
    "order": 19,
    "image": "../../images/surya-b/surya-b-19.png",
    "listName": "Samasthitiḥ",
    "cueName": "山式",
    "breath": "呼气",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "action": "回到山式。",
    "vinyasaCount": 17
  },
  {
    "id": "standing-padangusthasana",
    "name": "Pādāṅguṣṭhāsana",
    "sanskrit": "Pādāṅguṣṭhāsana",
    "section": "standing",
    "order": 1,
    "image": "../../images/standing/padangusthasana.png",
    "listName": "手抓脚趾前弯式",
    "cueName": "手抓脚趾前弯式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 3,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "两脚跳开半呎（约 15 cm），手勾脚大拇趾，抬头挺胸。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "前弯，头靠近两膝之间，腿打直。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "抬头，手指继续勾脚大拇指。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-padahastasana",
    "name": "Pāda Hastāsana",
    "sanskrit": "Pāda Hastāsana",
    "section": "standing",
    "order": 2,
    "image": "../../images/standing/padahastasana.png",
    "listName": "脚踩手掌前弯式",
    "cueName": "脚踩手掌前弯式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 3,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "两脚跳开半呎（约 15 cm）；呼气把两只手掌踩在脚掌下；再吸气抬头挺胸。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "头靠近两膝之间，膝盖打直。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "抬头。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-trikonasana-01",
    "name": "Utthita Trikoṇāsana",
    "sanskrit": "Utthita Trikoṇāsana",
    "section": "standing",
    "order": 3,
    "image": "../../images/standing/trikonasana-01.png",
    "listName": "三角式",
    "cueName": "三角式",
    "drishti": "手指",
    "drishtiSanskrit": "hastāgre",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右边，脚跳开三呎，手臂往两侧张开与胸同高。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "右脚往右转，右手抓住右脚大拇趾，左手往上举高，眼睛看指尖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "左脚往左转，左手抓住左脚大拇趾，右手往上举高，眼睛看指尖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-trikonasana-02",
    "name": "Parivṛtta Trikoṇāsana",
    "sanskrit": "Parivṛtta Trikoṇāsana",
    "section": "standing",
    "order": 4,
    "image": "../../images/standing/trikonasana-02.png",
    "listName": "反三角式",
    "cueName": "反三角式",
    "drishti": "手指",
    "drishtiSanskrit": "hastāgre",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右边，脚跳开三呎，手臂往两侧张开。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "右脚往右转，左手放右脚外侧地上，右手往上举高，扭转，眼睛看指尖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "换左边，扭转停留，眼睛看指尖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-parsvakonasana-01",
    "name": "Utthita Pārśvakoṇāsana",
    "sanskrit": "Utthita Pārśvakoṇāsana",
    "section": "standing",
    "order": 5,
    "image": "../../images/standing/parsvakonasana-01.png",
    "listName": "侧角式",
    "cueName": "侧角式",
    "drishti": "手指",
    "drishtiSanskrit": "hastāgre",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右边，脚跳开五呎，手臂往两侧伸直与胸同高。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "右脚往右转，右膝蹲低，右手放右脚外侧，左臂在耳边伸直。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "换左边，动作同右边。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-parsvakonasana-02",
    "name": "Parivṛtta Pārśvakoṇāsana",
    "sanskrit": "Parivṛtta Pārśvakoṇāsana",
    "section": "standing",
    "order": 6,
    "image": "../../images/standing/parsvakonasana-02.png",
    "listName": "反侧角式",
    "cueName": "反侧角式",
    "drishti": "手指",
    "drishtiSanskrit": "hastāgre",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右边，脚跳开五呎，手臂往两侧伸直。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "右脚往右转，右膝蹲低，左手臂绕过右膝外侧，双手合十或右臂在耳边伸直，身体扭转。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "换左边，扭转停留。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-prasarita-padottanasana-a",
    "name": "Prasārita Pādottānāsana A",
    "sanskrit": "Prasārita Pādottānāsana A",
    "section": "standing",
    "order": 7,
    "image": "../../images/standing/prasarita-padottanasana-a.png",
    "listName": "开腿前弯式 A",
    "cueName": "开腿前弯式 A",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右侧，脚跳开五呎，手叉腰。"
      },
      {
        "count": "2",
        "breath": "呼气后吸气",
        "action": "前弯，双手放地板上；接着抬头挺胸。"
      },
      {
        "count": "3",
        "breath": "呼气",
        "action": "前弯，头顶放地板。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "4",
        "breath": "吸气",
        "action": "抬头，手推地起身。"
      },
      {
        "count": "5",
        "breath": "呼气",
        "action": "回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-prasarita-padottanasana-b",
    "name": "Prasārita Pādottānāsana B",
    "sanskrit": "Prasārita Pādottānāsana B",
    "section": "standing",
    "order": 8,
    "image": "../../images/standing/prasarita-padottanasana-b.png",
    "listName": "开腿前弯式 B",
    "cueName": "开腿前弯式 B",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右侧，脚跳开五呎，两手臂往身体两侧伸直，与胸同高。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "手叉腰。"
      },
      {
        "count": "3",
        "breath": "吸气后呼气",
        "action": "抬头挺胸；接着前弯，头顶放地板。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "4",
        "breath": "吸气",
        "action": "抬头起身。"
      },
      {
        "count": "5",
        "breath": "呼气",
        "action": "一个吸吐后回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-prasarita-padottanasana-c",
    "name": "Prasārita Pādottānāsana C",
    "sanskrit": "Prasārita Pādottānāsana C",
    "section": "standing",
    "order": 9,
    "image": "../../images/standing/prasarita-padottanasana-c.png",
    "listName": "开腿前弯式 C",
    "cueName": "开腿前弯式 C",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右侧，脚跳开五呎，手叉腰。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "背后十指交扣，挺胸站好。"
      },
      {
        "count": "3",
        "breath": "吸气后呼气",
        "action": "抬头挺胸；接着前弯，头顶放地板。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "4",
        "breath": "吸气",
        "action": "抬头，手推地起身。"
      },
      {
        "count": "5",
        "breath": "呼气",
        "action": "一个吸吐后解开手叉腰，回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-prasarita-padottanasana-d",
    "name": "Prasārita Pādottānāsana D",
    "sanskrit": "Prasārita Pādottānāsana D",
    "section": "standing",
    "order": 10,
    "image": "../../images/standing/prasarita-padottanasana-d.png",
    "listName": "开腿前弯式 D",
    "cueName": "开腿前弯式 D",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右侧，脚跳开五呎，手叉腰。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "前弯，两手勾住大脚趾，微微抬头，手臂和背部打直。"
      },
      {
        "count": "3",
        "breath": "吸气后呼气",
        "action": "抬头挺胸；接着把头顶放两脚之间的地板。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "4",
        "breath": "吸气",
        "action": "抬头，手推地起身。"
      },
      {
        "count": "5",
        "breath": "呼气",
        "action": "手解开叉腰，回到第 1 动位置。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-parsvottanasana",
    "name": "Pārśvottānāsana",
    "sanskrit": "Pārśvottānāsana",
    "section": "standing",
    "order": 11,
    "image": "../../images/standing/parsvottanasana.png",
    "listName": "侧身延展前弯式",
    "cueName": "侧身延展前弯式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 5,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "面向右边，脚跳开三呎，双手在背后合十，胸口挺直。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "前弯，鼻子碰右膝，膝盖打直。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "抬头起身，转向左边。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "前弯，鼻子碰左膝。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "回到第 1 动。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-utthita-hasta-padangusthasana-01",
    "name": "Utthita Hasta Pādāṅguṣṭhāsana (1)",
    "sanskrit": "Utthita Hasta Pādāṅguṣṭhāsana (1)",
    "section": "standing",
    "order": 12,
    "image": "../../images/standing/utthita-hasta-padangusthasana-01.png",
    "listName": "手抓脚趾延展式 (1)",
    "cueName": "手抓脚趾延展式 (1)",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādāgra",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "左手叉腰，右手往前伸直，提右腿，右手勾右脚大拇指，膝盖打直，挺胸提腰。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "上半身前倾，鼻子碰右膝。",
        "drishti": "脚趾",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "抬头挺胸，回到第 1 动位置。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "右腿往右边打开，臂腿腰胸都打直，眼看左边。",
        "drishti": "侧边"
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "右腿拉回正面，回到第 1 动位置。"
      },
      {
        "count": "6",
        "breath": "呼气",
        "action": "继续把腿抬高，身体前倾，鼻子碰右膝。"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "抬头挺胸腰直，两手叉腰，右腿继续提高打直。",
        "drishti": "脚趾"
      },
      {
        "count": "8",
        "breath": "呼气后吸气",
        "action": "放下右腿；接着提左腿，左手勾左脚大拇指。"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "上半身前倾，鼻子碰左膝。",
        "drishti": "脚趾",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "抬头挺胸，回到第 8 动位置。"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "左腿往左边打开，臂腿腰胸都打直，眼看右边。",
        "drishti": "侧边"
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "左腿拉回正面，回到第 8 动位置。"
      },
      {
        "count": "13",
        "breath": "呼气",
        "action": "继续把腿抬高，身体前倾，鼻子碰左膝。"
      },
      {
        "count": "14",
        "breath": "吸气",
        "action": "抬头挺胸腰直，两手叉腰，左腿继续提高打直。",
        "drishti": "脚趾"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "放下左腿，回到山式。"
      }
    ]
  },
  {
    "id": "standing-utthita-hasta-padangusthasana-02",
    "name": "Utthita Pārśvasahita (2)",
    "sanskrit": "Utthita Pārśvasahita (2)",
    "section": "standing",
    "order": 13,
    "image": "../../images/standing/utthita-hasta-padangusthasana-02.png",
    "listName": "手抓脚趾延展式 (2)",
    "cueName": "手抓脚趾延展式 (2)",
    "drishti": "侧边",
    "drishtiSanskrit": "pārśva",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "左手叉腰，右手往前伸直，提右腿，右手勾右脚大拇指，膝盖打直，挺胸提腰。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "上半身前倾，鼻子碰右膝。",
        "drishti": "脚趾"
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "抬头挺胸，回到第 1 动位置。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "右腿往右边打开，臂腿腰胸都打直，眼看左边。",
        "drishti": "侧边",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "右腿拉回正面，回到第 1 动位置。"
      },
      {
        "count": "6",
        "breath": "呼气",
        "action": "继续把腿抬高，身体前倾，鼻子碰右膝。"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "抬头挺胸腰直，两手叉腰，右腿继续提高打直。",
        "drishti": "脚趾"
      },
      {
        "count": "8",
        "breath": "呼气后吸气",
        "action": "放下右腿；接着提左腿，左手勾左脚大拇指。"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "上半身前倾，鼻子碰左膝。",
        "drishti": "脚趾"
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "抬头挺胸，回到第 8 动位置。"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "左腿往左边打开，臂腿腰胸都打直，眼看右边。",
        "drishti": "侧边",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "左腿拉回正面，回到第 8 动位置。"
      },
      {
        "count": "13",
        "breath": "呼气",
        "action": "继续把腿抬高，身体前倾，鼻子碰左膝。"
      },
      {
        "count": "14",
        "breath": "吸气",
        "action": "抬头挺胸腰直，两手叉腰，左腿继续提高打直。",
        "drishti": "脚趾"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "放下左腿，回到山式。"
      }
    ]
  },
  {
    "id": "standing-utthita-hasta-padangusthasana-03",
    "name": "Utthita Hasta Pādāṅguṣṭhāsana (3)",
    "sanskrit": "Utthita Hasta Pādāṅguṣṭhāsana (3)",
    "section": "standing",
    "order": 14,
    "image": "../../images/standing/utthita-hasta-padangusthasana-03.png",
    "listName": "手抓脚趾延展式 (3)",
    "cueName": "手抓脚趾延展式 (3)",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādāgra",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "左手叉腰，右手往前伸直，提右腿，右手勾右脚大拇指，膝盖打直，挺胸提腰。"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "上半身前倾，鼻子碰右膝。",
        "drishti": "脚趾"
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "抬头挺胸，回到第 1 动位置。"
      },
      {
        "count": "4",
        "breath": "呼气",
        "action": "右腿往右边打开，臂腿腰胸都打直，眼看左边。",
        "drishti": "侧边"
      },
      {
        "count": "5",
        "breath": "吸气",
        "action": "右腿拉回正面，回到第 1 动位置。"
      },
      {
        "count": "6",
        "breath": "呼气",
        "action": "继续把腿抬高，身体前倾，鼻子碰右膝。"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "抬头挺胸腰直，两手叉腰，右腿继续提高打直。",
        "drishti": "脚趾",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "呼气后吸气",
        "action": "放下右腿；接着提左腿，左手勾左脚大拇指。"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "上半身前倾，鼻子碰左膝。",
        "drishti": "脚趾"
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "抬头挺胸，回到第 8 动位置。"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "左腿往左边打开，臂腿腰胸都打直，眼看右边。",
        "drishti": "侧边"
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "左腿拉回正面，回到第 8 动位置。"
      },
      {
        "count": "13",
        "breath": "呼气",
        "action": "继续把腿抬高，身体前倾，鼻子碰左膝。"
      },
      {
        "count": "14",
        "breath": "吸气",
        "action": "抬头挺胸腰直，两手叉腰，左腿继续提高打直。",
        "drishti": "脚趾",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "放下左腿，回到山式。"
      }
    ]
  },
  {
    "id": "standing-ardha-baddha-padmottanasana",
    "name": "Ardha Baddha Padmottānāsana",
    "sanskrit": "Ardha Baddha Padmottānāsana",
    "section": "standing",
    "order": 15,
    "image": "../../images/standing/ardha-baddha-padmottanasana.png",
    "listName": "半莲花抓脚前弯式",
    "cueName": "半莲花抓脚前弯式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 9,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "右脚盘左大腿上，右手绕背后抓右脚大拇指，左手叉腰。",
        "isAsana": true
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "前弯，左手放左脚旁，鼻子碰膝盖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "3",
        "breath": "吸气",
        "action": "抬头。"
      },
      {
        "count": "4",
        "breath": "呼气后吸气",
        "action": "身体站直；接着左手叉腰。"
      },
      {
        "count": "5",
        "breath": "呼气",
        "action": "放开右脚，右腿打直。"
      },
      {
        "count": "6",
        "breath": "吸气",
        "action": "左脚盘右大腿上，左手绕背后抓左脚大拇指，右手叉腰。",
        "isAsana": true
      },
      {
        "count": "7",
        "breath": "呼气",
        "action": "前弯，右手放右脚旁，鼻子碰膝盖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "抬头。"
      },
      {
        "count": "9",
        "breath": "呼气后吸气",
        "action": "右手叉腰；接着身体站直。"
      },
      {
        "count": "—",
        "breath": "呼气",
        "action": "回到山式。"
      }
    ]
  },
  {
    "id": "standing-utkatasana",
    "name": "Utkaṭāsana",
    "sanskrit": "Utkaṭāsana",
    "section": "standing",
    "order": 16,
    "image": "../../images/standing/utkatasana.png",
    "listName": "坐椅式",
    "cueName": "坐椅式",
    "drishti": "拇指",
    "drishtiSanskrit": "aṅguṣṭhamadhye",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1–6",
        "breath": "—",
        "action": "完成拜日式 A 前 6 个动作。"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳到双手中间，屈膝，手臂高举。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "呼气后吸气",
        "action": "手贴地；接着把重心放手上，下半身提起。"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "往后抛到平板式（四柱支撑）。"
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式。"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "腰上提，脚跟踩地成下犬式。"
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "跳回两手之间，抬头挺胸。"
      },
      {
        "count": "13",
        "breath": "呼气",
        "action": "前弯，鼻尖碰膝盖，再回山式。"
      }
    ]
  },
  {
    "id": "standing-virabhadrasana-1",
    "name": "Vīrabhadrāsana A",
    "sanskrit": "Vīrabhadrāsana A",
    "section": "standing",
    "order": 17,
    "image": "../../images/standing/virabhadrasana-1.png",
    "listName": "英雄式 A",
    "cueName": "英雄式 A",
    "drishti": "手指",
    "drishtiSanskrit": "hastāgre",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1–6",
        "breath": "—",
        "action": "完成拜日式 A 前 6 个动作。"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "右脚往前，右膝蹲低，双臂高举过头合十，掌心并拢，抬头挺胸。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "转向左边，左膝蹲低，双臂继续高举过头，掌心并拢，抬头挺胸。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "腿不变，双臂展开与肩同高，看左手指尖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10",
        "breath": "呼气",
        "action": "转向右边，右膝蹲低，看右手指尖。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "11",
        "breath": "吸气",
        "action": "双手放右脚两侧，腿提离地板。"
      },
      {
        "count": "12",
        "breath": "呼气",
        "action": "跳到平板式（四柱支撑）。"
      },
      {
        "count": "13",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式。"
      },
      {
        "count": "14",
        "breath": "呼气",
        "action": "腰上提，脚跟踩地成下犬式。"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "跳回两手之间，抬头挺胸。"
      },
      {
        "count": "16",
        "breath": "呼气",
        "action": "前弯，鼻尖碰膝盖，回到山式。"
      }
    ]
  },
  {
    "id": "standing-virabhadrasana-2",
    "name": "Vīrabhadrāsana B",
    "sanskrit": "Vīrabhadrāsana B",
    "section": "standing",
    "order": 18,
    "image": "../../images/standing/virabhadrasana-2.png",
    "listName": "英雄式 B",
    "cueName": "英雄式 B",
    "drishti": "拇指",
    "drishtiSanskrit": "aṅguṣṭhamadhye",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1–6",
        "breath": "—",
        "action": "完成拜日式 A 前 6 个动作。"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "右脚往前，右膝蹲低成弓步，双臂平举与肩同高、掌心朝下，眼看右拇指。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "双手放右脚两侧，跳到平板式（四柱支撑）。"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式。"
      },
      {
        "count": "10",
        "breath": "呼气",
        "action": "腰上提，脚跟踩地成下犬式。"
      },
      {
        "count": "11",
        "breath": "吸气",
        "action": "左脚往前，左膝蹲低成弓步，双臂平举与肩同高、掌心朝下，眼看左拇指。",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "12",
        "breath": "呼气",
        "action": "双手放左脚两侧，跳到平板式（四柱支撑）。"
      },
      {
        "count": "13",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式。"
      },
      {
        "count": "14",
        "breath": "呼气",
        "action": "腰上提，脚跟踩地成下犬式。"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "跳回两手之间，抬头挺胸。"
      },
      {
        "count": "16",
        "breath": "呼气",
        "action": "前弯，鼻尖碰膝盖，回到山式。"
      }
    ]
  },
  {
    "id": "seated-dandasana",
    "name": "Dandasana",
    "sanskrit": "Dandasana",
    "section": "seated",
    "order": 1,
    "image": "../../images/seated/dandasana.png",
    "listName": "山式坐立",
    "cueName": "山式坐立",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳到正中间，腿打直，手放臀部两边地板（看鼻尖）",
        "holdBreaths": 5,
        "isAsana": true
      },
      {
        "count": "8-14",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-paschimottanasana-a",
    "name": "Paschimattanasana (1)",
    "sanskrit": "Paschimattanasana (1)",
    "section": "seated",
    "order": 2,
    "image": "../../images/seated/paschimottanasana-a.png",
    "listName": "西方延展式(1)",
    "cueName": "西方延展式(1)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿双手间，腿打直坐正，手按臀部两边地板"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "抓住脚掌上端"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "前弯，鼻子碰膝盖，手勾脚大拇趾（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10-16",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-paschimottanasana-b",
    "name": "Paschimattanasana (2)",
    "sanskrit": "Paschimattanasana (2)",
    "section": "seated",
    "order": 3,
    "image": "../../images/seated/paschimottanasana-b.png",
    "listName": "西方延展式(2)",
    "cueName": "西方延展式(2)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿双手间，腿打直坐正，两手按臀部两边地板，挺胸腰，微微低头，紧收肛"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "抓住两脚掌外侧"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "前弯，鼻子碰膝盖（双手抓两脚掌外侧）（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10-16",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-paschimottanasana-c",
    "name": "Paschimattanasana (3)",
    "sanskrit": "Paschimattanasana (3)",
    "section": "seated",
    "order": 4,
    "image": "../../images/seated/paschimottanasana-c.png",
    "listName": "西方延展式(3)",
    "cueName": "西方延展式(3)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿双手间，腿打直坐正，两手按臀部两边地板，挺胸腰，微微低头，紧收肛"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "抓住脚掌上端"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "前弯，下巴碰膝盖（双手绕过两脚掌，一手抓住另一边手腕）（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10-16",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-purvottanasana",
    "name": "Purvatanasana",
    "sanskrit": "Purvatanasana",
    "section": "seated",
    "order": 5,
    "image": "../../images/seated/purvottanasana.png",
    "listName": "东方延展式",
    "cueName": "东方延展式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-7",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "双手放臀部后方约30公分地上；接著吸气把腿和身体抬离地板，头往后仰，脚掌踩稳（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "回到第7动位置坐好"
      },
      {
        "count": "10-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-ardha-baddha-padma-paschimottanasana",
    "name": "Ardha Baddha Padma Paschimattanasana",
    "sanskrit": "Ardha Baddha Padma Paschimattanasana",
    "section": "seated",
    "order": 6,
    "image": "../../images/seated/ardha-baddha-padma-paschimottanasana.png",
    "listName": "半莲花抓脚西方延展式",
    "cueName": "半莲花抓脚西方延展式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 22,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，左腿打直，右脚盘左大腿，右手绕背后抓右脚大拇指，左手抓左脚掌"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "前弯，下巴放左腿上（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "抬头"
      },
      {
        "count": "10",
        "breath": "呼气",
        "action": "解开，双腿交叉，手臂撑起身体"
      },
      {
        "count": "11-13",
        "breath": "—",
        "action": "继续串联"
      },
      {
        "count": "14",
        "breath": "吸气",
        "action": "跳穿，换边（右腿打直，左脚盘右大腿）"
      },
      {
        "count": "15",
        "breath": "呼气",
        "action": "前弯，下巴放右膝上（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "16-22",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-triang-mukha-eka-pada-paschimottanasana",
    "name": "Triyang Mukha Eka Pada Paschimattanasana",
    "sanskrit": "Triyang Mukha Eka Pada Paschimattanasana",
    "section": "seated",
    "order": 7,
    "image": "../../images/seated/triang-mukha-eka-pada-paschimottanasana.png",
    "listName": "单跪腿西方延展式",
    "cueName": "单跪腿西方延展式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 22,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，左腿打直，右小腿往后折，右脚掌放在右大腿外侧，膝盖靠拢",
        "isAsana": true
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "前弯，额头放在打直的左腿上（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "抬头"
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "继续串联"
      },
      {
        "count": "15",
        "breath": "呼气",
        "action": "换边（右腿打直，左小腿往后折，左脚掌放左大腿外侧），前弯，额头放右腿上（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "16-22",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-janu-sirsasana-a",
    "name": "Janu Shirshasana A",
    "sanskrit": "Janu Shirshasana A",
    "section": "seated",
    "order": 8,
    "image": "../../images/seated/janu-sirsasana-a.png",
    "listName": "头碰膝盖式A",
    "cueName": "头碰膝盖式A",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 22,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "坐姿，左腿打直，右脚跟抵肛门与生殖器之间（会阴）",
        "isAsana": true
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "前弯，双手抓左脚掌，头碰左膝（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "抬头"
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "中间串联"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "换边（右腿打直，左脚跟抵会阴）（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "16-22",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-janu-sirsasana-b",
    "name": "Janu Shirshasana B",
    "sanskrit": "Janu Shirshasana B",
    "section": "seated",
    "order": 9,
    "image": "../../images/seated/janu-sirsasana-b.png",
    "listName": "头碰膝盖式B",
    "cueName": "头碰膝盖式B",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 22,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "坐姿，左腿打直，右膝弯曲外开 85°，右脚跟抵会阴，肛门坐在右脚跟上",
        "isAsana": true
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "前弯，双手抓左脚掌，头碰左膝（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "抬头"
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "中间串联"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "换边（右腿打直，肛门坐在左脚跟上）（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "16-22",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-janu-sirsasana-c",
    "name": "Janu Shirshasana C",
    "sanskrit": "Janu Shirshasana C",
    "section": "seated",
    "order": 10,
    "image": "../../images/seated/janu-sirsasana-c.png",
    "listName": "头碰膝盖式C",
    "cueName": "头碰膝盖式C",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 22,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "坐姿，左腿打直，右脚跟往上抵肚脐、脚趾踩地、右膝外开 45°",
        "isAsana": true
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "前弯，双手抓左脚掌，头碰左膝（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "抬头"
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "中间串联"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "换边（右腿打直，左脚跟抵肚脐、左膝外开 45°）（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "16-22",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-marichyasana-a",
    "name": "Marichyasana A",
    "sanskrit": "Marichyasana A",
    "section": "seated",
    "order": 11,
    "image": "../../images/seated/marichyasana-a.png",
    "listName": "圣者马里奇式A",
    "cueName": "圣者马里奇式A",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 22,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "坐姿，左腿打直，右脚掌踩地靠近右臀"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "右手臂由内往外包右膝，左手绕到背后抓右手腕（捆绑），前弯，下巴碰左膝（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-14",
        "breath": "—",
        "action": "中间串联"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "换边（左手臂包左膝，右手绕背抓左手腕）；接著呼气捆绑前弯，下巴碰左膝（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "16-22",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-marichyasana-b",
    "name": "Marichyasana B",
    "sanskrit": "Marichyasana B",
    "section": "seated",
    "order": 12,
    "image": "../../images/seated/marichyasana-b.png",
    "listName": "圣者马里奇式B",
    "cueName": "圣者马里奇式B",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 22,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "坐姿：右脚盘半莲花（脚背贴左大腿），左脚掌踩地靠近左臀，膝盖外开（半莲花 + 马里奇 A 屈膝组合）",
        "isAsana": true
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "右手臂由内往外包右膝（半莲花侧），左手绕到背后抓右手腕，前弯，下巴碰地/腿（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-14",
        "breath": "—",
        "action": "中间串联"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "换边（左半莲花 + 右屈膝）；接著呼气捆绑前弯（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "16-22",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-marichyasana-c",
    "name": "Marichyasana C",
    "sanskrit": "Marichyasana C",
    "section": "seated",
    "order": 13,
    "image": "../../images/seated/marichyasana-c.png",
    "listName": "圣者马里奇式C",
    "cueName": "圣者马里奇式C",
    "drishti": "侧边",
    "drishtiSanskrit": "pārśva",
    "vinyasaCount": 18,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "坐姿，左腿打直，右脚踩地靠近右臀；身体向右扭转，左手臂包住右膝，右手绕背后抓左手腕（看侧边）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8-11",
        "breath": "—",
        "action": "中间串联"
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "换边扭转（看侧边）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "13-18",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-marichyasana-d",
    "name": "Marichyasana D",
    "sanskrit": "Marichyasana D",
    "section": "seated",
    "order": 14,
    "image": "../../images/seated/marichyasana-d.png",
    "listName": "圣者马里奇式D",
    "cueName": "圣者马里奇式D",
    "drishti": "侧边",
    "drishtiSanskrit": "pārśva",
    "vinyasaCount": 18,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "右脚盘半莲花（脚背贴左大腿），左脚踩地；身体向右扭转，左手臂包住左膝（屈膝侧），右手绕背后抓左手腕（看侧边）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8-11",
        "breath": "—",
        "action": "中间串联"
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "换边扭转（看侧边）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "13-18",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-navasana",
    "name": "Navasana",
    "sanskrit": "Navasana",
    "section": "seated",
    "order": 15,
    "image": "../../images/seated/navasana.png",
    "listName": "船式",
    "cueName": "船式",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿，坐姿，腿打直抬高与视线平，身体后倾，手向前伸直（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "交叉脚"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "双手撑地提臀，落回船式停留",
        "holdBreaths": 5,
        "isAsana": true
      },
      {
        "count": "—",
        "breath": "-",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-bhujapidasana-02",
    "name": "Bhujapidasana",
    "sanskrit": "Bhujapidasana",
    "section": "seated",
    "order": 16,
    "image": "../../images/seated/bhujapidasana-02.png",
    "listName": "夹上臂式",
    "cueName": "夹上臂式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿，双腿上臂夹在大臂，身体前倾，脚离地"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "保持平衡，下巴往前贴地（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-kurmasana",
    "name": "Kurmasana",
    "sanskrit": "Kurmasana",
    "section": "seated",
    "order": 17,
    "image": "../../images/seated/kurmasana.png",
    "listName": "龟式",
    "cueName": "龟式",
    "drishti": "V7 | 凝视点：鼻尖",
    "drishtiSanskrit": "",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿，双腿夹大臂，臀部坐下，上半身趴地，手臂向两侧打直，大腿压臂，下巴贴地（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "抬头起身，双腿依次绕到头后方（过渡进入睡龟式"
      }
    ]
  },
  {
    "id": "seated-supta-kurmasana",
    "name": "Supta Kurmasana",
    "sanskrit": "Supta Kurmasana",
    "section": "seated",
    "order": 18,
    "image": "../../images/seated/supta-kurmasana.png",
    "listName": "睡龟式",
    "cueName": "睡龟式",
    "drishti": "V9 | 凝视点：鼻尖",
    "drishtiSanskrit": "",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "—",
        "breath": "-",
        "action": "从龟式体位法进入"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "抬头起身，双腿依次绕到头后方"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "低头拱背，额头贴地，双手背后交扣抓手腕，双腿在头后方互勾（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "双手推地，抬臀，双脚打开"
      },
      {
        "count": "11",
        "breath": "吸气",
        "action": "屈膝进入鹤禅式（Bakasana 过渡）"
      },
      {
        "count": "12",
        "breath": "呼气",
        "action": "跳到平板式（四柱支撑）"
      },
      {
        "count": "13",
        "breath": "吸气",
        "action": "上犬式"
      },
      {
        "count": "14",
        "breath": "呼气",
        "action": "下犬式"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "跳回两手之间抬头"
      },
      {
        "count": "16",
        "breath": "呼气",
        "action": "回到山式"
      }
    ]
  },
  {
    "id": "seated-garbha-pindasana",
    "name": "Garbha Pindasana",
    "sanskrit": "Garbha Pindasana",
    "section": "seated",
    "order": 19,
    "image": "../../images/seated/garbha-pindasana.png",
    "listName": "子宫胎儿式",
    "cueName": "子宫胎儿式",
    "drishti": "V8 | 凝视点：鼻尖",
    "drishtiSanskrit": "",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，盘莲花，双臂穿过大小腿间缝隙，手掌托耳朵附近，臀部平衡，挺胸直背",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "低头拱背，双手扶头上方，配合呼吸顺时针滚动（吐气后滚、吸气前滚，滚动 1 圈）",
        "isAsana": true
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "滚回原位，双手按地（进入公鸡式 ）"
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-kukkutasana",
    "name": "Kukkutasana",
    "sanskrit": "Kukkutasana",
    "section": "seated",
    "order": 20,
    "image": "../../images/seated/kukkutasana.png",
    "listName": "公鸡式",
    "cueName": "公鸡式",
    "drishti": "V9 | 凝视点：鼻尖",
    "drishtiSanskrit": "",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，盘莲花，双臂穿过大小腿间缝隙"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "顺时针滚动"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "手心推地，把整个身体提起离地（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-baddha-konasana-a",
    "name": "Baddha Konasana (1)",
    "sanskrit": "Baddha Konasana (1)",
    "section": "seated",
    "order": 21,
    "image": "../../images/seated/baddha-konasana-a.png",
    "listName": "束角式(1)",
    "cueName": "束角式(1)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，脚掌互对，脚跟拉近会阴，胸口挺高，双膝贴地（看鼻尖）",
        "isAsana": true
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "身体前倾，下巴找地板（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-baddha-konasana-b",
    "name": "Baddha Konasana (2)",
    "sanskrit": "Baddha Konasana (2)",
    "section": "seated",
    "order": 22,
    "image": "../../images/seated/baddha-konasana-b.png",
    "listName": "束角式(2)",
    "cueName": "束角式(2)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，脚掌互对，脚跟拉近会阴，胸口挺高，双膝贴地（看鼻尖）",
        "isAsana": true
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "圆背，额头找脚掌（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-upavishta-konasana-01",
    "name": "Upavishta Konasana (1)",
    "sanskrit": "Upavishta Konasana (1)",
    "section": "seated",
    "order": 23,
    "image": "../../images/seated/upavishta-konasana-01.png",
    "listName": "坐姿开腿前弯式(1)",
    "cueName": "坐姿开腿前弯式(1)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，双腿打开，手抓脚大拇趾"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "前弯，下巴贴地上，腿打直（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-upavishta-konasana-02",
    "name": "Upavishta Konasana (2)",
    "sanskrit": "Upavishta Konasana (2)",
    "section": "seated",
    "order": 24,
    "image": "../../images/seated/upavishta-konasana-02.png",
    "listName": "坐姿开腿前弯式(2)",
    "cueName": "坐姿开腿前弯式(2)",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，双腿打开，手抓脚大拇趾"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "前弯，头贴地上"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "身体坐高上来，只剩臀部平衡；双腿张开伸直，目光往上看（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-supta-konasana-01",
    "name": "Supta Konasana (1)",
    "sanskrit": "Supta Konasana (1)",
    "section": "seated",
    "order": 25,
    "image": "../../images/seated/supta-konasana-01.png",
    "listName": "睡姿开腿前弯式(1)",
    "cueName": "睡姿开腿前弯式(1)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿西方延展式（Paschimattanasana）向前跳穿后躺下，双手放身体两侧，双腿有力打直并拢"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "吸气抬腿；接著呼气把双腿从头上往后大大张开、脚放地上，双手抓双脚大拇趾（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-16",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-supta-konasana-02",
    "name": "Supta Konasana (2)",
    "sanskrit": "Supta Konasana (2)",
    "section": "seated",
    "order": 26,
    "image": "../../images/seated/supta-konasana-02.png",
    "listName": "睡姿开腿前弯式(2)",
    "cueName": "睡姿开腿前弯式(2)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿西方延展式（Paschimattanasana）向前跳穿后躺下，双手放身体两侧，双腿有力打直并拢"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "吸气抬腿；接著呼气把双腿从头上往后大大张开、脚放地上，双手抓双脚大拇趾（肩部支撑全身重量）（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "保持双腿伸直滚坐上来（到坐姿开腿前弯式第 9 动位置）"
      },
      {
        "count": "10",
        "breath": "呼气",
        "action": "控制地把打直的双腿放回地上（到坐姿开腿前弯式第 8 动位置），抬头"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "屈膝，手撑地；接著吸气提身"
      },
      {
        "count": "12",
        "breath": "呼气",
        "action": "跳到平板式（四柱支撑）"
      },
      {
        "count": "13",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式"
      },
      {
        "count": "14",
        "breath": "呼气",
        "action": "腰上提脚跟踩地下犬式"
      },
      {
        "count": "15",
        "breath": "吸气",
        "action": "跳回两手之间抬头"
      },
      {
        "count": "16",
        "breath": "呼气",
        "action": "前弯（鼻尖碰膝盖），回到山式"
      }
    ]
  },
  {
    "id": "seated-supta-padangusthasana-01",
    "name": "Supta Padangushtasana (1)",
    "sanskrit": "Supta Padangushtasana (1)",
    "section": "seated",
    "order": 27,
    "image": "../../images/seated/supta-padangusthasana-01.png",
    "listName": "睡姿手抓脚趾前弯式(1)",
    "cueName": "睡姿手抓脚趾前弯式(1)",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 21,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿肩立式第7动：仿西方延展式（Paschimattanasana）向前跳穿后躺下，双腿打直并拢"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "右腿踢到头正上方，右手抓右脚大拇指"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "头抬起，鼻子碰右膝（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "头放回地上"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "松开右手，腿放下"
      },
      {
        "count": "12-13",
        "breath": "—",
        "action": "换左边重复"
      },
      {
        "count": "14-21",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-supta-padangusthasana-02",
    "name": "Supta Padangushtasana (2)",
    "sanskrit": "Supta Padangushtasana (2)",
    "section": "seated",
    "order": 28,
    "image": "../../images/seated/supta-padangusthasana-02.png",
    "listName": "睡姿手抓脚趾前弯式(2)",
    "cueName": "睡姿手抓脚趾前弯式(2)",
    "drishti": "侧边",
    "drishtiSanskrit": "pārśva",
    "vinyasaCount": 28,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿肩立式第7动：仿西方延展式（Paschimattanasana）向前跳穿后躺下，双腿打直并拢"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "右腿直直踢到头上方，右手抓右脚大拇趾，左手按左大腿"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "头抬起，鼻子贴近打直的右膝（看脚趾）→ 停留5个呼吸"
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "头放回地上"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "右腿往外打开贴近地板（看侧边）→ 停留5个呼吸",
        "isAsana": true
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "腿拉回 V8 位置"
      },
      {
        "count": "13",
        "breath": "呼气",
        "action": "鼻子再次贴近右膝（看侧边）→ 停留5个呼吸",
        "isAsana": true
      },
      {
        "count": "14",
        "breath": "吸气",
        "action": "头放回地上"
      },
      {
        "count": "15",
        "breath": "呼气",
        "action": "松开右手，右腿放下"
      },
      {
        "count": "16",
        "breath": "吸气",
        "action": "左腿直直踢到头上方，左手抓左脚大拇趾，右手按右大腿"
      },
      {
        "count": "17",
        "breath": "呼气",
        "action": "头抬起，鼻子贴近打直的左膝（看脚趾）→ 停留5个呼吸"
      },
      {
        "count": "18",
        "breath": "吸气",
        "action": "头放回地上"
      },
      {
        "count": "19",
        "breath": "呼气",
        "action": "左腿往外打开贴近地板（看侧边）→ 停留5个呼吸",
        "isAsana": true
      },
      {
        "count": "20",
        "breath": "吸气",
        "action": "腿拉回 V16 位置"
      },
      {
        "count": "21",
        "breath": "呼气",
        "action": "鼻子再次贴近左膝（看侧边）→ 停留5个呼吸",
        "isAsana": true
      },
      {
        "count": "22",
        "breath": "吸气",
        "action": "头放回地上"
      },
      {
        "count": "23-28",
        "breath": "—",
        "action": "完成串联：双腿并拢来到锄式 → 后翻轮式（Chakrasana）回平板 → 上犬 → 下犬 → 跳回两手间 → 前弯回山式"
      }
    ]
  },
  {
    "id": "seated-ubhaya-padangusthasana-02",
    "name": "Ubhaya Padangushtasana",
    "sanskrit": "Ubhaya Padangushtasana",
    "section": "seated",
    "order": 29,
    "image": "../../images/seated/ubhaya-padangusthasana-02.png",
    "listName": "并腿手抓脚趾前弯式",
    "cueName": "并腿手抓脚趾前弯式",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿肩立式第7动：仿西方延展式（Paschimattanasana）向前跳穿后躺下，双腿打直并拢"
      },
      {
        "count": "8",
        "breath": "吸气 → 呼气",
        "action": "吸气提腿到肩立式；呼气时双腿到锄式位置，双手勾住脚大拇趾"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "手抓脚趾往前滚，平衡坐在臀部上（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-urdhva-mukha-paschimottanasana-02",
    "name": "Urdhva Mukha Paschimattanasana",
    "sanskrit": "Urdhva Mukha Paschimattanasana",
    "section": "seated",
    "order": 30,
    "image": "../../images/seated/urdhva-mukha-paschimottanasana-02.png",
    "listName": "向上西方延展式",
    "cueName": "向上西方延展式",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 16,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿肩立式第7动：仿西方延展式（Paschimattanasana）向前跳穿后躺下，双腿打直并拢"
      },
      {
        "count": "8",
        "breath": "吸气 → 呼气",
        "action": "吸气提腿到肩立式；呼气时双腿到锄式位置，手抓脚掌外侧（靠近脚跟处，区别于Ubhaya抓大拇趾）"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "滚坐上来，手抓脚掌外侧"
      },
      {
        "count": "10",
        "breath": "呼气",
        "action": "脸贴近膝盖（看脚趾）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "11-16",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "seated-setu-bandhasana",
    "name": "Setu Bandhasana",
    "sanskrit": "Setu Bandhasana",
    "section": "seated",
    "order": 31,
    "image": "../../images/seated/setu-bandhasana.png",
    "listName": "桥式",
    "cueName": "桥式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿肩立式第7动：仿西方延展式（Paschimattanasana）向前跳穿后躺下，双腿打直并拢"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "微微弯膝，脚跟相碰，小脚趾稳稳贴地；接著呼气时头后仰，头顶靠地，胸口上提（后弯准备位置）"
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "双手互抱胸前，把腰和背都往上提高，只有头顶和双脚在地上（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10",
        "breath": "呼气",
        "action": "慢慢躺回地上"
      },
      {
        "count": "11",
        "breath": "吸气",
        "action": "两腿打直；接著呼气时两手在头两侧往下推，往后翻（Chakrasana）回到平板式（四柱支撑）"
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式"
      },
      {
        "count": "13",
        "breath": "呼气",
        "action": "腰上提脚跟踩地下犬式"
      },
      {
        "count": "14",
        "breath": "吸气",
        "action": "跳回两手之间抬头"
      },
      {
        "count": "15",
        "breath": "呼气",
        "action": "前弯（鼻尖碰膝盖），回到山式"
      }
    ]
  },
  {
    "id": "seated-urdhva-dhanurasana",
    "name": "Urdhva Dhanurasana",
    "sanskrit": "Urdhva Dhanurasana",
    "section": "seated",
    "order": 32,
    "image": "../../images/seated/urdhva-dhanurasana.png",
    "listName": "轮式",
    "cueName": "轮式",
    "drishti": "眉心",
    "drishtiSanskrit": "bhrūmadhye",
    "vinyasaCount": 9,
    "vinyasaSteps": [
      {
        "count": "1-3",
        "breath": "—",
        "action": "准备动作，躺下，双手放耳旁"
      },
      {
        "count": "4",
        "breath": "吸气",
        "action": "推轮向上，头顶离地，手臂打直（看眉心）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "5",
        "breath": "呼气",
        "action": "放下"
      },
      {
        "count": "6",
        "breath": "吸气",
        "action": "第二次推轮，停留5呼吸（看眉心）",
        "isAsana": true
      },
      {
        "count": "7",
        "breath": "呼气",
        "action": "放下"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "第三次推轮，停留5呼吸（看眉心）",
        "isAsana": true
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "放下"
      },
      {
        "count": "—",
        "breath": "—",
        "action": "后翻轮式 (Cakrasana) 翻回站姿"
      }
    ]
  },
  {
    "id": "seated-paschimottanasana",
    "name": "Paschimattanasana (轮式后收功)",
    "sanskrit": "Paschimattanasana (轮式后收功)",
    "section": "seated",
    "order": 33,
    "image": "../../images/seated/paschimottanasana.png",
    "listName": "西方延展式（轮式后收功）",
    "cueName": "西方延展式（轮式后收功）",
    "drishti": "脚趾",
    "drishtiSanskrit": "pādayoragre",
    "vinyasaCount": 9,
    "vinyasaSteps": [
      {
        "count": "1",
        "breath": "吸气",
        "action": "山式开始，双手举过头合十"
      },
      {
        "count": "2",
        "breath": "呼气",
        "action": "前弯，手放脚掌两边"
      },
      {
        "count": "3",
        "breath": "呼气",
        "action": "加深前弯，鼻子碰膝盖，手勾脚大拇趾（看脚趾）",
        "isAsana": true
      },
      {
        "count": "—",
        "breath": "—",
        "action": "→ 停留5-8个呼吸",
        "isAsana": true
      },
      {
        "count": "4",
        "breath": "吸气",
        "action": "抬头"
      },
      {
        "count": "5",
        "breath": "呼气",
        "action": "双手撑地，跳或走到平板"
      },
      {
        "count": "6",
        "breath": "吸气",
        "action": "上犬式"
      },
      {
        "count": "7",
        "breath": "呼气",
        "action": "下犬式"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "跳回两手之间，抬头"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "前弯，回到山式"
      }
    ]
  },
  {
    "id": "finishing-sarvangasana",
    "name": "Sarvangasana",
    "sanskrit": "Sarvangasana",
    "section": "finishing",
    "order": 1,
    "image": "../../images/finishing/sarvangasana.png",
    "listName": "肩立式",
    "cueName": "肩立式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿西方延展式（Paschimattanasana）向前跳穿后躺下，双手放身体两侧，双腿打直并拢"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "双腿提起，手撑腰，肩支撑，身体打直（看肚脐）",
        "isAsana": true,
        "holdBreaths": 10
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "腿朝头方向放下，后翻"
      },
      {
        "count": "10-13",
        "breath": "—",
        "action": "回到山式"
      }
    ]
  },
  {
    "id": "finishing-halasana",
    "name": "Halasana",
    "sanskrit": "Halasana",
    "section": "finishing",
    "order": 2,
    "image": "../../images/finishing/halasana.png",
    "listName": "锄式",
    "cueName": "锄式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "同肩立式第7动"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "腿往头后方放，脚背着地，双手在背后十指互扣（看肚脐）",
        "isAsana": true,
        "holdBreaths": 8
      },
      {
        "count": "9-13",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-karnapidasana",
    "name": "Karnapidasana",
    "sanskrit": "Karnapidasana",
    "section": "finishing",
    "order": 3,
    "image": "../../images/finishing/karnapidasana.png",
    "listName": "膝盖夹耳式",
    "cueName": "膝盖夹耳式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "同肩立式第7动"
      },
      {
        "count": "8",
        "breath": "吸气 → 呼气",
        "action": "先吸气到肩立式；再呼气把腿往头方向放，膝盖弯曲夹住耳朵，手背后十指互扣（看肚脐）",
        "isAsana": true,
        "holdBreaths": 8
      },
      {
        "count": "9-13",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-urdhva-padmasana",
    "name": "Urdhva Padmasana",
    "sanskrit": "Urdhva Padmasana",
    "section": "finishing",
    "order": 4,
    "image": "../../images/finishing/urdhva-padmasana.png",
    "listName": "向上莲花式",
    "cueName": "向上莲花式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "同肩立式第7动：仿西方延展式向前跳穿后躺下，深呼吸4-5次"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "肩立式（双腿打直上提，手撑腰，肩支撑）"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "盘莲花，停在肩立式位置；收紧肛门、腹部完全内收，双手推膝盖，手臂打直（看肚脐）",
        "isAsana": true,
        "holdBreaths": 8
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "双腿解开；接著呼气时往后翻（Chakrasana）回到平板式（四柱支撑）"
      },
      {
        "count": "11",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式"
      },
      {
        "count": "12",
        "breath": "呼气",
        "action": "腰上提脚跟踩地下犬式"
      },
      {
        "count": "13",
        "breath": "吸气",
        "action": "跳回两手之间抬头"
      },
      {
        "count": "14",
        "breath": "呼气",
        "action": "前弯（鼻尖碰膝盖），回到山式"
      }
    ]
  },
  {
    "id": "finishing-pindasana",
    "name": "Pindasana",
    "sanskrit": "Pindasana",
    "section": "finishing",
    "order": 5,
    "image": "../../images/finishing/pindasana.png",
    "listName": "胎儿式",
    "cueName": "胎儿式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "同肩立式第7动：仿西方延展式向前跳穿后躺下，深呼吸4-5次"
      },
      {
        "count": "8",
        "breath": "吸气 → 呼气",
        "action": "吸气到肩立式（仿Urdhva Padmasana V8）；呼气时盘莲花停在肩立式位置（仿V9）。两动合并为胎儿式的V8",
        "isAsana": true
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "双臂环抱盘好的双腿，一手扣住另一手手腕，肩膀平衡在地上，把腿慢慢放下来靠近额头（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-matsyasana",
    "name": "Matsyasana",
    "sanskrit": "Matsyasana",
    "section": "finishing",
    "order": 6,
    "image": "../../images/finishing/matsyasana.png",
    "listName": "鱼式",
    "cueName": "鱼式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "同肩立式第7动：仿西方延展式向前跳穿后躺下，深呼吸4-5次"
      },
      {
        "count": "8",
        "breath": "吸气 → 呼气",
        "action": "吸气时盘莲花；呼气时手放头两边推地，上半身上提，头顶点地、胸上提后弯；两手抓住脚掌，手臂打直（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9-13",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-uttana-padasana",
    "name": "Uttana Padasana",
    "sanskrit": "Uttana Padasana",
    "section": "finishing",
    "order": 7,
    "image": "../../images/finishing/uttana-padasana.png",
    "listName": "并腿延展式",
    "cueName": "并腿延展式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "同肩立式第7动：仿西方延展式向前跳穿后躺下，深呼吸4-5次"
      },
      {
        "count": "8",
        "breath": "—",
        "action": "仿鱼式让上半身提起来：头顶点地，上半身后弯；双腿像船式一样提高并拢；双臂和双腿平行，双手合十，全身结实有力（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 5
      },
      {
        "count": "9",
        "breath": "—",
        "action": "往后翻 Chakrasana 回到跳到平板式（四柱支撑）"
      },
      {
        "count": "10",
        "breath": "吸气",
        "action": "胸口前送后弯成上犬式"
      },
      {
        "count": "11",
        "breath": "呼气",
        "action": "腰上提脚跟踩地下犬式"
      },
      {
        "count": "12",
        "breath": "吸气",
        "action": "跳回两手之间抬头"
      },
      {
        "count": "13",
        "breath": "呼气",
        "action": "前弯（鼻尖碰膝盖），回到山式"
      }
    ]
  },
  {
    "id": "finishing-sirsasana-01",
    "name": "Shirshasana (1)",
    "sanskrit": "Shirshasana (1)",
    "section": "finishing",
    "order": 8,
    "image": "../../images/finishing/sirsasana-01.png",
    "listName": "头倒立式(1)",
    "cueName": "头倒立式(1)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跪地，十指互扣，头放地上"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "双腿打直上提，全身收紧，脚趾指天（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 15
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "脚放回地面，休息两分钟（婴儿式）",
        "isAsana": true
      },
      {
        "count": "10-13",
        "breath": "—",
        "action": "回到山式"
      }
    ]
  },
  {
    "id": "finishing-sirsasana-02",
    "name": "Shirshasana (2)",
    "sanskrit": "Shirshasana (2)",
    "section": "finishing",
    "order": 9,
    "image": "../../images/finishing/sirsasana-02.png",
    "listName": "头倒立式(2)",
    "cueName": "头倒立式(2)",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 13,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跪地，十指互扣，手肘放地上，头顶放在地上，互扣的双手抱住后脑勺"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "双臂有力往下推，双腿打直并拢上提进入头倒立；再将双腿下降至与地面平行、与身体成 90 度（Ūrdhva Daṇḍāsana 向上棍式）（看脚指）",
        "isAsana": true,
        "holdBreaths": 10
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "腿放回地面，臀部靠脚跟，头贴地，休息两分钟（婴儿式）",
        "isAsana": true
      },
      {
        "count": "10-13",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-baddha-padmasana",
    "name": "Baddha Padmasana",
    "sanskrit": "Baddha Padmasana",
    "section": "finishing",
    "order": 10,
    "image": "../../images/finishing/baddha-padmasana.png",
    "listName": "束脚莲花式",
    "cueName": "束脚莲花式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 15,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "仿西方延展式跳穿后坐下，双腿并拢，挺胸直背，停留一个呼吸（看鼻尖）"
      },
      {
        "count": "8",
        "breath": "呼气",
        "action": "盘莲花（先右脚掌放左大腿，再左脚掌放右大腿，两脚跟抵肚脐两侧）；双手绕到背后，先左手抓左脚大拇趾，再右手抓右脚大拇趾；胸口前推，脊椎挺直，下巴找地板（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 10
      },
      {
        "count": "9",
        "breath": "吸气",
        "action": "不松手，抬头挺胸，身体坐高"
      },
      {
        "count": "10",
        "breath": "呼气",
        "action": "解开莲花"
      },
      {
        "count": "11-15",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-padmasana",
    "name": "Padmasana",
    "sanskrit": "Padmasana",
    "section": "finishing",
    "order": 11,
    "image": "../../images/finishing/padmasana.png",
    "listName": "莲花式",
    "cueName": "莲花式",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaCount": 14,
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，双腿并拢，挺胸直背"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "伸直双手放于膝盖，智慧手印，背胸腰挺直（看鼻尖）",
        "isAsana": true,
        "holdBreaths": 10
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "解开莲花"
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-utpluthih",
    "name": "Uth Pluthi",
    "sanskrit": "Uth Pluthi",
    "section": "finishing",
    "order": 12,
    "image": "../../images/finishing/utpluthih.png",
    "listName": "上提",
    "cueName": "上提",
    "drishti": "鼻尖",
    "drishtiSanskrit": "nāsāgre",
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，双腿并拢，挺胸直背"
      },
      {
        "count": "8",
        "breath": "吸气",
        "action": "盘莲花，双手压大腿两边地板，用力把身体提起离地，停留在半空中；手臂、脊椎、脖子完全打直，下巴微内收（看鼻尖）",
        "isAsana": true
      },
      {
        "count": "—",
        "breath": "—",
        "action": "停留10个呼吸"
      },
      {
        "count": "9",
        "breath": "呼气",
        "action": "解开莲花"
      },
      {
        "count": "10-14",
        "breath": "—",
        "action": "完成串联回到山式"
      }
    ]
  },
  {
    "id": "finishing-savasana",
    "name": "Savasana",
    "sanskrit": "Savasana",
    "section": "finishing",
    "order": 13,
    "image": "../../images/finishing/savasana.png",
    "listName": "大休息式",
    "cueName": "大休息式",
    "drishti": "—",
    "drishtiSanskrit": "",
    "vinyasaSteps": [
      {
        "count": "1-6",
        "breath": "—",
        "action": "拜日式A前6个动作"
      },
      {
        "count": "7",
        "breath": "吸气",
        "action": "跳穿坐下，头朝向老师方向"
      },
      {
        "count": "—",
        "breath": "—",
        "action": "躺下，保持有控制的呼吸，身体完全放松后回到自然呼吸，休息10-20分钟"
      }
    ]
  }
];

module.exports = { POSE_SECTIONS, POSES };

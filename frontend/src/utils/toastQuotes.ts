// ============================================================
// 祝酒词库 - 质疑通过（平安无事）时随机展示的祝酒词
// 词条来源：宋朝及宋朝以前的诗词、典故、市井俚语
// 如需新增/修改词条，同步更新项目根目录 toast-quotes.md
// 音频文件位于 frontend/public/audio/toast/
// ============================================================

export interface ToastQuote {
  /** 显示在界面上的祝酒词文本（含「」） */
  text: string;
  /** 对应音频文件路径（相对于 public），如 /audio/toast/general_01.mp3 */
  audio: string;
}

/** 通用祝酒词 - 所有角色共享 */
const GENERAL_TOASTS: ToastQuote[] = [
  { text: '「葡萄美酒夜光杯，欲饮琵琶马上催——此杯无毒，痛饮！」', audio: '/audio/toast/general_01.mp3' },
  { text: '「人生得意须尽欢，莫使金樽空对月！」',                   audio: '/audio/toast/general_02.mp3' },
  { text: '「劝君更尽一杯酒——此酒无毒，西出阳关亦无忧！」',        audio: '/audio/toast/general_03.mp3' },
  { text: '「对酒当歌，人生几何？此番得脱，当浮一大白！」',         audio: '/audio/toast/general_04.mp3' },
  { text: '「明月几时有，把酒问青天——今夜这酒，问得好！」',        audio: '/audio/toast/general_05.mp3' },
  { text: '「金樽清酒斗十千，此杯入喉，乐哉乐哉！」',              audio: '/audio/toast/general_06.mp3' },
  { text: '「兰陵美酒郁金香，玉碗盛来琥珀光——果然是好酒！」',     audio: '/audio/toast/general_07.mp3' },
  { text: '「举杯邀明月，对影成三人——今日有伴，更当畅饮！」',     audio: '/audio/toast/general_08.mp3' },
  { text: '「浊酒一杯家万里——今夜此酒清甜，无愁！」',             audio: '/audio/toast/general_09.mp3' },
  { text: '「且就洞庭赊月色，将船买酒白云边——好酒当前，不醉不归！」', audio: '/audio/toast/general_10.mp3' },
  { text: '「醉里挑灯看剑——此刻无剑，只有好酒一壶，痛快！」',    audio: '/audio/toast/general_11.mp3' },
  { text: '「须臾宴罢，且趁此杯无毒，再饮一盏！」',                audio: '/audio/toast/general_12.mp3' },
  { text: '「好酒不醉人，人自醉——这杯分明是好酒！」',             audio: '/audio/toast/general_13.mp3' },
  { text: '「杯中有乾坤，今日乾坤对我，当再满一杯！」',            audio: '/audio/toast/general_14.mp3' },
  { text: '「酒逢知己千杯少——今日得此好酒，正是知己！」',         audio: '/audio/toast/general_15.mp3' },
];

/** 角色专属祝酒词 - key 为 CHARACTERS 中的 id */
const CHARACTER_TOASTS: Record<string, ToastQuote[]> = {
  zhaokuangyin: [
    { text: '「杯酒释兵权，此杯释的是忧患——好酒，痛饮！」',           audio: '/audio/toast/zhaokuangyin_01.mp3' },
    { text: '「卧榻之侧不容他人鼾睡，此酒之侧不容有毒——果然清白！」', audio: '/audio/toast/zhaokuangyin_02.mp3' },
    { text: '「朕打下这片江山，今日又赢了这杯酒，痛快！」',             audio: '/audio/toast/zhaokuangyin_03.mp3' },
  ],
  zhaopu: [
    { text: '「半部《论语》治天下，半壶好酒平此局——此局我赢了！」', audio: '/audio/toast/zhaopu_01.mp3' },
    { text: '「运筹帷幄，算无遗策——连这杯酒都在我算中，是好酒！」', audio: '/audio/toast/zhaopu_02.mp3' },
  ],
  fanzhongyan: [
    { text: '「先天下之忧而忧，今天下无忧——此杯无毒，后天下之乐而乐！」', audio: '/audio/toast/fanzhongyan_01.mp3' },
    { text: '「浊酒一杯家万里，今无羌管，只有好酒一盏！」',               audio: '/audio/toast/fanzhongyan_02.mp3' },
    { text: '「不以物喜，不以己悲——此刻以酒喜，理所当然！」',            audio: '/audio/toast/fanzhongyan_03.mp3' },
  ],
  wananshi: [
    { text: '「天变不足畏，此酒不足惧——好喝，再来！」',       audio: '/audio/toast/wananshi_01.mp3' },
    { text: '「春风又绿江南岸——今夜春风又绿我这杯酒，甚好！」', audio: '/audio/toast/wananshi_02.mp3' },
  ],
  simage: [
    { text: '「资治通鉴载千年史，此杯载的是好酒——史书为证，甚好！」', audio: '/audio/toast/simage_01.mp3' },
    { text: '「砸缸救人，今日缸中盛的是好酒——打开来喝！」',           audio: '/audio/toast/simage_02.mp3' },
  ],
  kouzhan: [
    { text: '「澶渊订盟，两厢无虞——今日此酒亦无虞，干了！」', audio: '/audio/toast/kouzhan_01.mp3' },
    { text: '「此身许国，死而后已——今身许酒，喝而后快！」',   audio: '/audio/toast/kouzhan_02.mp3' },
  ],
  baozheng: [
    { text: '「铡刀斩奸，今日只斩这杯好酒——无罪，饮下！」',     audio: '/audio/toast/baozheng_01.mp3' },
    { text: '「清如朗月，廉若秋水——此酒亦清如朗月，好！」',     audio: '/audio/toast/baozheng_02.mp3' },
    { text: '「包某断案如神，今断此酒：无毒，好喝，速饮！」',   audio: '/audio/toast/baozheng_03.mp3' },
  ],
  qinhui: [
    { text: '「莫须有……莫须有毒，这杯是好酒，算我好运。」', audio: '/audio/toast/qinhui_01.mp3' },
    { text: '「东窗事发亦无妨，此酒无毒，我命好得很。」',   audio: '/audio/toast/qinhui_02.mp3' },
  ],
  yuefei: [
    { text: '「壮志饥餐胡虏肉，今日且饮这碗好酒，壮我筋骨！」', audio: '/audio/toast/yuefei_01.mp3' },
    { text: '「精忠报国，此酒无毒，正当饮一杯以报国恩！」',     audio: '/audio/toast/yuefei_02.mp3' },
    { text: '「莫等闲，白了少年头——趁年轻，先把这好酒喝了！」', audio: '/audio/toast/yuefei_03.mp3' },
  ],
  wentianxiang: [
    { text: '「人生自古谁无死，今日无死——此酒乃长生之酒，饮之！」', audio: '/audio/toast/wentianxiang_01.mp3' },
    { text: '「天地有正气，此酒有正味——好酒！」',                   audio: '/audio/toast/wentianxiang_02.mp3' },
  ],
  sushi: [
    { text: '「人生如梦，一尊还酹江月——今月作证，此酒甚好！」',         audio: '/audio/toast/sushi_01.mp3' },
    { text: '「且将新火试新茶，诗酒趁年华——今夜趁年华，先饮此杯！」',   audio: '/audio/toast/sushi_02.mp3' },
    { text: '「此心安处是吾乡——此酒入喉，安然无恙，甚好！」',           audio: '/audio/toast/sushi_03.mp3' },
    { text: '「料峭春风吹酒醒，微冷——今却是好酒，回甘！」',            audio: '/audio/toast/sushi_04.mp3' },
  ],
  liqingzhao: [
    { text: '「常记溪亭日暮，沉醉不知归路——今日得好酒，愿再沉醉一回！」', audio: '/audio/toast/liqingzhao_01.mp3' },
    { text: '「东篱把酒黄昏后，有暗香盈袖——此酒亦有暗香，好喝！」',      audio: '/audio/toast/liqingzhao_02.mp3' },
    { text: '「三杯两盏淡酒，怎敌他、晚来风急——罢了，今夜是好酒，且喝！」', audio: '/audio/toast/liqingzhao_03.mp3' },
    { text: '「沉水卧时烧，此香薰得人微醉——好酒配好香，妙哉！」',        audio: '/audio/toast/liqingzhao_04.mp3' },
  ],
  liuyong: [
    { text: '「今宵酒醒何处？杨柳岸，晓风残月——今宵先把好酒喝了再说！」', audio: '/audio/toast/liuyong_01.mp3' },
    { text: '「衣带渐宽终不悔——今为好酒渐宽，值！」',                    audio: '/audio/toast/liuyong_02.mp3' },
    { text: '「凡有井水处，皆能歌柳词——凡有好酒处，皆当一饮而尽！」',      audio: '/audio/toast/liuyong_03.mp3' },
  ],
  ouyangxiu: [
    { text: '「醉翁之意不在酒，在乎山水之间也——今日之意正在酒，此酒甚好！」', audio: '/audio/toast/ouyangxiu_01.mp3' },
    { text: '「酒逢知己千杯少——今日此酒是知己，再来一杯！」',               audio: '/audio/toast/ouyangxiu_02.mp3' },
    { text: '「人间有味是清欢——今日清欢，正是此杯好酒！」',                 audio: '/audio/toast/ouyangxiu_03.mp3' },
  ],
  xinqiji: [
    { text: '「醉里挑灯看剑，今无剑可看，只有好酒可饮，痛快！」', audio: '/audio/toast/xinqiji_01.mp3' },
    { text: '「了却君王天下事，今了却这杯好酒，快哉！」',         audio: '/audio/toast/xinqiji_02.mp3' },
    { text: '「把吴钩看了，栏杆拍遍——今日拍的是酒杯，好酒！」',  audio: '/audio/toast/xinqiji_03.mp3' },
  ],
  huangtingjian: [
    { text: '「桃李春风一杯酒，今晚这杯——正是桃李春风！」',                       audio: '/audio/toast/huangtingjian_01.mp3' },
    { text: '「茶山之茶，君谟之墨，皆为天下第一——今日此酒，亦是第一！」', audio: '/audio/toast/huangtingjian_02.mp3' },
  ],
  luyou: [
    { text: '「山重水复疑无路，柳暗花明又一村——今日疑有毒，却是好酒，柳暗花明！」', audio: '/audio/toast/luyou_01.mp3' },
    { text: '「红酥手，黄藤酒——今日黄藤酒入喉，无毒，好！」',                        audio: '/audio/toast/luyou_02.mp3' },
    { text: '「此生谁料，心在天山，身老沧洲——今身在酒肆，且饮好酒！」',             audio: '/audio/toast/luyou_03.mp3' },
  ],
  linbu: [
    { text: '「疏影横斜水清浅，暗香浮动月黄昏——此酒亦有暗香，好酒。」', audio: '/audio/toast/general_01.mp3' },
    { text: '「以梅为妻，以鹤为子——今日以好酒为友，亦足矣。」',         audio: '/audio/toast/general_02.mp3' },
  ],
  zhaojizhui: [
    { text: '「天下一人挥此笔，今日天下一人饮此酒——朕说好喝，便是好喝！」', audio: '/audio/toast/zhaojizhui_01.mp3' },
    { text: '「此酒色泽如瘦金，入喉如行笔——好！」',                          audio: '/audio/toast/zhaojizhui_02.mp3' },
  ],
  zhangzeduan: [
    { text: '「汴京繁华皆入图中，今繁华亦在杯中——好酒！」',         audio: '/audio/toast/zhangzeduan_01.mp3' },
    { text: '「市井百态，皆是人间烟火——此酒正有烟火气，甚好！」', audio: '/audio/toast/zhangzeduan_02.mp3' },
  ],
  fankuan: [
    { text: '「与其师人，不若师造化——今日造化弄我，弄的是好酒！」', audio: '/audio/toast/fankuan_01.mp3' },
    { text: '「溪山行旅，千里无尘——此酒清冽如溪山，好！」',         audio: '/audio/toast/fankuan_02.mp3' },
  ],
  wangximeng: [
    { text: '「千里江山一少年，今日少年得此好酒，当浮一大白！」', audio: '/audio/toast/wangximeng_01.mp3' },
    { text: '「青绿千里，尽在此杯——好酒！」',                      audio: '/audio/toast/wangximeng_02.mp3' },
  ],
  mifu: [
    { text: '「米颠拜石，今日拜的是这杯好酒——好酒，一拜！」',     audio: '/audio/toast/mifu_01.mp3' },
    { text: '「米氏云山烟云妙，此酒入喉亦如烟云，妙哉！」',       audio: '/audio/toast/mifu_02.mp3' },
  ],
  lishishi: [
    { text: '「风月无边，唯酒知心——此酒知心，好！」',               audio: '/audio/toast/lishishi_01.mp3' },
    { text: '「来，再陪我走一杯，这杯无毒，正好。」',               audio: '/audio/toast/lishishi_02.mp3' },
    { text: '「天子也来我处饮酒，今日这杯，比天子的还好。」',       audio: '/audio/toast/lishishi_03.mp3' },
  ],
  lianghongyu: [
    { text: '「击鼓退金兵，今日击杯退忧愁——好酒，痛饮！」', audio: '/audio/toast/lianghongyu_01.mp3' },
    { text: '「巾帼不让须眉，这杯酒我一口干！」',             audio: '/audio/toast/lianghongyu_02.mp3' },
    { text: '「沙场浴血尚且不惧，这杯好酒有何可惧，喝！」', audio: '/audio/toast/lianghongyu_03.mp3' },
  ],
  yanrui: [
    { text: '「不是爱风尘，似被前缘误——今日缘分是好酒，不误人。」', audio: '/audio/toast/yanrui_01.mp3' },
    { text: '「道是无情却有情——此酒道是无味却有味，好喝。」',       audio: '/audio/toast/yanrui_02.mp3' },
  ],
  jigong: [
    { text: '「酒肉穿肠过，佛祖心中留——今日穿肠过的是好酒，佛祖保佑！」', audio: '/audio/toast/jigong_01.mp3' },
    { text: '「鞋儿破，帽儿破，偏偏这酒不破——好酒！哈哈！」',             audio: '/audio/toast/jigong_02.mp3' },
    { text: '「贫僧先干为敬，这杯果然是好酒！」',                          audio: '/audio/toast/jigong_03.mp3' },
  ],
  hongmai: [
    { text: '「夷坚志载万奇事，今日最奇是此酒无毒——记入志中，好酒！」', audio: '/audio/toast/hongmai_01.mp3' },
    { text: '「天下奇闻我见多了，今日奇的是：这杯居然是好酒！」',       audio: '/audio/toast/hongmai_02.mp3' },
  ],
  chentuan: [
    { text: '「希夷一觉三千年，今醒来，且饮此杯好酒再睡。」',     audio: '/audio/toast/chentuan_01.mp3' },
    { text: '「华山之巅，云雾缭绕，此酒亦如云雾，妙不可言。」', audio: '/audio/toast/chentuan_02.mp3' },
  ],
};

// 已预加载的音频缓存集合，避免重复创建
const _preloaded = new Set<string>();

/**
 * 静默预加载指定角色的祝酒词音频，在回合开始后调用，用户无感知。
 * - 优先加载角色专属语音（全部）
 * - 再加载前 5 条通用语音
 * @param characterId 当前角色 id
 */
export function preloadToastAudio(characterId?: string | null): void {
  const toLoad: string[] = [];

  // 角色专属
  if (characterId) {
    const specific = CHARACTER_TOASTS[characterId];
    if (specific) specific.forEach(q => toLoad.push(q.audio));
  }

  // 通用前 5 条
  GENERAL_TOASTS.slice(0, 5).forEach(q => toLoad.push(q.audio));

  // 利用浏览器空闲时间逐个加载，间隔 200ms 避免并发过多
  toLoad.forEach((src, i) => {
    if (_preloaded.has(src)) return;
    _preloaded.add(src);
    setTimeout(() => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = src;
      // 只触发加载，不播放；浏览器会缓存到内存中
    }, i * 200);
  });
}

/**
 * 随机获取一条祝酒词（文本 + 音频路径）。
 * @param characterId 当前角色 id（来自 CHARACTERS[n].id），可选。
 * @returns { text, audio } 祝酒词文本和对应音频路径。
 */
export function getToastQuote(characterId?: string | null): ToastQuote {
  const specific = characterId ? CHARACTER_TOASTS[characterId] : null;
  // 有专属词条时：50% 抽专属，50% 抽通用；无专属时：100% 抽通用
  const pool =
    specific && specific.length > 0 && Math.random() < 0.5
      ? specific
      : GENERAL_TOASTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

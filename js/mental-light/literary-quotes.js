/**
 * 世界名著语录：按心情随机展示，中英对照；摘录、点赞入库；首页可搜索收藏。
 */
(function () {
    'use strict';

    var C = window.MentalLightConfig || {};
    var STORAGE_KEY = C.QUOTE_LIKES_STORAGE_KEY || 'mentallight_quote_likes_v1';

    /** @type {Record<string, Array<{id:string,zh:string,en:string,workZh:string,workEn:string,authorZh:string,authorEn:string}>>} */
    var POOL = {
        calm: [
            {
                id: 'calm-walden-1',
                zh: '我步入丛林，因为我想慎重地生活，只面对生活中最要紧的事实，看看我是否学得到它要教诲于我的真谛，免得到了临终之时，才发现自己从没活过。',
                en: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.',
                workZh: '瓦尔登湖',
                workEn: 'Walden',
                authorZh: '亨利·戴维·梭罗',
                authorEn: 'Henry David Thoreau'
            },
            {
                id: 'calm-pride-1',
                zh: '愤怒的人并不总是明智的。',
                en: 'Angry people are not always wise.',
                workZh: '傲慢与偏见',
                workEn: 'Pride and Prejudice',
                authorZh: '简·奥斯汀',
                authorEn: 'Jane Austen'
            },
            {
                id: 'calm-prince-1',
                zh: '这是我的秘密：只有用心才能看得真切；实质性的东西，用眼睛是看不见的。',
                en: 'And now here is my secret: it is only with the heart that one can see rightly; what is essential is invisible to the eye.',
                workZh: '小王子',
                workEn: 'The Little Prince',
                authorZh: '安托万·德·圣-埃克苏佩里',
                authorEn: 'Antoine de Saint-Exupéry'
            },
            {
                id: 'calm-meditations-1',
                zh: '你拥有统辖自己内心的力量，而不是统辖外在事件；意识到这一点，你就能找到定力。',
                en: 'You have power over your mind—not outside events. Realize this, and you will find strength.',
                workZh: '沉思录',
                workEn: 'Meditations',
                authorZh: '马可·奥勒留',
                authorEn: 'Marcus Aurelius'
            },
            {
                id: 'calm-mockingbird-1',
                zh: '人们一般只看见他们去找的东西，也只听见他们愿意去听的话。',
                en: 'People generally see what they look for, and hear what they listen for.',
                workZh: '杀死一只知更鸟',
                workEn: 'To Kill a Mockingbird',
                authorZh: '哈珀·李',
                authorEn: 'Harper Lee'
            },
            {
                id: 'calm-dickinson-1',
                zh: '永恒，是由许多个「此刻」连缀而成的。',
                en: 'Forever is composed of nows.',
                workZh: '狄金森诗集',
                workEn: 'The Poems of Emily Dickinson',
                authorZh: '艾米莉·狄金森',
                authorEn: 'Emily Dickinson'
            },
            {
                id: 'calm-middlemarch-1',
                zh: '推动世界前进的正是这种日复一日、不为人知的坚持与忍耐。',
                en: 'The growing good of the world is partly dependent on this: on unhistoric acts, and people who lived faithfully their hidden lives.',
                workZh: '米德尔马契',
                workEn: 'Middlemarch',
                authorZh: '乔治·艾略特',
                authorEn: 'George Eliot'
            },
            {
                id: 'calm-wind-willows-1',
                zh: '在岸上没完没了地忙了那么久之后，回到河边真让人愉快——回到这条永远是「自己的」河。',
                en: 'Believe me, my young friend, there is nothing—absolutely nothing—half so much worth doing as simply messing about in boats.',
                workZh: '柳林风声',
                workEn: 'The Wind in the Willows',
                authorZh: '肯尼思·格雷厄姆',
                authorEn: 'Kenneth Grahame'
            }
        ],
        sad: [
            {
                id: 'sad-anna-1',
                zh: '幸福的家庭家家相似，不幸的家庭各有各的不幸。',
                en: 'All happy families are alike; each unhappy family is unhappy in its own way.',
                workZh: '安娜·卡列尼娜',
                workEn: 'Anna Karenina',
                authorZh: '列夫·托尔斯泰',
                authorEn: 'Leo Tolstoy'
            },
            {
                id: 'sad-farewell-1',
                zh: '这世界会打垮每一个人；过后，许多人却在伤口处长得更加坚硬。',
                en: 'The world breaks everyone and afterward many are strong at the broken places.',
                workZh: '永别了，武器',
                workEn: 'A Farewell to Arms',
                authorZh: '欧内斯特·海明威',
                authorEn: 'Ernest Hemingway'
            },
            {
                id: 'sad-prince-rose-1',
                zh: '正是你为你的玫瑰付出的时间，使得你的玫瑰如此重要。',
                en: 'It is the time you have wasted for your rose that makes your rose so important.',
                workZh: '小王子',
                workEn: 'The Little Prince',
                authorZh: '安托万·德·圣-埃克苏佩里',
                authorEn: 'Antoine de Saint-Exupéry'
            },
            {
                id: 'sad-red-chamber-1',
                zh: '满纸荒唐言，一把辛酸泪；都云作者痴，谁解其中味。',
                en: 'Pages full of idle word / Penned with hot and bitter tears; / Men call the author fool / Of none his message hears.',
                workZh: '红楼梦',
                workEn: 'Dream of the Red Chamber',
                authorZh: '曹雪芹',
                authorEn: 'Cao Xueqin'
            },
            {
                id: 'sad-old-man-1',
                zh: '一个人可以被毁灭，但不能被打败。',
                en: 'A man can be destroyed but not defeated.',
                workZh: '老人与海',
                workEn: 'The Old Man and the Sea',
                authorZh: '欧内斯特·海明威',
                authorEn: 'Ernest Hemingway'
            },
            {
                id: 'sad-wuthering-1',
                zh: '没有我的生命，我无法活下去！没有你的灵魂，我无法活下去！',
                en: 'I cannot live without my life! I cannot live without my soul!',
                workZh: '呼啸山庄',
                workEn: 'Wuthering Heights',
                authorZh: '艾米莉·勃朗特',
                authorEn: 'Emily Brontë'
            },
            {
                id: 'sad-ishiguro-1',
                zh: '话说回来——我何必不承认呢？——在那一刻，我的心碎了。',
                en: 'Indeed—why should I not admit it?—in that moment, my heart was breaking.',
                workZh: '长日将尽',
                workEn: 'The Remains of the Day',
                authorZh: '石黑一雄',
                authorEn: 'Kazuo Ishiguro'
            },
            {
                id: 'sad-great-expectations-1',
                zh: '在心碎中，我对她的爱反而更深了；我知道那是我自己的错。',
                en: 'Suffering has been stronger than all other teaching; it has taught me to understand what your heart used to be.',
                workZh: '远大前程',
                workEn: 'Great Expectations',
                authorZh: '查尔斯·狄更斯',
                authorEn: 'Charles Dickens'
            }
        ],
        angry: [
            {
                id: 'angry-hamlet-1',
                zh: '这是一个颠倒混乱的时代：唉，倒楣的我却要负起重整乾坤的责任！',
                en: 'The time is out of joint: O cursed spite, / That ever I was born to set it right!',
                workZh: '哈姆雷特',
                workEn: 'Hamlet',
                authorZh: '威廉·莎士比亚',
                authorEn: 'William Shakespeare'
            },
            {
                id: 'angry-1984-1',
                zh: '如果你要一幅未来图景，就想象一只靴子永远在踩着人脸吧。',
                en: 'If you want a picture of the future, imagine a boot stamping on a human face—for ever.',
                workZh: '一九八四',
                workEn: 'Nineteen Eighty-Four',
                authorZh: '乔治·奥威尔',
                authorEn: 'George Orwell'
            },
            {
                id: 'angry-moby-1',
                zh: '从地狱之心我向你刺去；我满怀仇恨掷出长矛。',
                en: 'To the last I grapple with thee; from hell\'s heart I stab at thee; for hate\'s sake I spit my last breath at thee.',
                workZh: '白鲸',
                workEn: 'Moby-Dick',
                authorZh: '赫尔曼·梅尔维尔',
                authorEn: 'Herman Melville'
            },
            {
                id: 'angry-lear-1',
                zh: '吹吧，风啊！狠狠地吹裂你的双颊！狂怒吧！吹吧！',
                en: 'Blow, winds, and crack your cheeks! rage! blow!',
                workZh: '李尔王',
                workEn: 'King Lear',
                authorZh: '威廉·莎士比亚',
                authorEn: 'William Shakespeare'
            },
            {
                id: 'angry-jane-1',
                zh: '我并不是什么任人摆布的鸟儿，也没有什么网罗得住我：我是一个有独立意志的自由人。',
                en: 'I am no bird; and no net ensnares me: I am a free human being with an independent will.',
                workZh: '简·爱',
                workEn: 'Jane Eyre',
                authorZh: '夏洛蒂·勃朗特',
                authorEn: 'Charlotte Brontë'
            },
            {
                id: 'angry-tale-1',
                zh: '那是最好的时代，那是最坏的时代；是信仰的时期，也是怀疑的时期。',
                en: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
                workZh: '双城记',
                workEn: 'A Tale of Two Cities',
                authorZh: '查尔斯·狄更斯',
                authorEn: 'Charles Dickens'
            },
            {
                id: 'angry-master-1',
                zh: '你们这假冒为善的人！外面饰以色泽，里面却满是死人的骨头。',
                en: 'Woe unto you… for ye are like unto whited sepulchres, which indeed appear beautiful outward, but are within full of dead men\'s bones.',
                workZh: '圣经·马太福音',
                workEn: 'The Gospel According to Matthew',
                authorZh: '传统归于',
                authorEn: 'Scriptural tradition'
            }
        ],
        joy: [
            {
                id: 'joy-pride-1',
                zh: '从身体到灵魂，你彻彻底底地征服了我。',
                en: 'You have bewitched me, body and soul, and I love you.',
                workZh: '傲慢与偏见',
                workEn: 'Pride and Prejudice',
                authorZh: '简·奥斯汀',
                authorEn: 'Jane Austen'
            },
            {
                id: 'joy-anne-1',
                zh: '只要生活里还能笑，生命就值得。',
                en: 'Life is worth living as long as there\'s a laugh in it.',
                workZh: '绿山墙的安妮',
                workEn: 'Anne of Green Gables',
                authorZh: '露西·莫德·蒙哥马利',
                authorEn: 'L. M. Montgomery'
            },
            {
                id: 'joy-women-1',
                zh: '我正学着驾驶自己的船，所以我不再惧怕风暴。',
                en: 'I am not afraid of storms, for I am learning how to sail my ship.',
                workZh: '小妇人',
                workEn: 'Little Women',
                authorZh: '路易莎·梅·奥尔科特',
                authorEn: 'Louisa May Alcott'
            },
            {
                id: 'joy-as-you-like-1',
                zh: '整个世界是一座舞台，男男女女都只是演员。',
                en: 'All the world\'s a stage, / And all the men and women merely players.',
                workZh: '皆大欢喜',
                workEn: 'As You Like It',
                authorZh: '威廉·莎士比亚',
                authorEn: 'William Shakespeare'
            },
            {
                id: 'joy-twain-1',
                zh: '勇敢去踏足那些无人走过的路，让另一条辙印成为你的奖赏。',
                en: 'Twenty years from now you will be more disappointed by the things that you didn\'t do than by the ones you did do.',
                workZh: '马克·吐温语录（文体类编摘名句）',
                workEn: 'Attributed essays & speeches',
                authorZh: '马克·吐温',
                authorEn: 'Mark Twain'
            },
            {
                id: 'joy-tom-sawyer-1',
                zh: '所谓工作，就是非做不可的事；所谓玩耍，就是不必非做不可的事。',
                en: 'Work consists of whatever a body is obliged to do, and play consists of whatever a body is not obliged to do.',
                workZh: '汤姆·索亚历险记',
                workEn: 'The Adventures of Tom Sawyer',
                authorZh: '马克·吐温',
                authorEn: 'Mark Twain'
            },
            {
                id: 'joy-three-men-1',
                zh: ' work 与休息若不搭配使用，就都不值得信任。',
                en: 'I like work: it fascinates me. I can sit and look at it for hours.',
                workZh: '三人同舟',
                workEn: 'Three Men in a Boat',
                authorZh: '杰罗姆·K·杰罗姆',
                authorEn: 'Jerome K. Jerome'
            },
            {
                id: 'joy-bovary-irony',
                zh: '在她想来，爱情应当突然来临，像狂风骤雨，夹着电闪雷鸣——人生一席巨浪，一下子将她卷向千里之外。',
                en: 'She thought love ought to come at once, with great thunderclaps and bolts of lightning.',
                workZh: '包法利夫人',
                workEn: 'Madame Bovary',
                authorZh: '古斯塔夫·福楼拜',
                authorEn: 'Gustave Flaubert'
            }
        ],
        anxious: [
            {
                id: 'anxious-trial-1',
                zh: '一定是有人说了约瑟夫·K的坏话，因为尽管自己并没犯法，他却在一天清晨被逮捕了。',
                en: 'Someone must have been telling lies about Joseph K., for without having done anything wrong he was arrested one fine morning.',
                workZh: '审判',
                workEn: 'The Trial',
                authorZh: '弗兰茨·卡夫卡',
                authorEn: 'Franz Kafka'
            },
            {
                id: 'anxious-metamorphosis-1',
                zh: '一天早晨，格里高尔·萨姆沙从不安的睡梦中醒来，发现自己躺在床上变成了一只巨大的甲虫。',
                en: 'As Gregor Samsa awoke one morning from uneasy dreams, he found himself transformed in his bed into a gigantic insect.',
                workZh: '变形记',
                workEn: 'The Metamorphosis',
                authorZh: '弗兰茨·卡夫卡',
                authorEn: 'Franz Kafka'
            },
            {
                id: 'anxious-notes-1',
                zh: '我是一个有病的人……我是一个心怀歹毒的人。',
                en: 'I am a sick man… I am an angry man.',
                workZh: '地下室手记',
                workEn: 'Notes from Underground',
                authorZh: '费奥多尔·陀思妥耶夫斯基',
                authorEn: 'Fyodor Dostoevsky'
            },
            {
                id: 'anxious-crime-1',
                zh: '巨大的智慧与深沉的心灵，总难免伴随着痛苦与煎熬。',
                en: 'Pain and suffering are always inevitable for a large intelligence and a deep heart.',
                workZh: '罪与罚',
                workEn: 'Crime and Punishment',
                authorZh: '费奥多尔·陀思妥耶夫斯基',
                authorEn: 'Fyodor Dostoevsky'
            },
            {
                id: 'anxious-mrs-dalloway-1',
                zh: '她自己把花买回来，因为她喜欢这样沿着邦德街走，感到自己是独自一人、无拘无束的。',
                en: 'She would buy the flowers herself. For she had thrown the coin with the perfect aplomb of one who has the sense of being alone.',
                workZh: '达洛维夫人',
                workEn: 'Mrs Dalloway',
                authorZh: '弗吉尼亚·伍尔夫',
                authorEn: 'Virginia Woolf'
            },
            {
                id: 'anxious-dorian-1',
                zh: '摆脱诱惑的唯一办法，就是向它屈服。',
                en: 'The only way to get rid of a temptation is to yield to it.',
                workZh: '道林·格雷的画像',
                workEn: 'The Picture of Dorian Gray',
                authorZh: '奥斯卡·王尔德',
                authorEn: 'Oscar Wilde'
            },
            {
                id: 'anxious-invisible-1',
                zh: '我是一个看不见的人；可正因无形，我竟以为自己无处不在。',
                en: 'I am an invisible man… I am a man of substance, of flesh and bone, fiber and liquids.',
                workZh: '看不见的人',
                workEn: 'Invisible Man',
                authorZh: '拉尔夫·艾里森',
                authorEn: 'Ralph Ellison'
            }
        ],
        tired: [
            {
                id: 'tired-godot-1',
                zh: '什么也没发生，谁也没来，谁也没走，实在糟透了。',
                en: 'Nothing happens, nobody comes, nobody goes, it\'s awful.',
                workZh: '等待戈多',
                workEn: 'Waiting for Godot',
                authorZh: '萨缪尔·贝克特',
                authorEn: 'Samuel Beckett'
            },
            {
                id: 'tired-odyssey-1',
                zh: '有太多的话该讲的时候，也正是该睡的时候。',
                en: 'There is a time for many words, and there is also a time for sleep.',
                workZh: '奥德赛',
                workEn: 'The Odyssey',
                authorZh: '荷马',
                authorEn: 'Homer'
            },
            {
                id: 'tired-sun-1',
                zh: '一想到日子过得这么快，而我并没有真正在生活，我就受不了。',
                en: 'I can\'t stand it to think my life is going so fast and I\'m not really living it.',
                workZh: '太阳照常升起',
                workEn: 'The Sun Also Rises',
                authorZh: '欧内斯特·海明威',
                authorEn: 'Ernest Hemingway'
            },
            {
                id: 'tired-stranger-1',
                zh: '我以这种方式爱妈妈——这意味一切。',
                en: 'Mother died today. Or maybe yesterday; I can\'t be sure.',
                workZh: '局外人',
                workEn: 'The Stranger',
                authorZh: '阿尔贝·加缪',
                authorEn: 'Albert Camus'
            },
            {
                id: 'tired-prufrock-1',
                zh: '我可有勇气搅乱这宇宙？在一分钟里还有时间，决定与修订决定。',
                en: 'Do I dare / Disturb the universe? / In a minute there is time / For decisions and revisions.',
                workZh: '阿尔弗雷德·普鲁弗洛克的情歌及其他观察',
                workEn: 'The Love Song of J. Alfred Prufrock',
                authorZh: 'T·S·艾略特',
                authorEn: 'T. S. Eliot'
            },
            {
                id: 'tired-camus-1',
                zh: '迈向高处的挣扎本身是足以填满人心的。',
                en: 'The struggle itself towards the heights is enough to fill a man\'s heart.',
                workZh: '西西弗神话',
                workEn: 'The Myth of Sisyphus',
                authorZh: '阿尔贝·加缪',
                authorEn: 'Albert Camus'
            },
            {
                id: 'tired-eliott-1',
                zh: '四月是最残忍的月份，在死土里掺混着记忆与欲望。',
                en: 'April is the cruellest month, breeding / Lilacs out of the dead land, mixing / Memory and desire.',
                workZh: '荒原',
                workEn: 'The Waste Land',
                authorZh: 'T·S·艾略特',
                authorEn: 'T. S. Eliot'
            }
        ],
        hopeful: [
            {
                id: 'hope-les-mis-1',
                zh: '再漫长的黑夜也会过去，太阳终将升起。',
                en: 'Even the darkest night will end and the sun will rise.',
                workZh: '悲惨世界',
                workEn: 'Les Misérables',
                authorZh: '维克多·雨果',
                authorEn: 'Victor Hugo'
            },
            {
                id: 'hope-frank-1',
                zh: '我仍然相信，归根到底，人性是善良的。',
                en: 'I still believe, in spite of everything, that people are truly good at heart.',
                workZh: '安妮日记',
                workEn: 'The Diary of a Young Girl',
                authorZh: '安妮·弗兰克',
                authorEn: 'Anne Frank'
            },
            {
                id: 'hope-alchemist-1',
                zh: '当你真心渴望某样东西时，整个宇宙都会合力助你实现它。',
                en: 'And, when you want something, all the universe conspires in helping you to achieve it.',
                workZh: '牧羊少年奇幻之旅',
                workEn: 'The Alchemist',
                authorZh: '保罗·柯艾略',
                authorEn: 'Paulo Coelho'
            },
            {
                id: 'hope-copperfield-1',
                zh: '我究竟会不会成为自己人生的英雄，还是由别人来担当——这一问题须待后文分解。',
                en: 'Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.',
                workZh: '大卫·科波菲尔',
                workEn: 'David Copperfield',
                authorZh: '查尔斯·狄更斯',
                authorEn: 'Charles Dickens'
            },
            {
                id: 'hope-secret-garden-1',
                zh: '若是心里有念头，还守着一粒种子，花园就不会真的荒芜。',
                en: 'Where you tend a rose, my lad, a thistle cannot grow.',
                workZh: '秘密花园',
                workEn: 'The Secret Garden',
                authorZh: '弗朗西丝·霍奇森·伯内特',
                authorEn: 'Frances Hodgson Burnett'
            },
            {
                id: 'hope-little-prince-2',
                zh: '星光之所以美丽，是因为某颗看不见的星球上，有一朵你爱的花。',
                en: 'The stars are beautiful because of a flower that cannot be seen.',
                workZh: '小王子',
                workEn: 'The Little Prince',
                authorZh: '安托万·德·圣-埃克苏佩里',
                authorEn: 'Antoine de Saint-Exupéry'
            },
            {
                id: 'hope-streetcar-1',
                zh: '我总仰赖陌生人的善意。',
                en: 'I have always depended on the kindness of strangers.',
                workZh: '欲望号街车',
                workEn: 'A Streetcar Named Desire',
                authorZh: '田纳西·威廉斯',
                authorEn: 'Tennessee Williams'
            },
            {
                id: 'hope-monte-cristo-1',
                zh: '等待，并心怀希望吧。',
                en: 'Wait and hope.',
                workZh: '基督山伯爵',
                workEn: 'The Count of Monte Cristo',
                authorZh: '大仲马',
                authorEn: 'Alexandre Dumas'
            }
        ],
        fearful: [
            {
                id: 'fear-macbeth-1',
                zh: '我面前晃动的可是一柄刀子，刀柄正朝着我手？',
                en: 'Is this a dagger which I see before me, / The handle toward my hand?',
                workZh: '麦克白',
                workEn: 'Macbeth',
                authorZh: '威廉·莎士比亚',
                authorEn: 'William Shakespeare'
            },
            {
                id: 'fear-frankenstein-1',
                zh: '当心；我无所畏惧，因此也就无比强大。',
                en: 'Beware; for I am fearless, and therefore powerful.',
                workZh: '弗兰肯斯坦',
                workEn: 'Frankenstein',
                authorZh: '玛丽·雪莱',
                authorEn: 'Mary Shelley'
            },
            {
                id: 'fear-darkness-1',
                zh: '可怖啊！可怖啊！',
                en: 'The horror! The horror!',
                workZh: '黑暗的心',
                workEn: 'Heart of Darkness',
                authorZh: '约瑟夫·康拉德',
                authorEn: 'Joseph Conrad'
            },
            {
                id: 'fear-dracula-1',
                zh: '后来我才明白，最可怕的并非怪物本身，而是未知。',
                en: 'There are mysteries which men can only guess at, which age by age they may solve only in part.',
                workZh: '德古拉',
                workEn: 'Dracula',
                authorZh: '布莱姆·斯托克',
                authorEn: 'Bram Stoker'
            },
            {
                id: 'fear-turn-screw-1',
                zh: '那故事让我们在炉火边屏息，直到寒风从门框缝里钻进来。',
                en: 'The story had held us, round the fire, sufficiently breathless…',
                workZh: '螺丝在拧紧',
                workEn: 'The Turn of the Screw',
                authorZh: '亨利·詹姆斯',
                authorEn: 'Henry James'
            },
            {
                id: 'fear-1984-2',
                zh: '老大哥正看着你。',
                en: 'Big Brother is watching you.',
                workZh: '一九八四',
                workEn: 'Nineteen Eighty-Four',
                authorZh: '乔治·奥威尔',
                authorEn: 'George Orwell'
            },
            {
                id: 'fear-dorian-2',
                zh: '世上只有一件事比被人议论更糟糕，那就是根本没人议论你。',
                en: 'There is only one thing in the world worse than being talked about, and that is not being talked about.',
                workZh: '道林·格雷的画像',
                workEn: 'The Picture of Dorian Gray',
                authorZh: '奥斯卡·王尔德',
                authorEn: 'Oscar Wilde'
            }
        ],
        warm: [
            {
                id: 'warm-charlotte-1',
                zh: '你一直是我的朋友，这本身就是一件极其了不起的事。',
                en: 'You have been my friend… That in itself is a tremendous thing.',
                workZh: '夏洛的网',
                workEn: 'Charlotte\'s Web',
                authorZh: 'E·B·怀特',
                authorEn: 'E. B. White'
            },
            {
                id: 'warm-carol-1',
                zh: '我要在心里敬重圣诞精神，并尽力一年四季都存留它。',
                en: 'I will honour Christmas in my heart, and try to keep it all the year.',
                workZh: '圣诞颂歌',
                workEn: 'A Christmas Carol',
                authorZh: '查尔斯·狄更斯',
                authorEn: 'Charles Dickens'
            },
            {
                id: 'warm-pooh-1',
                zh: '有一样东西让你舍不得说再见，那是多么幸运啊。',
                en: 'How lucky I am to have something that makes saying goodbye so hard.',
                workZh: '小熊温维尼角的房子',
                workEn: 'The House at Pooh Corner',
                authorZh: 'A·A·米尔恩',
                authorEn: 'A. A. Milne'
            },
            {
                id: 'warm-women-2',
                zh: '没有什么比家人的手更暖；我们会在彼此的臂弯里过冬。',
                en: 'Love is the only thing we can carry with us when we go to the next world.',
                workZh: '小妇人',
                workEn: 'Little Women',
                authorZh: '路易莎·梅·奥尔科特',
                authorEn: 'Louisa May Alcott'
            },
            {
                id: 'warm-pride-2',
                zh: '她是他的知己——在他最狼狈的时候，仍肯心平气和地听他讲完。',
                en: 'In vain I have struggled. It will not do! My feelings will not be repressed.',
                workZh: '傲慢与偏见',
                workEn: 'Pride and Prejudice',
                authorZh: '简·奥斯汀',
                authorEn: 'Jane Austen'
            },
            {
                id: 'warm-years-solitude-1',
                zh: '许多年后再相见，他们才懂得，原来遗忘也需要共同的回忆。',
                en: 'He understood then that solitude shared was not solitude at all.',
                workZh: '百年孤独',
                workEn: 'One Hundred Years of Solitude',
                authorZh: '加西亚·马尔克斯',
                authorEn: 'Gabriel García Márquez'
            },
            {
                id: 'warm-night-circus-1',
                zh: '最温柔的魔法，往往只是把一个人从黑暗里轻轻牵出来。',
                en: 'The finest of pleasures are always unexpected, remembered only in hindsight.',
                workZh: '夜间马戏团',
                workEn: 'The Night Circus',
                authorZh: '埃琳·摩根斯特恩',
                authorEn: 'Erin Morgenstern'
            }
        ],
        jealous: [
            {
                id: 'jeal-othello-1',
                zh: '大人啊，要提防妒忌：那是绿眼的妖魔，它吞吃人，才先逗人发笑。',
                en: 'O, beware, my lord, of jealousy; / It is the green-eyed monster which doth mock / The meat it feeds on.',
                workZh: '奥赛罗',
                workEn: 'Othello',
                authorZh: '威廉·莎士比亚',
                authorEn: 'William Shakespeare'
            },
            {
                id: 'jeal-wuthering-2',
                zh: '他比我更是我自己；不论我们的灵魂是用什么做的，他那一颗和我这一颗是一模一样的。',
                en: 'He\'s more myself than I am. Whatever our souls are made of, his and mine are the same.',
                workZh: '呼啸山庄',
                workEn: 'Wuthering Heights',
                authorZh: '艾米莉·勃朗特',
                authorEn: 'Emily Brontë'
            },
            {
                id: 'jeal-gatsby-1',
                zh: '我既身在局内又身在局外：对这个大千世界，我同时感到着迷与厌倦。',
                en: 'I was within and without, simultaneously enchanted and repelled by the inexhaustible variety of life.',
                workZh: '了不起的盖茨比',
                workEn: 'The Great Gatsby',
                authorZh: 'F·司各特·菲茨杰拉德',
                authorEn: 'F. Scott Fitzgerald'
            },
            {
                id: 'jeal-madame-1',
                zh: '她想要一切：巴黎、激情、永不知足的情人——世界在她心里燃烧成一片妒忌的火焰。',
                en: 'She wanted everything at once—the luxury of feeling and the luxury of virtue.',
                workZh: '包法利夫人',
                workEn: 'Madame Bovary',
                authorZh: '古斯塔夫·福楼拜',
                authorEn: 'Gustave Flaubert'
            },
            {
                id: 'jeal-letters-1',
                zh: '爱情若不排他，便与占有无关；而妒忌，正是对占有的饥渴。',
                en: 'Love without exclusivity is not possession; jealousy hungers for what it cannot wholly own.',
                workZh: '危险的关系',
                workEn: 'Dangerous Liaisons',
                authorZh: '肖德洛·德·拉克洛',
                authorEn: 'Pierre Choderlos de Laclos'
            },
            {
                id: 'jeal-rebecca-1',
                zh: '整座曼德利都在低声说着丽贝卡的名字，而我只是门槛外发抖的闯入者。',
                en: 'Last night I dreamt I went to Manderley again.',
                workZh: '蝴蝶梦',
                workEn: 'Rebecca',
                authorZh: '达夫妮·杜穆里埃',
                authorEn: 'Daphne du Maurier'
            },
            {
                id: 'jeal-sartre-1',
                zh: '他人即地狱。',
                en: 'Hell is other people.',
                workZh: '禁闭',
                workEn: 'No Exit',
                authorZh: '让-保罗·萨特',
                authorEn: 'Jean-Paul Sartre'
            }
        ]
    };

    /** Fix typo in joy-three-men zh */
    var joyFix = POOL.joy;
    for (var ji = 0; ji < joyFix.length; ji++) {
        if (joyFix[ji].id === 'joy-three-men-1') {
            joyFix[ji].zh = '我对「工作」着迷：我能一连坐上好几个小时，只是盯着它看。';
            break;
        }
    }

    var panelMoodShown = null;
    var currentQuote = null;

    function normalizeMood(m) {
        var moods = ['calm', 'sad', 'angry', 'joy', 'anxious', 'tired', 'hopeful', 'fearful', 'warm', 'jealous'];
        if (moods.indexOf(m) >= 0) return m;
        return 'calm';
    }

    function listForMood(mood) {
        var m = normalizeMood(mood);
        var L = POOL[m];
        return L && L.length ? L : POOL.calm;
    }

    function pickRandom(mood, excludeId) {
        var list = listForMood(mood).slice();
        if (excludeId) {
            var filtered = list.filter(function (q) {
                return q.id !== excludeId;
            });
            if (filtered.length) list = filtered;
        }
        return list[Math.floor(Math.random() * list.length)];
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatCopy(q) {
        if (!q) return '';
        return (
            '「' +
            q.zh.replace(/\n/g, '\n') +
            '」\n\n"' +
            q.en.replace(/\n/g, '\n') +
            '"\n\n—— ' +
            q.authorZh +
            '（' +
            q.authorEn +
            '）《' +
            q.workZh +
            '》 / ' +
            q.workEn
        );
    }

    function copyTextToClipboard(text) {
        var t = String(text);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(t).catch(function () {
                legacyCopy(t);
            });
        }
        legacyCopy(t);
        return Promise.resolve();
    }

    function legacyCopy(t) {
        var ta = document.createElement('textarea');
        ta.value = t;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
        } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    function loadLikes() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            var a = JSON.parse(raw);
            return Array.isArray(a) ? a : [];
        } catch (e) {
            return [];
        }
    }

    function saveLikes(arr) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        } catch (e) { /* ignore */ }
    }

    function isLiked(id) {
        var L = loadLikes();
        for (var i = 0; i < L.length; i++) {
            if (L[i] && L[i].id === id) return true;
        }
        return false;
    }

    function unlikeQuote(id) {
        saveLikes(
            loadLikes().filter(function (x) {
                return x.id !== id;
            })
        );
    }

    function likeQuote(q, mood) {
        if (!q) return;
        var L = loadLikes();
        var existing = -1;
        for (var i = 0; i < L.length; i++) {
            if (L[i] && L[i].id === q.id) {
                existing = i;
                break;
            }
        }
        if (existing >= 0) {
            L.splice(existing, 1);
        } else {
            L.unshift({
                id: q.id,
                moodKey: normalizeMood(mood),
                zh: q.zh,
                en: q.en,
                workZh: q.workZh,
                workEn: q.workEn,
                authorZh: q.authorZh,
                authorEn: q.authorEn,
                likedAt: new Date().toISOString()
            });
        }
        saveLikes(L);
    }

    function updateLikeButton() {
        var btn = document.getElementById('literary-quote-like');
        if (!btn || !currentQuote) return;
        var on = isLiked(currentQuote.id);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.textContent = on ? '♥ 已赞' : '♥ 点赞';
        btn.classList.toggle('literary-quote-liked', on);
    }

    function renderQuoteToDom(q, moodKey) {
        currentQuote = q;
        var zhEl = document.getElementById('literary-quote-zh');
        var enEl = document.getElementById('literary-quote-en');
        var metaEl = document.getElementById('literary-quote-meta');
        var panel = document.getElementById('literary-quote-panel');
        if (!zhEl || !enEl || !metaEl) return;

        zhEl.textContent = q.zh;
        enEl.textContent = q.en;
        metaEl.innerHTML =
            '《' +
            escapeHtml(q.workZh) +
            '》 <span class="literary-meta-sep">·</span> <em lang="en">' +
            escapeHtml(q.workEn) +
            '</em><br><span class="literary-author">' +
            escapeHtml(q.authorZh) +
            ' <span class="literary-meta-sep">·</span> ' +
            '<span lang="en">' +
            escapeHtml(q.authorEn) +
            '</span></span>';

        if (panel) {
            panel.dataset.mood = normalizeMood(moodKey);
        }
        updateLikeButton();
    }

    function showQuoteForMood(mood, excludeId) {
        var m = normalizeMood(mood);
        var q = pickRandom(m, excludeId);
        renderQuoteToDom(q, m);
    }

    function onMoodChange(mood) {
        var m = normalizeMood(mood);
        if (panelMoodShown === m) return;
        panelMoodShown = m;
        showQuoteForMood(m, null);
    }

    function shuffleClick() {
        var api = window.MentalLightCoreApi;
        var m = api && api.getCurrentMood ? api.getCurrentMood() : 'calm';
        panelMoodShown = normalizeMood(m);
        showQuoteForMood(m, currentQuote ? currentQuote.id : null);
    }

    function copyClick() {
        if (!currentQuote) return;
        var text = formatCopy(currentQuote);
        copyTextToClipboard(text).then(function () {
            var b = document.getElementById('literary-quote-copy');
            if (!b) return;
            var prev = b.textContent;
            b.textContent = '已复制';
            setTimeout(function () {
                b.textContent = prev;
            }, 1600);
        });
    }

    function likeClick() {
        if (!currentQuote) return;
        var api = window.MentalLightCoreApi;
        var m = api && api.getCurrentMood ? api.getCurrentMood() : 'calm';
        if (isLiked(currentQuote.id)) {
            unlikeQuote(currentQuote.id);
        } else {
            likeQuote(currentQuote, m);
        }
        updateLikeButton();
        renderFavoritesList();
    }

    function updateFavBadge() {
        var n = loadLikes().length;
        var b = document.getElementById('quote-fav-count-badge');
        if (b) b.textContent = n ? '（' + n + ' 条）' : '';
    }

    function renderFavoritesList() {
        var box = document.getElementById('quote-fav-list');
        var searchEl = document.getElementById('quote-fav-search');
        if (!box) return;
        var qstr = (searchEl && searchEl.value.trim().toLowerCase()) || '';
        var L = loadLikes();
        box.innerHTML = '';
        for (var i = 0; i < L.length; i++) {
            var it = L[i];
            if (!it) continue;
            var blob = (it.zh + it.en + it.workZh + it.workEn + it.authorZh + it.authorEn).toLowerCase();
            if (qstr && blob.indexOf(qstr) < 0) continue;

            var card = document.createElement('article');
            card.className = 'quote-fav-card';
            card.innerHTML =
                '<div class="quote-fav-card-head">' +
                '<span class="quote-fav-time">' +
                escapeHtml((it.likedAt || '').slice(0, 16).replace('T', ' ')) +
                '</span>' +
                '<button type="button" class="quote-fav-remove" data-id="' +
                escapeHtml(it.id) +
                '">移除</button></div>' +
                '<p class="quote-fav-zh">' +
                escapeHtml(it.zh) +
                '</p>' +
                '<p class="quote-fav-en" lang="en">' +
                escapeHtml(it.en) +
                '</p>' +
                '<p class="quote-fav-meta">《' +
                escapeHtml(it.workZh) +
                '》 · <em lang="en">' +
                escapeHtml(it.workEn) +
                '</em> — ' +
                escapeHtml(it.authorZh) +
                ' · <span lang="en">' +
                escapeHtml(it.authorEn) +
                '</span></p>' +
                '<button type="button" class="quote-fav-copy" data-copy="' +
                i +
                '">摘录</button>';

            (function (entry) {
                card.querySelector('.quote-fav-remove').addEventListener('click', function () {
                    unlikeQuote(entry.id);
                    renderFavoritesList();
                    updateFavBadge();
                    if (currentQuote && currentQuote.id === entry.id) updateLikeButton();
                });
                card.querySelector('.quote-fav-copy').addEventListener('click', function () {
                    copyTextToClipboard(formatCopy(entry));
                });
            })(it);

            box.appendChild(card);
        }
        if (!box.children.length) {
            var empty = document.createElement('p');
            empty.className = 'quote-fav-empty';
            empty.textContent = qstr ? '没有匹配的收藏。' : '暂无点赞语录。在语录卡片上点赞即可收藏到这里。';
            box.appendChild(empty);
        }
        updateFavBadge();
    }

    function init() {
        var panel = document.getElementById('literary-quote-panel');
        if (!panel) return;

        var api = window.MentalLightCoreApi;
        var m = api && api.getCurrentMood ? api.getCurrentMood() : 'calm';
        panelMoodShown = normalizeMood(m);
        showQuoteForMood(m, null);

        var sh = document.getElementById('literary-quote-shuffle');
        var cp = document.getElementById('literary-quote-copy');
        var lk = document.getElementById('literary-quote-like');
        if (sh) sh.addEventListener('click', shuffleClick);
        if (cp) cp.addEventListener('click', copyClick);
        if (lk) lk.addEventListener('click', likeClick);

        var searchEl = document.getElementById('quote-fav-search');
        if (searchEl) {
            searchEl.addEventListener('input', function () {
                renderFavoritesList();
            });
        }
        renderFavoritesList();

        var drawer = document.getElementById('garden-quote-fav-drawer');
        if (drawer) {
            drawer.addEventListener('toggle', function () {
                if (drawer.open) renderFavoritesList();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.MentalLightLiteraryQuotes = {
        onMoodChange: onMoodChange,
        loadLikes: loadLikes,
        refreshFavorites: renderFavoritesList
    };
})();

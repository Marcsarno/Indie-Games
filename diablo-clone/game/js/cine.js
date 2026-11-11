'use strict';
// Rounds 89-90: the table. The story is told the way it is played: Dave the Dungeon Master and his
// three players (Marc, Aaron, Chris) at a table under a lamp, and the game itself is the map in
// the middle of that table. A cinematic is a list of shots over that scene (a camera move, a short
// caption, the room's light, an effect); the opening ends with the camera pushing into the map
// until the map is the whole screen, and that is the game, running.
// All of it is drawn here: the room once into buffers (one per state of the light), the people and
// effects each frame, and one pass that takes the scene to the screen through the camera and puts
// the live game picture where the map is.
// Round 90 (the user: Dave drawn too heavy; upgrade all four; a better room; epic camera moves and
// effects; tell the story with pictures, not a ton of reading): the people are now the user's
// detailed portraits as drawn (no hand changes), all at one head size; the story is three visions
// (the camp on the map, the dead marching across the wall, the king rising over Dave) with a few
// words each as film captions that play on their own.

// ---------------------------------------------------------------- the four people
// The user's four detailed portraits, resampled so every head is 64 pixels tall and cut from their
// backdrops (tools/portraits/portrait-cut.py). They keep their own colours (`pal`, darkest first;
// one character of `rows` = one pixel = one colour, '.' = nothing): matched to the game's 128
// colours the faces went orange and blotchy. face: the middle of the face; eyes: boxes that close
// in a blink; mouth: the line of the mouth (it opens one pixel below).
const CINE_PEOPLE = {
  dave: { name: 'DAVE', col: 51, face: [78, 40], eyes: [[69, 31, 78, 33], [87, 33, 95, 35]], mouth: [72, 51, 86, 53],
    pal: '00030a 06040a 0a080c 191519 2f1916 12293c 152a3c 482b27 1c415a 6b2f25 254b66 7f3c2e 9d4d37 5c687a b4583e 5a788d b9684d 7c8894 7e8794 aa877c e07b52 93979c bcb2ab f6a06f cfb8a6 e9d3bb',
    rows: [
      '........................................................................00000011g000.......................................................................',
      '...................................................................000000eeeeg99ggg1010....................................................................',
      '.................................................................0001ccccb7779cc79geec00000................................................................',
      '................................................................001cc974447774344449gg7ee100...............................................................',
      '...............................................................00c99744499733499944479c77ee00..............................................................',
      '...........................................................0000cc97747777744744799744479449g10.............................................................',
      '..........................................................000cb94777973334997744444444434434g00............................................................',
      '........................................................000cc97747999777994499974349977334444gg000.........................................................',
      '........................................................001ce974479997799944999733379973344447e000.........................................................',
      '.........................................................0cc77349973337bb997733444447777433444ec1000.......................................................',
      '........................................................00c7449973334499933333377774433444443477e001.3.....................................................',
      '.......................................................00c979b433377749979b9933333333333334444377g1c00.....................................................',
      '......................................................00c94bb74377774999bbbbc999994334433333343349ee00.....................................................',
      '......................................................0cb7b943499443799ccggccccbb999447443333333349ce1.....................................................',
      '.....................................................0cc997449994449ekkkkggggeccccccccb9999943333449c01....................................................',
      '.....................................................01cb449997444ckkkkknnnnnkgggggeccccc9bbbb9333449b00...................................................',
      '......................................................7c4497973444kkkknnnnnnnkggggggggccccccbbb93344ce10...................................................',
      '.....................................................01c7b4494744kkknnnnnnnnkkggggggggggccccccbb3334990....................................................',
      '.....................................................0c9b44977743kknnnnnnnnnkgggggggggggggggccbbb334b100...................................................',
      '.....................................................09944497744bknnnnnnnnnkkgggggggggggggggccccb334bb000..................................................',
      '.....................................................0b744949744knnnnnnnnnkkkkggggggggggggceccccb3344b00...................................................',
      '.....................................................0743439774bknnnnnnnnnkkkkgggggggggggggccccccb334410...................................................',
      '.....................................................0743747747gknnnnnnnnnnkkkkgggggggggggcccccccc334310...................................................',
      '....................................................09744737777eknnnnnnnnnnkkkkgggggggggggcccccccc3344700..................................................',
      '....................................................09444434777ennnnnnnnnnnnkkkkggggggggggggcccccc333470...................................................',
      '.....................................................7474333747knnnnnnnnnnnkkkkggggggggggggeeccccc933470...................................................',
      '.....................................................044344444gnnnnnppnkcbb9bcegggggggggggggegccccc33470...................................................',
      '....................................................003344344bnnnnnnneb974333337bcgggggggggggeeeccc33400...................................................',
      '...................................................01nn333744nnnnnngccggecc933447bcgggcccb9ceeeggcc3440....................................................',
      '...................................................0nnng3474gnnnnnkkkkggecc9999b9bcccccc94333bgegcc3400....................................................',
      '..................................................0nb9bn3474knnnnkgeec997777499bbccccccb97333349ecc340.....................................................',
      '..................................................0nb9b97474knnnnkegb77110117449bccccccb999973347c9340.....................................................',
      '..................................................0k99n9737bnnnnkkb9799o404j9779bckgccb7799bbbb94c4300.....................................................',
      '..................................................0k9nkk447knnnnnnkkkknkcb4g947bbkkkee4747777bbb99430......................................................',
      '..................................................0kenb9b37nnnnpnnnkkekkecb999bbcnnkee43171317bbbc70.......................................................',
      '..................................................01ne9994nnnnnppnnkkgebb99999bbknnkec747344j37bbc70.......................................................',
      '...................................................0n999nnnnnnnppnnnkkeeeecbbegnnnpkec999bb99747bc40.......................................................',
      '...................................................0n999nnnnnnnppnnnkkkkkkkkkknnnnnkecbc999bbbb9bc10.......................................................',
      '...................................................0kn99nnnnnnnnnnnnnnkkkkkkknnnnnnkeebccbb99bbbcc00.......................................................',
      '..................................................01knn9nnnnnnnnnnnnnnkkkkkkkknnnnnkkebccbbbbbbbcc00.......................................................',
      '..................................................0nknnknnnnnnnnnnppnnkkkkeeeennnppkke9ccccbbbcccc00.......................................................',
      '..................................................0nnnkknnnnnnnnnnnnnkkkkeeebnnnppnkkecbccccccccc00........................................................',
      '..................................................0nnnnnnnnnnnnknnnkkkkkeecb9nnnkkeeeec9ccccccccc00........................................................',
      '..................................................00kkbnnnnnnnnkkkkkkkggeccb9kb9eccbbbb9bcccccccc10........................................................',
      '...................................................01c9nnnnnnnnkkkkkkkegcbcc9c101cbbb9b9bcccccccb00........................................................',
      '....................................................001nnnnnnnnkkkkkkeeccccee99b99bb1499bcccccccb00........................................................',
      '.....................................................01nnnnnnnkkkkkkeecccekkkkecb99999cbbbccccccb00........................................................',
      '.....................................................0nnnnnnnnnkkkkkgebcekkkkkecb9b99bccbbccccccb00........................................................',
      '.....................................................01nnnnnnnnkkkkkeccekkkkkeecb9b99bccbbcccccbb0.........................................................',
      '.....................................................01nnnnnnkkkkkkkgcgecckknnnkebgbbbbccbbcccbb10.........................................................',
      '.....................................................0nnnnnnnkkkkkkkgcge9ckn99999eeccbbbcbbccccc0..........................................................',
      '..................................................0000nnnnnnkkkkkkkkgggb4499999999999cbbbbbcebbc0..........................................................',
      '.................................................00pppnnkknkkkkkkkkkkgc9gknkknec944777c9bbbecbc0...........................................................',
      '................................................00ppaannnkkkkkkkkkkkgccgknnkkkeeccc99447bbecbc10...........................................................',
      '................................................00pm66nnnkkkkkkkkkkggeekknkkebbcccb99ccbbeecbc00...........................................................',
      '................................................0ppm60nnnkkkkkkkkkkggekkkkkecb9779bbccccceccbb0............................................................',
      '...............................................01ppmm1nnnnkkkkkkkkkgggkkkkkkecbbbbbcccccbccbb10............................................................',
      '..............................................00pppmm1nnnnkggkkkgggggkknknnnneccbbccccccbccc10.............................................................',
      '.............................................000pppmmdnnnnkggkkkkggggkknknnnnkkeeccccccbbcbc00.............................................................',
      '.............................................0ppppmpmm1knnkgggkkgggggkknnnnnkkeeeeeeeccbbccb00.............................................................',
      '..........................................010ppppmmpmm0knnkkgeeggggccgkknnnkkgeeeeeeccb99bb00..............................................................',
      '.......................................000pppppppmmppm1gknkkggccgggcbbgkkkkkgeeeeeeccc999900...............................................................',
      '.....................................000ppplloppmmmmppl0kkkkggccccccc99eekgecccceebcc999900................................................................',
      '...................................000ppppoomapmmmmmmpii0gkkkggcbbcccbb79ccccccccbbb779910.................................................................',
      '.................................001pppmppphh8pmmmmmmpmi11gkkggcc99bbbb9779bbbbbb977799100.................................................................',
      '...............................000pppmmmplddd3pmmmmmmmpmi0ceggggcc999bbbb744444477799b90p000...............................................................',
      '............................2200ppppppmldmpmhdmmmmmmmmpmmh0bcggggcb9999999b994447999bb0do1pp000............................................................',
      '...........................2mmpppppllfddppppha0mmmmmmmmmmhh0ccgegecc999999999999999bb0adfp6lpp01...........................................................',
      '.........................22mmmpppmldffmmpppphd1mmmmmmmmmmmi1bccegeccb999999999999bbbb0aadp68ipp1000........................................................',
      '........................2mmmmmphhhpppmmimmppiid1mmmmmmmmomih0bcceeeccbb999999999bbbbb0aadpp8ihmppp100......................................................',
      '......................22mmmmmmippppppmiiiippmhd0mmmmmmmmmmmih1ccccgeccbbb99999bbbbbb00aadipphmppmpppp00....................................................',
      '.....................2immmmmmmppppppppmiiipppihdmmmmmmmmmmmii09ccccgecccbbbbbbbbbbbb00aadhip6dilpmiipp11000................................................',
      '....................2immmmmmmippmmmmmppiiimppihddmmmmmmmimmmih1bccccccccccccbbbbbbbb10addiippddiippiihppp0000..............................................',
      '..................22immmmmmmiipmmmmmmmppiiipphihdimmmmmiimmmmii09cccccccccccccbbbbb330addiiim6ddhipphhmmmppp1000...........................................',
      '.................2iimmmmmmmiimmmmmmimmmpmiiipiiid6mmmmmiimmmmiid1bccccccccccccbbbbb441addiiim6ddiippldimmmppppp00..........................................',
      '...............22iimmmmmmmiimmmmmmmiimmmmiiioiiid0mmmmliiimmmmih11bcccccccccccbbccb440addhiimm6ddiippldimmmmppppp00........................................',
      '..............2miimmmmmmmiimmmmmmmmiihimmmiimmihdd1mmmmiiimmmmiih0bccccccccccccccc7770dddiiiim6dddiimpddihmmmmpppp00.......................................',
      '.............2miimmmmmmmiimmmmmmmmmihiimmmmiilihdd1mmmiiiiimmmmiii0ccccccccccccccc7771dddihihm6dddiimmidiimmmmmmmpp10......................................',
      '...........22miimmmmmmmiimmmmmimmmmmhhimmmmiiiiiddammiiiiiimmmmiii00ccccccccccecc7777dddihhihmm6dddhimmddhhmmmmpmppp00.....................................',
      '..........2mmiimmmmmmmiimmmmmmiiimmmiihlmmmiimhiiddlmiiiiiihmmmmliif0ccccccceeecb7970addhiiihim6dddhimmhdhihmmmpmhmmpp0....................................',
      '........22mmiimmmmmmmiimmmmmmmiihimmhihimmmmiiiiiid1mmiiiiiiimmmmmii00ccceeeeecc79b1dd8hiihiiimm8dddihmmhdhhhmmmphhmmp00...................................',
      '.......2mmmiimmmmmmmiimmmmmmmimidfmmmhihhmmmiihiihdd1miiiiiiiimmmmmiil1ceeeeeccb9990ddiaiiiiiiim8dddhimmhddhhimmmdhimpp00..................................',
      '......2mmmiimmmmmmmiimmmmmmmiimidfmmmihhhimmiihiihda0mmiiiiiiimmmmmiimi0eeeeecc9b990ddiahiiiihhmadddhilmiddhhhmmmdhhmmp10..................................',
      '....22mmmiimmmmmmmiimmmmmmmiimmmiddmmmiihhmmmiiiiihddmmiimmmmmm010000mpmm11ecccccb0ddiimi10000ihm6dddiimmhddhhimmddhimmp0..................................',
      '...2mmmmiimmmmmmmiimmmmmmmiimmmmihddmmiiihhmmiihiiiid1mmmmmmmh0aaa880lldmmm0ccccc10iiiimm068880066hddiiimihddihmmmaiimmpp0.................................',
      '.22mmmmiimmmmmmmiimmmmmmmiimmmmmiiddmmmihhhmmmhihiihd0mmmli000aaaad80laadlm0ccccb1iiiidmmm688800h6hddihhmmiddhiimmadimmpp0.................................',
      '.2mmmmiimmmmmmmiimmmmmmmiimmmmmmmhhadmmiidiimmiiiiiidddaa0aaaaaddddd803hh6l1cccc00iimmmmmm08dddaddhfddiiimiidhiimmadimhmp00................................',
      '.2mmmiimmmmmmmiimmmmmmmiimmmmmmmmliaammiihhimmiiiiiiihdddddddddhdddhhd5666ah0cbb1immmmmm000ddddddhihddiihmiiddiihmadhmhmmp00...............................',
      '.2mmiimmmmmmmiimmmmmmmiimmmmmmimmmhhafmmihiiimmiiiiihhhdddhddddhidddhhd6ad88d1b1immmmmd06ddddddddhhhddihhmmidddiimddhidmmp00...............................',
      '.2miimmmmmmmiimmmmmmmiimmmmmmmiimmmhdfmmihdhimmmihiiiihiddhhddddhhdddhhd8ddddd00mmmmm00addddidddhhhhdddihimmdddiimhahidmmmp0...............................',
      '.2iimmmmmmmiimmmmmmmiimmmmmmmihimmmhhalmihdhimmmiiiiihhihhihddddhhdddhihdadddd0lmmm10adaddddidddhiihhdihihmmhddiiiiahiahlmpp022............................',
      '.2immmmmmmiimmmmmmmiimmmmmmmiihiimmhhadmihdhhmmmiihiihiiihhihdddhihdddhhhddfdd0mmm0aaadddddhidddiiihihdiihhmiddiiiiahaahlmmp0ai2...........................',
      '.2mmmmmmmiimmmmmmmiimmmmmmmiimihhimmhaamiidfiimmiiihhiiiiiihiidddhihdddihhdffd0mm1aaadddddhiiddiiiihihdiihihihddiiiahadhmimp0iii22.........................',
      '.2mmmmmmiimmmmmmmiimmmmmmmiimmhhiimmha8miiddiimmmiihihiiiihiiidddhihdddiiidfhdmmm1aaadddddhiiddhhiiiiihiihiiihddhiiaiaaimimp0iiiii2........................',
      '.2mmmmmiimmmmmmmiimmmmmmmiimmm0iiihmma8dihddiimmmiiiiiiiiiiiiiidddhihdddiiiddd1m1adaafddddhiidhiiiiiiiiiiiiimhddfihaiddimim10iiiiia22......................',
    ] },
  marc: { name: 'MARC', col: 40, face: [56, 38], eyes: [[43, 22, 49, 24], [58, 26, 65, 28]], mouth: [44, 45, 56, 45],
    pal: '0c0b18 0e0f1c 160f17 061945 1d161c 222028 04286e 2b2832 34282d 063386 073b95 073b99 073c99 053d9d 093d9a 5d312c 454050 0c4dbe 0d50c4 0d52c7 1052c5 565979 9c5b43 bf6647 a77e73 e08958 f28e59 f4955b f39f68 fda369 fcab6e fbba7f',
    rows: [
      '........................................1112vvvvvvvvv01.....................................',
      '....................................1144nsttqqqqquvvvvv01...................................',
      '..................................11mpsrpppqqqtttttsvvvvv1..................................',
      '.................................1npprpppqqquuuuuutttrrvvv01................................',
      '...............................10npptpprpquuuuvuuuttttrquvv01...............................',
      '.............................11pppsutrprruuuvvvvvuuttttrrvvvv1..............................',
      '............................110pppuuurrruuuuvvvvuuutttttquvvvv..............................',
      '...........................10npppuuurrrruuuuuvvuuuuttttttrrvvv1.............................',
      '..........................10nppppuuurrrruuuuuuuuuuuttttttqqqvvv1............................',
      '..........................1mppppuuuurrrtuuuuuuuuuuuttttttqqqqvv1............................',
      '.........................10mpppuuuuurrrruuuuuuuuuuuttttttqqqqqvv11..........................',
      '........................18fppppuururrrrrruuuuuuuuuttttttqqqqqpvv01..........................',
      '........................1mmpppuuurrrrrrrruuuuuuuuuttttqqqqqqqppvv01.........................',
      '.......................10fpppuuuurrrrrrrrruuuuuuuuqqttqqqqqqpppsvv1.........................',
      '........................1npppuuuuurrrrrrtuuuuuuuuutqqrqqqqqpppppvv1.........................',
      '........................0nnpppuuuurrrrruuuuuuuuuuuuttrqqqqqpppppsv11........................',
      '........................nnnppppuuurrrrruuuuuuuuuuuuttttttqqppppppvv1........................',
      '......................1fnnnnppprtprrrrupm8fnuuuuuuutttttuuuuutpppp0.........................',
      '......................0mmnpppprrrprrruf8n8888mmmmnptttttuuuuutupppp0........................',
      '......................10nnnppprrqpqrrf888842485488mutttttttttuupppp01.......................',
      '.....................014mmnppprrqrrpnmmmmmmmm010248mntttttrstuuvvpp11.......................',
      '...................1uuuuufmmprrrprrnmmmmmmmf44fmmf8mnppppnmfmruvvps00.......................',
      '..................1uuffuuufmprrrqrrmmfmm810120f4fmmmmnnnnfff2m8vvvp00.......................',
      '..................1uqfffttffnrrrqrrqpmff20408oof8fmmnnnnmff2228mvvv01.......................',
      '..................1ummmmfrrfnrrrrrqqqupnnu822vo4fffmuupnmffff22288vv1.......................',
      '..................0umfqmfptfnrrrrrnurtpmpnnnnmmffffpuurm804f4mmff8f01.......................',
      '..................0umttttfpfmprrrrtuuuurmffnnmmfffrruurf20022m8mmmf01.......................',
      '..................0untumfftfmprrrttuuuuuutrnmmpnqrrrtuqq08108o2mmmmo0.......................',
      '..................0untnffuummrsrpttuuuuuuurrrrturrrruutrffm40oo1mmm1........................',
      '..................1untnnfuumfsrsstttuuuuuurrrrttrrrrrutqmffmmmmmmm11........................',
      '..................1uqtnffqtmppssttnttruuuurrrrttrrrrrutrmmfffnnmfn01........................',
      '...................1tntqmftmmmrsttnsrrtrurqrppnnpqqrrruqmnnnnmmppn11........................',
      '...................1ttmuuutmnppsttssrrrqqqqnnmmqttqttvqqvppnnnppns11........................',
      '....................1quuutumnpsssssspqqqqnnnmmqtttttvvqqvmqttpppup11........................',
      '....................0uuutttmnpssssssppnnnnmmmnprttrrrrrqvmnttttpps11........................',
      '....................1qqqnmmfpppssssppnnnnnmmutmff2nnnnnnpunttttrps01........................',
      '.....................124fmmmpptpsppppnnnnmmuuutmfff4mmmnnvmpqtttq1..........................',
      '.....................1mmmffmnsrspsptppnnnsmmmnup88mfmmmffmmnppppr0..........................',
      '.....................1ppuffmppsrprpppppfmf5mfnfff5f458ffmnmmnppnu1..........................',
      '.....................0uuuffmmpspppppppfm888fppffm8244844fnnmnnnnp1..........................',
      '....................1nuuufffmpmpspppppff84fmmmnnnnpm2f484fmmnnnnp0..........................',
      '....................1vuuuf8ffmnmqpnpppf84208ooffffmmmnnm85fmmmnn2...........................',
      '...................01vuuf88fffmmmmppppm44mf0oovvvvfffmmnnff8mmnn2...........................',
      '...................01vuuf448fmmf8mmmmffffmrtn4ffvvvvooo0fm8fnmnn2...........................',
      '...................14uuumm288fffmf8ff848fmuttuvqffvvool00488nnns0...........................',
      '...................1vuutpp454m4m848f8f42fnptrpnsqqqqfmmfm488nnnn2...........................',
      '.........111010111.0vuuuppf54ff284458444fnnntqnmmnqqqnnmm58mmmmm0...........................',
      '.....1111kjjjhhjjj0pvuuuppp244fm4224454488nnnnpnnmmmmmnnf428mmm10...........................',
      '....10jjjjjjjjj6661vuuuuupp44458852484442ffmfm8mf8nnnnnm8544f8m1............................',
      '....1kjjkkkdjjj331pvruuuppp44444g48554g4288ff88888fffmmf42458881............................',
      '...11jj666adjijj30vrruuuuppp224484825g24m44ff882258ff8f84255481.............................',
      '...1jjj6666bajjjjk0rrruuuuppn22248252g55f4f888524454f54242855811............................',
      '..1kjjjjj369adhiii10rruuuupnnm224450255g4mff8f884248f8f2488488..............................',
      '..1aiiiijj336abbhiji0rruuuunnm4222528254448ffffff88f8f48f82821..............................',
      '.13djjjjiiii666aadjji1qruuttnnmf22482224f44f48fmf58f8fm5f57201..............................',
      '1ejjjjjjiiiij63acahii1srruuummmff228422445445f8888888f852g51................................',
      'jjjijiiiiiiiiii66aadiih1rrrttmmmf4124412255582f88254f5552g50................................',
      'jijjdecehiiiiiij669dbhi10qrrrrmmmf411142222482522g548522581.................................',
      'jidcceebbbaiiiiiih66acihh90rrqrmmmf421124252282252482244801.................................',
      'aaabbhhdecccdiiiiiha6aahhd10rrqpmmmf51111524g2254552252815..................................',
      '666636dddaaabddiiiiii369bdd11qqppmmff811111114522422528111..................................',
      '6611113339aaacccbiiiii6666bb10qpppmmfff10111111221255221jj11................................',
      '11kjja11133369bccbdiiiiid666aa1qppnmmffff4211111112111166jj10...............................',
      'jjjjjaaab1111366aabahiiiija969b0ppnnmmmmffff1111111506ja36jj11..............................',
      'jjjjjjjdbca66010366acddhhiii99331nnnnnmmmfffff422mm233dj636jj01.............................',
      'jjjjjjjjjad6a66133669aabakiihi69611nnnnmmmmfffffmns1336hh36jjj1.............................',
      'jjjjjjjjiidbae663116699babadiiih611nnnnmmmmmmmmmnsm1336ad36jjj1.............................',
      'jjjjkiiiiiibdba633113666aaaadihii611nnnnmmmmmmmnns213339e36jji0.............................',
      'jjjjeiiiiiiiiacb6336111136aacccahiha310nnmmmmmnnpp21133963jjih10............................',
      'iijhdiiikjiiiidab636931133666aaba1016d910fmmmnnppn2113333ijjah911...........................',
      'iieebbiijjiijiicece66ad66133666dc05521dd9111mnnppm21333djjjaab9111..........................',
      'eccbbbiiikiiiiicbicc6aid666113366615741ddhd612nnnf213djjjabca616jj111.......................',
      'dccchiiiiiiiiiiiccee66hija63310366127706adbhd6088406jjdd116a610ajjjj01......................',
      'bbbiiiiiiiiiiiiicceee6diiia66331133177519bbabh9121dhidc11506139djjjjjj11....................',
      '6abcciiiiiiiiiiiiceecc9jiiih966661115770666abdd91iidab61571166aejjjjjjjj10..................',
      'h66acciiiiibciiiiiecicaajiiida66a660557506669a61jiaa9631177066acbjjjjhjjjj1.................',
      'hh66aaiiiiichhiiiiccicacdiiikaa66aa155771003363hhd663011157119hechjjjbdijjj00...............',
      'iii66ackiiidediiiicchihhadiiiiaa66a61577063111dde6311333155719hebbdjjkaajjjjj1..............',
      'iiii66acediiebbiiiccekiidaiiijibd66607770dd99666333666661157099ibbckjiaedkjjjj1.............',
      'iiiijh66ediihcaaijkcejjijdahiiiiba6615770aikaaaad9aa6699607771ahhbbaajjbadjjjhj0............',
      'iiiiki69ahhiiaabdikceeiijkccdiiicc66155770jkjdabcd666dd96057719aeeaajjicbejjj6hj1...........',
      'akkdiji36caiiabccijceeiiijdcdiiiica6155751bjiibadce6ahi66117713eeeabeejkcadjj6aj11..........',
      'cciidiij3aadiibccdjicciiiiihadiiiiaa615750aciiijicceeid66615751eeidcbbjidcejjh3hj1..........',
      'bcijddii66caiibcceijkciiiiihacaiiicc615751ccaiiiiieceid66605771aaiidbadkjcchii3ejj11........',
      'abbii9cij63adjccccbkeeiiiiiihbcdiiib6155751ccdjjjihbbeeee6117771dhiihbddkhcdjja6bj11........',
      'bacdh9ajj639ciccccejjeekjjjjkdccaiida155770ecejjjiiiebeee6617770abjiheeakia6aji3bjj1........',
      'iaabh69hjj669jdcbbehjcbkkjkkjjbccijda115770eeedjjjiiieeee6610571aciiieeadia69ii3chj1........',
      'ibbb666akjj36jibcbeeibbkkkkkkjjccdiid615550cceeediiiiiiiec6115571aahjidebdea6dj39edj11......',
      'iibb936akij33hibcbeejidkkkkkjjjhbcdjh6157551ceecciiikkjjhe9615550achiiiccbbc69ia3eejj0......',
      'ijbb936aehj339idbceejjaekkkkjjkidachi6357771aeecdjiidcijjbb611550aceijiiccca96jc3eedi11.....',
      'chhca33aadik39idcceejjceekkkkkiiiiccd6617771abeeehjjacdjjbb6115551aeiiiicbcca6db33eci10.....',
      'ehida33a9aij36jccceejjcbekkkdkkiikeee6617751aeeeeejjaccijdc6115551eciiiicbeee6ee33ceh6115...',
      'ceee93339ahk339ccbee9kdeejkheekikkeeee615551deeeeedjkbahjde9611551eeeakkheeeeeae33cc6d01....',
    ] },
  aaron: { name: 'AARON', col: 32, face: [68, 40], eyes: [[53, 31, 61, 33], [71, 31, 78, 33]], mouth: [58, 49, 74, 50],
    pal: '000102 030204 060b13 0a0b14 0a0f18 10161f 131821 1e212b 22232d 1f252e 1e2532 202531 202533 222731 222733 1f2d3b 223545 4b2b24 3e4655 7f4b36 a25533 ba6841 e4834e d2966e ebb68e',
    rows: [
      '......................................................51000101ooooool100102......................................',
      '...................................................01111nooooonnlonnnooon111.....................................',
      '.................................................101noooonnonoooojnnononooo111...................................',
      '................................................11ooonnojjjloonoolnnnonjjnooo101.................................',
      '..............................................11oooljjjnnooooloojnoooooonlloooo10................................',
      '.............................................11onjjjjnooonnooonnnooooooooolnnnoo00...............................',
      '.............................................11onjjjjnnjjnoooolnooooonooooooooooo0...............................',
      '...........................................01nnnnnnnjjjjjjjohjlonoooonnoonnooooooo1..............................',
      '..........................................11ojjjjjnnnoonnjjjlnnnoooooooooonooooooo10.............................',
      '..........................................0oojjjjjnoojjnjnnooononnllollooooollooooo00............................',
      '..........................................0onjhhnjjjjjjnooooooonoooooooooooooojloooo0............................',
      '.........................................01onjjjjhhjjjjnnjjljhjjnnllllolnooooooljooo0............................',
      '.........................................00njjjj8jjjjjjhjjnjhjnonoojloooooooooolonoo0............................',
      '.........................................1onjjjjjjnjjjjjjjhhhlnooonojjjooooooonloono0............................',
      '........................................00olj8jjhnnnjkjjjhhhjhhnonoonooooojnnojjlonn1............................',
      '........................................01ljnjnljonlllljjkjhhlhjlonlljjjolooooonnlooo0...........................',
      '........................................10njjoojoojnklllkkjljkjlnjooojooojjjjjhhjhooo0...........................',
      '........................................00ojnnnooljlllllllkkmkhhhljlnjnjjjjhjjjjhjooo0...........................',
      '........................................0oloojookllllllllllllmljhhjjjjjjjmljjj88jjjoo0...........................',
      '........................................0ojnononnomlllllllmmmlmmjjlljljkjjjlkjjhjhjno00..........................',
      '........................................0oljoooooomllllllllmmmlmmlljjmkmmlkjjjjjkmnoo10..........................',
      '........................................0nlonooonmnlllllllmmmmmmmmmmmmmmllmmmmmkllooo00..........................',
      '........................................0oonolonnnlllllllmmmmmnnmmooonooommmmmmkllnoo00..........................',
      '........................................0onlolnnnnllllllmmmmmmooommmmmooommmmmmlllnoo00..........................',
      '........................................0olllonnllllllllmmmmmooooooooooooommmmlllkloo10..........................',
      '........................................0oljlnnjkjllllmmmmmmoooooooooooooonmmmmllkkno00..........................',
      '........................................0olljjjjjlllmmmmmmmmmmoooommmoooommmmmmmlljno00..........................',
      '.......................................10llljjjjklllmmhhjhlmmmmmmmmmmmmmmmmmlllmmljno10..........................',
      '......................................10nhjjjjjjjllmh33hh33113hmmmmmmmmk311hhhh3mmjno111.........................',
      '.....................................11nmmjjjjjjjllhhhhjhh33333hmmmmmlkk3313hjjjhmjnno101........................',
      '.....................................01nlmjhljljlllhhjkjh3333hhhjlmmljh3333hhjjjjljnmon01........................',
      '....................................10mjkllkjlljklljkjj111113hhhjmmmmhhh10033hjjjkjlmkk01........................',
      '....................................00mjljllkllllljjh11hn333nhhhkmooohhjn133n13jjkjmhhm10........................',
      '....................................00mklljlkjjlllkhhjklmnmkh1jhlmoookhhj33nnh3hjljjhjm10........................',
      '....................................00mjlljhkjjjllmmmmmkkmmlljlmlmooommllmmmllmmmljhjmm10........................',
      '.....................................01mlkhhkjjjllmmmmmmljjjmmmmlmooommmmjhjjlmmmmhhlm101........................',
      '.....................................01mlhhhljjjlllmmmnnnnnnmnmmmmooommmmmmmoommmmhhmm11.........................',
      '.....................................201mhhhljjjlllmmmnnnnnnmmmmlmooommmmmmoooommkhhon0..........................',
      '......................................01mhhhljjjkllmmmmnnnnnmmmmlmooommmmmooooommkmkm00..........................',
      '.......................................1lmkhjjjjkllmmmmmnnnmmmlmmmooomlmmmmmoommkjmm101..........................',
      '.......................................01llmhjjjkklmmmmmmmmmmmlmmmoooomkmmmmmmmmljmmm0...........................',
      '........................................01lkkkkkkkkmmmmmmmmmmmmmmmooommjlmmmmmmmkhom01...........................',
      '........................................01lllkkkkkklmmmmmmmmmmllkmmmmmlhllmmmmmlkhmm0............................',
      '.........................................0lllhkkkkkklmmmmmmmmmh11kkmlk3jnmmmmmmljjm11............................',
      '.........................................00llhkkkkkkklmmmmmmmmhjjhjjl13mmmmmmmmljjn01............................',
      '.........................................1100hlkkkkkklmmmmmmmmhhhhhj33hmmmmmmmmkjh11.............................',
      '..........................................10jhlkkkkkklmmmmmmmmlhhhhhhhmmmmmmmmljj001.............................',
      '..........................................00khlkkkkkklmmmmllmlmmhhhhhhmmmmmmmmkjk10..............................',
      '..........................................00ljlkkkkkkllmmmhkmmmmmjhhlnommkmmmmkkk00..............................',
      '..........................................00ljlkkkkkklmmlj336hhhhhjjhhhhh3hmmmkkk11..............................',
      '..........................................00llljkkkkkjklllm33hhhhhhhhhh31hkmmjkk00...............................',
      '..........................................00llljjkkkkjjkmmmmlmmmmmmoommmmmmmkjkk01...............................',
      '..........................................00llljjkkkkjjjkmmmlkmjkmmmomjkmmmkjjk100...............................',
      '..........................................00llllhjkkkkjjkmmmljjhhhhhhhjkmmmhjjj10................................',
      '.........................................000lllljhhjkkkjmmmlmmljhhjjhjmmmmljjkh0.................................',
      '.......................................10540llllkhhjjjkkkmmmmmmmooonommmmmjjjh00.................................',
      '.......................................14100lllllkhhhjjkkkmmmmmooonooommmmjjhm00.................................',
      '......................................1641l1lllllkjhhhjkkkmmmmmmoommommmmjhhhm00.................................',
      '....................................100600lllllllljjjhhhhklmmmmmmmmmmmmmmhhllm00.................................',
      '...................................011f50llllllllllkjjhhhjklmmmmllmmmmmmjhkkmm00.................................',
      '................................2001igg51llllllllllkkjjjhhhjllklklllmkkjhhkmmm000................................',
      '..............................0101gii5552lllllllllllkkjjhhjhhhjjjjjjjj66hkkmmm1i01...............................',
      '............................0110iiiic22550llllllllllkkkjjjjjjh666666666hkkkmmm1ii100.............................',
      '..........................110iiiiiiic245551llllllllllkkkjjjjjjjjjhhhhhhkkkkmmh0ii1i010...........................',
      '........................10011iiiiibeb455551llllllllllkkkkkjjjjjjjhhhhhhkkkkllh1ii1i100...........................',
      '......................0100iiiii9ebbbbbb25540lllllllllkkkkkkkjkjjjjhhhhhkkkkmmj00ie6ii0010........................',
      '....................0100iiiiiic9bd5bbbbd25551lllllllllkkkkkkkjkjkjhhhjkkkkkjjj00di1iii0000.......................',
      '..................1000iiiiiiabebbb4bbbbb255520lllllllllkkkkkkkkkjjhhhhkkkkkkjj009g17iiiii010.....................',
      '................0010iiiiiiiibbbbb94bbbb992554411llllllkkkkkkkjjkjhhhjkkkkkkjjj1e971ei4iiii0011...................',
      '................101iiiiiiabbbbbbb94bbbbbb2554441llllllkkkkkkkjjjjjjjjkkkkkjjj01db817i5iiiiii01...................',
      '.............1001iiiifebabbbbbbb244bbebbbd2544441lllllllkjkkjjkhjjjjkkkkkjjjj00d945bii2eeiiii0010................',
      '..........10001iiii7b7bbbbbbbbbb444bbeeeeb926444311lllllkjjkjjjjjjjjkkkkkjj1009b94bbbg26e7iiiii1001..............',
      '..........1000iiiiiiaibbbbbbeeee449bbeeeebe26444311lllllkkjjjjjjjjjkkkkkkjj1119b52ebbi22bbiiiii0010..............',
      '........01001iiiiiiiiibbbbbeeeee22bbbeeedeeb5266433001llljjjjjjjjjkkkkkljjh00be944ebbi52bbbgiabiii000............',
      '....11011iiiii9iiiieeebbeeeeeeee22bbbbeebbbbbb42634330111kjjjjjjjkkkkkkk11009be44bbbbbi25bbeii9eiiii00000........',
      '....010iiii9bbbbbbbeeebbeeeeeeee34bbbbeebbbbbbb2644333001kjjjjjjjlkkkkkj000bbe944bbbbbi24beeiii7iiiii10100.......',
      '..100iiiiiiiiiiibbbbbeeeeeeebbe22bbbbeeedeebbbbbe4113434444442101111114037ebb74bbbbbbbif55bbbii57iiiiiiii10100...',
      '.1000iiiiiiiiiiiebbeeeeeeeeebbe22bbbbeeeeeebbbbbe4122144444442000000004439bbe649bbbbbegf55ebebi59eiiiiiiii1100...',
      '.00iii54fiiibbbbeeeeeeeeeeeeeee22bbeeeeeeeeeebbbbb4411134444443444444444bbb444bbbbbbeeegb5bebbib5eebiiiiiiiii11..',
      '000ii9bb444ibbbbeeeeeeeeeeeede622bbeeeeeeeeedebbb9b444411144444444444449b4244bebbbeeeeeeb54bbbci5bbbeeiiiiiii0000',
      '01iibbbbeee2fibbbeeeeeeeeedeee22bbbeeeeeeeeeeeebbbbbe444442211000000113444bbebeeeeebbbbbe546bbei55eebeebgiiiiii00',
      'iiibbbbbeede57ibbeeeeeeeeeeeb649bbbbeeeeeeeeeeeeeee9bb774444444444444debbebbeeeeeeebbbbeb955beebb5eeebbbebiiii6ii',
      'iiibbbbbeded47iieeeeeeddedeee22bbbbbeeeeeeeeeeeedeeeebbb444444444444eeeeeebbdeeeeeeeebbeee555ebb956eebbebbiiii4ii',
      'iibbbbeedeeee26ieeeeeeeee4bbe22bbbbbbeeeeeeeeeeeeeedeebbb444444444dbbeeeeeeeeeeeeeeeeeeeed555bbbe55eeeeeeeiiii4ii',
      'iibbbbeeeeeeee47ibbeeedee4dbb27ggbbbbeeeeeedeeeeeedeeeebbd444444decbbeeeeedeeeeeeeeeeeee9e955bbee95beeeeeeiige7ii',
      'ibbbbbeeeeeebbb2bbbbbbebe4b992g9bbebbeeeeeeeeeeeeeeeeebbbbeeeeeee9bbbbeeeeeeeeeeeeeeeeeeeeee55beeb5eeeeeeeebi67i7',
      'fbbbbbeedeee9bb94bbbbeebe49b4gbbb4beb55eeeeeeeeeeeeeeedeededdeeedeeeedeeeeedeeeeeeeeeeeeeeeee55beebeeeeeeeeei29ib',
      'bbbbeeeeeeeebbbb44bbbeeb549b7ge7ebbb655eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee559eeeeeeeeeeebg27i9',
      'ebbeeeeeeeeebbbeb2beeebb459abeb4bbbb5eeeeeeeeeeeeeeeeeeeeeeeeeeebeeeeeeeeeeeeeeeeeeeeeeeeeeeee55bbeeeeeeeeeee27bb',
      'eeedebeeeeedeeded24bbbbb4544be46bbb5beeeeedeeeeeedeeeeeeeedeeede9eeeeeeedeeeeeeeeeeeeeeeeeeeee55bbeeeeeeeeeeb29bb',
      'eeeeeebeeeeeeeeee24bbbeb4542be47b965eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee449beeeeeebeeed2bbb',
      '5deeed5deeededede929bbe64129b5499e55edeeeeeeeeedeeeeedeedeeeeeeeeeeeeeeeeeeeedeeeeeeeeeeeeeeeed54beeeee5eeebd2bbb',
      '56eeee55eeeeeeeeed22dbe2407ee2bbb559beeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee55beeee56ebed4bbb',
      '656eeeb55deededede94bbb241de449b459bbeeeeedeedeeeedeeeeeeeeeeeeeedeeeeeeeedeeeeeeeeeeeeeeeeeeeeed46eeee44eed2ebeb',
      '5566deeb555eeeb5ebe22e620db92eb4dbbbedeeeeeeeeeeeeeeeeeeeeeedeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeedeeee44eeee45ee92bbbb',
      '55655eeeb555eebd5ebb19530b444b444bbbeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeedeeeeeeeeeeeeeeeeeee944bbe26be92bbbb',
      'ed6555bbee554ebee4be22610b227429bbbbeeeeeedeeeeeeeeeeeeeeeeeeeeeeeeedeeeeedeeeeeeeeeeeeeeeeeeeeee944bb726bd25bbbb',
      'eeeebb6eeee444beb449914014445229bbbbeeeeeeeedeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee71bb247b22ebbbb',
      '6eeebb6bdeeb44e9e44990304444426bb9eebdedeeeeeeeeeeeeeeeeeeeedeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeddb2eb13be429eedb',
      '55ebedbeeebbb444b7448110424412e9a965beeeeeeeeedeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeb22b049222beeeb',
    ] },
  chris: { name: 'CHRIS', col: 27, face: [44, 42], eyes: [[27, 31, 33, 33], [43, 26, 49, 28]], mouth: [36, 50, 48, 47],
    pal: '090708 0e0d0e 151515 1d1d1f 1d1f22 211e1f 372e2b 82402f a5583f ab6d53 d06d50 d97a58 ec8163 ee8866 ee8c66 a4aab0 f4906c ee9474 f29674 f59572 fca884 eae1d6 f9f1e7 faf3e9',
    rows: [
      '.......................................................................................',
      '.................................1111111111............................................',
      '..............................0016666766766010.........................................',
      '...........................0006666676676676766001......................................',
      '..........................166666767777678777766660.....................................',
      '.........................06666777777877777779876771....................................',
      '........................166767777877778789788a887770...................................',
      '.......................0667677777798897988a8aa8a97701..................................',
      '......................16676777789888a8988898agea8a8760.................................',
      '.....................16666787789898989a99accgkkkka8771.................................',
      '....................16677777779888a8899ddddgkkkkkk88771................................',
      '...................06677678779899889ggddddddkkkkkkka8771...............................',
      '...................06677787898889gggjjddddeddkkkkkkaa771...............................',
      '...................06777788bgjjjjjgjjjjdddeeeeekkkkca9770..............................',
      '..................077777gjjjjjjjjjjjjjjdddeeeeeekkkgba870..............................',
      '..................078acejjkkkgjjjjjjjjjjdddeeeeekkkkeaa871.............................',
      '.................077kjddjkkkkjjjjjjjjjjddddddeeeehkkgeb981.............................',
      '.................078keeekkkkkjjjjjjjcddddddddeeeeekkgeb881.............................',
      '.................07kkeeekkkkkkjjjjddddddjjjddddeekkkggaa981............................',
      '.................07kieeekkkkkkjgddggggdjjjjdddeejkkkggbb980............................',
      '................07kkieeekkkkkgddddjjjjkkjjgdeeggjkkkggga980............................',
      '................07kkdedekkkjgdgjjjdggkkkjjddjjgebbkkjggaa90............................',
      '................07kkdddgkjjjgjjjjjddjjkjjddb99888bbkjjgba91............................',
      '................08kkdddggjkkkkkjjjddjjjdda87667888aajjgga87101.........................',
      '.................18kdeeeekkkkkkjjjdddddc876668acdeeeejjge971kk1........................',
      '.................09kddddkkkkkkjjjdddbdaa8778aa7bbbeeejjjg98gkj01.......................',
      '.................19keddekkkjjjeeccddaaa888887788887aejjjj8bjd7j0.......................',
      '.................0akeddjkkjga7778aaaaaa88877019912779bejj8jj77a0.......................',
      '.................19ijdekkaa8766778aaaaa887796149bggjjikjjaaj77701......................',
      '.................0aajdea86678677788akgg877695cdjjj88bkekjda7a7710......................',
      '..................1aidba786aa876666bkkgj7888aa877adjikiejdb7cg8d0......................',
      '..................0aidb8bcca70125768kddjb887778acddggkikgeb77ggg0......................',
      '..................0ajeeadd820f06f678jddggb888aabddggjkkkjed77aga0......................',
      '..................1aieedd7274426888ajddcddcaaacdddgjkkkkjed777ja0......................',
      '.................019iegg867bggga88aacjgcdddccccdgdgjkkkkjeea77jc0......................',
      '.................kj7kgjj6ajj8c888abbcgdccddgcccddgdgjkkjjeea77cc0......................',
      '................0jjgbiedkkajgcccbggccggdccdcc88aaccdddjjeeee8jc0.......................',
      '................077gbjdkkckjddcgjjjcgjkjcckck8888aadddddeeee8gc0.......................',
      '................0c77bidkkjjjjjjjjjccckkjcacdk8a877aacdddeeeeecj0.......................',
      '................0c7abickjjkjjjjjj8jjccbbaabdd8aaa88aaadceeeeecjj0......................',
      '................1c7g8icjjkkkkjjjaakkcaaaab727jdaaa88aagcceeeeajg1......................',
      '.................07g7icckkkkkjjca8kgc26887888gddaaa878aedeeee8cg0......................',
      '.................08g78ccjkkkjjca888b57788888ccdddcaaa7aggceee8aa1......................',
      '.................0cg77ccjjkjjcba88jj88888888bcdgggcaaaadgceee901.......................',
      '..................1b77eccjjjjba87bjjedaa888bbg7g6gc7aadegceeea0........................',
      '..................0ca78ccdccbaa78ageggjjgga77777611aaaeeeeeeea81.......................',
      '..................0ccj8cccccbaa7acgjjgaa77779lhl928caabgeeeeea80.......................',
      '...................0gd8cccccaa78bggja877997lklhk6ajdaabeeeeeb9b0.......................',
      '...................0dj8cccbcca7abgg8779kllllk968bjjddabeeeebb9c0.......................',
      '...................0djd8ccbcca7bba517kllllh97acjjjjdddbeeeebb9e0.......................',
      '...................1cgd8ccccdd8bb8119khb8778dcjjjjjdddbeeebb9ae01......................',
      '....................1a81acccdeeabaagdddkjjdddccdjjjdddgggcba9de00......................',
      '.....................100acccceeaaacgggjjdddcabbddjjdddgggbb99ee1.......................',
      '.......................11ccccgeebacdjjdcdbbabbbddddddggedb99beek1......................',
      '.......................10ccccdeedbcddjjdbbaaabbbcddddgggbb99ceek01.....................',
      '........................1aaccaegeecdddddbbbbbbbbjjjdgggbb99bdeek1l01...................',
      '........................01aacabggegdddddbbbbbddjjjjdggbb99beeeeealm0...................',
      '.........................18aabbbggggdddddgjgddgjjjjjegb89bbeeeeea0mn1..................',
      '..........................18abbbbeggggdddjjjdddddjjjebb99beeeeeee0mm1..................',
      '...........................188bbbbbgggddkkkddbbbddcdba99bbeeeeeed1mml1.................',
      '............................187bbbbbgggjkkgdbbcbcbdaa89bbbeeeeee1lmmm11................',
      '.............................1877bbbbbgjjjgcbbbbbbaa78bbbeeeeeee1mmmmm011..............',
      '............................1l1a87b88bbcccbbbbbbba878aaabeeeeee80nmmmm1061.............',
      '...........................00m1aaa7778bbbbbbbbb897788aabeeeeeee1lmmmmmf16601...........',
      '.........................1160lm0aa887778bbbb88877788aabaeeeeeeb1nmmmmmf06666011........',
      '.......................006661fml0aa8887777777777888aaabeeeeeeb8mmmmmmlf0666666600......',
      '.....................01666661flmf1aa888877778888888bbbeeeeeec80lmmmmmlf136666666610....',
      '...................1166666631flmm0aaa8888888888888aabdeeeeeca1fmmmmmmff034666666666101.',
      '................1106666663311fllm18aaa8888888888aaaaeeeeeeaa81mmmmmnmff1334446666666661',
      '..............116666666633311fflnm08aaa888aaaaaaaaaeeeeeeaa81mmmmnmnnf91334444446666666',
      '...........116666666653333211fflmmm08aaa888aaaaaaadeeeeeca81mmmmmmnnff13344444453466666',
      '.........00106666633333333121ffllmmm08aa8888aaaaaddeeeeaa81mmmmmmmmnff13354444444554466',
      '.........006666443333333322221fllmmmm01888888aaadddeeaaaa0mmmmmmmmnmff13444444444444444',
      '......011666663334333333322221fflmmmmml1888888aaaddaaaa81mmmmmmmmmnmff13444444444444445',
      '....00mll6664333344433332222211fllmnmmmn10888888aaaaaa80nmmmmmmmmnmff133344444444444444',
      '.110mmlll6633333344453332222231fllmmnnnnmmm00888888881nmmmmmmmmmmnnff133345444444544444',
      '01lmllnmn6633333444443322222331fflmmmnmnnmmmm00888810mnmmmmmmmmnnnfff133544444444444444',
      '1mmlmmmmf16333333444443222233311flmmmmmnnnmmmml1110mnmmmmnmmmmmmmnff1333444444444444444',
      'mllmmmmmf06333333444452222233321fflmmmmmmmnm1110ll1111lnmmmmmmmmnnff1333444444444444444',
      'lmmmmmmml06334333334442222233331fflmmmmmmnm211110133311fnnmmmmmmnnff1334444444444444444',
      'mmmmmmmml163333333335222222333311fllmmmmmm01336666666311fnnmmmmnnmf13333444444444444444',
      'mmmmmmmmmf13333333333222222333331fllmmmmm1113333366666111fmmmmmmmff13333444444444444444',
      'mmmmlmmmmf13333333333222222333331flllmmm112223333366661117fmmmmmmff13333544444444444444',
      'mmmmllmmmf13333333332222222333333ffllmmf71222233336663120f7fmmmmmf133333444444444444444',
      'lmmmlllmmf133333333322222233333331fllmm6ff12222333666211fff7fmmmff133333344444444444444',
      'lmmmllllml133333333322222233333331ffll7fff1222223336311fffff7fnmff133333345454454444444',
      'lllmllllmm1333333333222222333333331fllfffff122222336211ffllff99mf1433333334445444444344',
    ] },
};
const C_AL = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
for (const id in CINE_PEOPLE) {
  const P = CINE_PEOPLE[id], w = P.w = P.rows[0].length, h = P.h = P.rows.length;
  const rgb = P.pal.split(' ').map(q => [parseInt(q.slice(0, 2), 16), parseInt(q.slice(2, 4), 16), parseInt(q.slice(4, 6), 16)]);
  const pack = (r, g, b) => (255 << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255);
  // as drawn under the lamp; by candle light with the lamp out; in the green light of a vision (index 0 = nothing)
  P.lit = { N: Uint32Array.from([0, ...rgb.map(([r, g, b]) => pack(r, g, b))]),
    D: Uint32Array.from([0, ...rgb.map(([r, g, b]) => pack(r * 0.6 + 4, g * 0.52 + 4, b * 0.58 + 16))]),
    G: Uint32Array.from([0, ...rgb.map(([r, g, b]) => pack(r * 0.42 + 2, g * 0.74 + 10, b * 0.46 + 8))]) };
  const g = P.g = new Uint8Array(w * h); P.rows.forEach((r, j) => { for (let i = 0; i < w; i++) g[j * w + i] = r[i] === '.' ? 0 : C_AL.indexOf(r[i]) + 1; });
  P.blinkM = new Map(); P.talkM = new Map();
  for (const [x0, y0, x1, y1] of P.eyes) for (let x = x0; x <= x1; x++) { const lid = g[(y0 - 1) * w + x]; for (let y = y0; y <= y1; y++) P.blinkM.set(y * w + x, y === y1 && x > x0 && x < x1 ? 1 : lid); }
  { const [x0, y0, x1, y1] = P.mouth; for (let x = x0; x <= x1; x++) { const yl = Math.round(y0 + (y1 - y0) * (x - x0) / Math.max(1, x1 - x0)); P.talkM.set((yl + 1) * w + x, 1); for (let r = 2; r <= 5; r++) P.talkM.set((yl + r) * w + x, g[(yl + r - 1) * w + x]); } }
}
// who plays which hero
const PLAYER_OF = { warrior: 'marc', mage: 'aaron', ranger: 'chris' };
const CLASS_WORD = { warrior: 'WARRIOR', mage: 'MAGE', ranger: 'RANGER' };

// ---------------------------------------------------------------- the scene's buffers
// The room is drawn once as palette indices (cS0; 0 = the map, where the game shows; +EMIS = its
// own light) with cF0 = the light level of things lit as one piece (props; 0 = lit by the light's
// field with a dither), then baked to colours three times: cCN under the lamp, cCD with the lamp
// out (candles and the map's glow), cCG the same in green. Each frame cC starts as one of them (or
// a dither of two, while the light changes) and the moving things are drawn into it as colours.
// cGame is the game's own picture (kept from the last frame the world was drawn), cMini the same at
// a third of the size, for the map while the camera is not on its way into it.
let cW = 0, cH = 0, cS0 = null, cF0 = null, cCN = null, cCD = null, cCG = null, cC = null, cGame = null, cGameOK = false, cMini = null, cMiniOK = false, cCL = null, cCLg = null, cGeo = null;
let cXa = null, cXw = null, cGx = null, cGhost = null;
let cWallM = null, cWallOn = false;   // 1 where a vision may show: the back wall and what hangs on it (cleared by everything drawn after)
let cT = null, cTF = null, cFl = 0, cDyn = false;   // what the drawing calls write into, at which flat light; cDyn: straight into this frame's colours
const C_ID = 5, C_LEVELS = 8;   // the scene's own light table: level 5 is each colour as drawn
function cineLightTable() {
  cCL = new Uint32Array(C_LEVELS * NPAL); cCLg = new Uint32Array(C_LEVELS * NPAL); cGhost = new Uint32Array(NPAL);
  for (let i = 1; i < NPAL; i++) {
    const ramp = PAL_RAMPS.find(r => r.includes(i)), chain = ramp ? [...TAIL, ...ramp] : TAIL, pos = chain.indexOf(i);
    for (let L = 0; L < C_LEVELS; L++) {
      const j = pos < 0 ? i : chain[clamp(pos - (C_ID - Math.min(L, C_ID)), 0, chain.length - 1)];
      let r = PR[j], g = PG[j], b = PB[j];
      if (L > C_ID) { const w = (L - C_ID) / 2; r = r * (1 + 0.14 * w) + 10 * w; g = g * (1 + 0.07 * w) + 3 * w; b = b * (1 - 0.1 * w); }   // toward the lamp: brighter, warmer
      else if (L < C_ID && j > 1) { const c = (C_ID - L) / C_ID; r *= 1 - 0.18 * c; g *= 1 - 0.06 * c; b = b * (1 + 0.08 * c) + 6 * c; }   // away from it: cooler
      const P = (r, g, b) => (255 << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255);
      cCL[L * NPAL + i] = P(r, g, b); cCLg[L * NPAL + i] = P(r * 0.74, g * 0.98 + 5, b * 0.76);
    }
    // a vision's colours: the sprite's light and dark kept, in green
    const l = (PR[i] * 0.3 + PG[i] * 0.59 + PB[i] * 0.11) / 255; cGhost[i] = PAL32[[53, 53, 54, 55, 124][Math.min(4, Math.floor(Math.pow(l, 0.75) * 5.4))]];
  }
}
const cHash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// drawing into the scene (all in detail pixels; outlines are 2 wide, one "cell" of the players' portraits)
function cP(x, y, c) { if (x >= 0 && y >= 0 && x < cW && y < cH) { const o = y * cW + x; if (cDyn) cC[o] = (c & EMIS) ? PAL32[c & 127] : cCL[(cFl || C_ID) * NPAL + c]; else { cT[o] = c; cTF[o] = cFl; if (cWallOn) cWallM[o] = 0; } } }
function cR(x, y, w, h, c) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) cP(x + a, y + b, c); }
function cRound(x, y, w, h, r, c) { for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) { const dx = Math.min(a, w - 1 - a), dy = Math.min(b, h - 1 - b); if (dx + dy >= r) cP(x + a, y + b, c); } }
function cFrame(x, y, w, h, c, t = 2) { cR(x, y, w, t, c); cR(x, y + h - t, w, t, c); cR(x, y, t, h, c); cR(x + w - t, y, t, h, c); }
function cEll(cx, cy, rx, ry, c, c2 = -1) {   // c2: the shade of its lower right
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const d = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (d <= 1) cP(cx + x, cy + y, c2 >= 0 && x / rx * 0.5 + y / ry > 0.42 ? c2 : c); }
}
function cEllO(cx, cy, rx, ry, c, c2 = -1) { cEll(cx, cy, rx + 2, ry + 2, BLK); cEll(cx, cy, rx, ry, c, c2); }
function cTrap(y0, y1, l0, r0, l1, r1, c) { for (let y = y0; y < y1; y++) { const k = (y - y0) / Math.max(1, y1 - y0 - 1), l = Math.round(l0 + (l1 - l0) * k), r = Math.round(r0 + (r1 - r0) * k); cR(l, y, r - l, 1, c); } }
function cLine(x0, y0, x1, y1, c, w = 2) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), h = w >> 1; for (let s = 0; s <= n; s++) { const k = n ? s / n : 0; cR(Math.round(x0 + (x1 - x0) * k) - h, Math.round(y0 + (y1 - y0) * k) - h, w, w, c); } }
function cLineO(x0, y0, x1, y1, c, w) { cLine(x0, y0, x1, y1, BLK, w + 4); cLine(x0, y0, x1, y1, c, w); }
function cText(s, x, y, c, z = 1) { for (let n = 0; n < s.length; n++) { const g = FONT[s[n]] || FONT['?']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') cR(x + (n * 4 + q) * z, y + r * z, z, z, c); } }
function cDie(cx, cy, r, label, z, ramp = RED) {   // a twenty-sided die, seen flat: a hexagon with a lit and a shaded facet
  for (let pass = 0; pass < 2; pass++) { const R = pass ? r : r + 2;
    for (let y = -R; y <= R; y++) { const hw = Math.round(R * 0.88 * (Math.abs(y) < R / 2 ? 1 : 1 - (Math.abs(y) - R / 2) / (R / 2) * 0.98));
      for (let x = -hw; x <= hw; x++) cP(cx + x, cy + y, !pass ? BLK : x + y * 0.8 < -r * 0.45 ? ramp[4] : x + y * 0.8 > r * 0.55 ? ramp[2] : ramp[3]); } }
  if (label) cText(label, cx - Math.floor((label.length * 4 - 1) * z / 2), cy - Math.floor(5 * z / 2), 27, z);
}
function cSkull(cx, cy) {
  cEllO(cx, cy, 9, 8, 26, 25); cR(cx - 7, cy + 5, 14, 9, BLK); cR(cx - 5, cy + 5, 10, 7, 26);
  cR(cx - 6, cy - 2, 4, 5, BLK); cR(cx + 2, cy - 2, 4, 5, BLK); cR(cx - 1, cy + 3, 2, 3, BLK);
  for (let k = -1; k <= 1; k++) cR(cx + k * 3 - 1, cy + 9, 1, 3, 24);
}
// a person's portrait, a pixel a cell, straight into this frame: in palA's light, or a dither of palA and palB
function cineBust(P, x, y, palA, palB, mix, clipY, blink, mouth, fadeY = 1e9) {
  const g = P.g, w = P.w, bl = blink ? P.blinkM : null, tk = mouth ? P.talkM : null;
  for (let j = 0; j < P.h; j++) {
    const Y = y + j; if (Y < 0) continue; if (Y >= clipY || Y >= cH) break;
    const by = (Y & 3) << 2, row = Y * cW;
    for (let i = 0; i < w; i++) {
      const k = j * w + i; let c = g[k]; if (!c) continue;
      if (bl && bl.has(k)) c = bl.get(k); if (tk && tk.has(k)) c = tk.get(k);
      const X = x + i; if (X < 0 || X >= cW) continue;
      if (Y >= fadeY && BAYER[by | (X & 3)] >= (clipY - Y) / (clipY - fadeY)) continue;
      cC[row + X] = (mix > 0 && BAYER[by | (X & 3)] < mix ? palB : palA)[c];
    }
  }
}
// one of the game's own sprites as a vision: green, `k` times its size, its feet at (x, y), behind
// everything in front of the back wall; a: how much of it shows (a dither; under 1 it is see-through)
function cineGhost(sp, x, y, k, clipY, a) {
  const X0 = Math.round(x - sp.ax * k), Y0 = Math.round(y - sp.ay * k), bright = PAL32[72];
  for (let j = 0; j < sp.h; j++) for (let q = 0; q < k; q++) {
    const Y = Y0 + j * k + q; if (Y < 0) continue; if (Y >= clipY || Y >= cH) break;
    const by = (Y & 3) << 2, row = Y * cW, srow = j * sp.w;
    for (let i = 0; i < sp.w; i++) { const v = sp.data[srow + i]; if (!v) continue; const c = (v & EMIS) ? bright : cGhost[v & 127];
      for (let p = 0; p < k; p++) { const X = X0 + i * k + p; if (X < 0 || X >= cW || !cWallM[row + X] || BAYER[by | (X & 3)] >= a) continue; cC[row + X] = c; } }
  }
}

// ---------------------------------------------------------------- the room, built once
function cineBuild() {
  cW = OW; cH = OH; const N = cW * cH;
  cS0 = new Uint8Array(N); cF0 = new Uint8Array(N); cCN = new Uint32Array(N); cCD = new Uint32Array(N); cCG = new Uint32Array(N); cC = new Uint32Array(N); cGame = new Uint32Array(N); cGameOK = cMiniOK = false;
  cXa = new Int32Array(cW); cXw = new Int32Array(cW); cGx = new Int32Array(cW); cWallM = new Uint8Array(N); cWallOn = false;
  if (!cCL) cineLightTable();
  const cx = cW >> 1, mw = cW / 3, mh = cH / 3, mhI = Math.ceil(mh);
  const top = Math.round(24 + Math.max(0, cH - 120 - (304 + mhI)) * 0.5);   // the room sits in the middle of what the caption bars leave
  const D = CINE_PEOPLE, dY = top + 58, sT = dY + 80, tY = sT + 62, sB = tY + 6, tW = 304, tX = cx - tW / 2, tH = mhI + 84, mX = Math.round(cx - mw / 2), mY = tY + 42, wallB = tY - 8, lampB = top + 26;
  const seat = {
    dave: { x: cx - D.dave.face[0], y: dY, clipY: sT - 2, ph: 0 },   // (round 89's first Dave was half again the others' size and hand-fattened; the user: way too big, then: still too fat. Now his portrait as drawn.)
    marc: { x: 0, y: tY + 74, ph: 1.9 },   // (the players sit against the screen's edges: their portraits end there)
    aaron: { x: cW - D.aaron.w, y: tY + 12, ph: 3.1 },
    chris: { x: cW - D.chris.w, y: tY + 146, ph: 4.4 },
  };
  for (const id of ['marc', 'aaron', 'chris']) { seat[id].clipY = seat[id].y + D[id].h - 4; seat[id].fadeY = seat[id].clipY - 18; }   // their portraits' lower edges sink into the chair's shadow
  const face = {}; for (const id in seat) face[id] = [seat[id].x + D[id].face[0], seat[id].y + D[id].face[1]];
  const candles = [[cx - 116, tY + 20], [cx + 116, tY + 20], [tX + 30, tY + tH - 112], [tX + tW - 30, tY + tH - 100]];
  const bulbs = []; for (let k = 0; k < 17; k++) { const u = (k + 0.5) / 17, x = Math.round(16 + u * (cW - 32)); if (Math.abs(x - cx) > 14) bulbs.push([x, Math.round(20 + Math.sin(((u * 4) % 1) * Math.PI) * 9), [51, 23, 55, 40][k % 4]]); }
  cMini = new Uint32Array(mw * mhI);
  const g = cGeo = { cx, top, tX, tY, tW, tH, mX, mY, mw, mh, mhI, sT, wallB, lampB, seat, face, candles, bulbs };
  cT = cS0; cTF = cF0; cFl = 0; cDyn = false;
  // the wall: stone blocks, a beam along the top, a rail where it meets the floor
  for (let y = 0; y < wallB; y++) { const row = (y / 16) | 0, off = (row & 1) * 20; for (let x = 0; x < cW; x++) { const h = cHash(row, ((x + off) / 40) | 0); cS0[y * cW + x] = (y % 16 < 2 || (x + off) % 40 < 2) ? 65 : h < 0.14 ? 68 : h > 0.86 ? 66 : 67; } }
  cR(0, 0, cW, 16, BLK); cR(0, 0, cW, 14, 34); cR(0, 10, cW, 4, 33); for (let x = 30; x < cW; x += 96) cR(x, 2, 2, 8, 33);
  for (const [x, y] of bulbs) cR(x, 14, 1, y - 14, 3);   // the string lights' drops (the bulbs light up each frame)
  cR(0, wallB - 10, cW, 10, BLK); cR(0, wallB - 8, cW, 6, 34); cR(0, wallB - 8, cW, 2, 35);
  // the floor: boards
  for (let y = wallB; y < cH; y++) { const row = ((y - wallB) / 24) | 0, off = (row * 97) % 180; for (let x = 0; x < cW; x++) { const h = cHash(row + 50, ((x + off) / 180) | 0); cS0[y * cW + x] = ((y - wallB) % 24 < 2 || (x + off) % 180 < 2) ? 98 : cHash(row * 5 + 1, (x / 14) | 0) < 0.1 ? 98 : h < 0.3 ? 100 : 99; } }
  // a rug under the table and the chairs, with a border of diamonds
  { const x0 = tX - 100, w = tW + 200, y0 = tY + 12, h = tH + 50; cRound(x0, y0, w, h, 8, BLK); cRound(x0 + 2, y0 + 2, w - 4, h - 4, 7, 20); cFrame(x0 + 8, y0 + 8, w - 16, h - 16, 49); cFrame(x0 + 22, y0 + 22, w - 44, h - 44, 21);
    const dia = (x, y) => { for (let d = -4; d <= 4; d++) cR(x - (4 - Math.abs(d)), y + d, (4 - Math.abs(d)) * 2 + 1, 1, 50); };
    for (let x = x0 + 30; x < x0 + w - 20; x += 28) { dia(x, y0 + 16); dia(x, y0 + h - 17); } for (let y = y0 + 44; y < y0 + h - 30; y += 28) { dia(x0 + 16, y); dia(x0 + w - 17, y); } }
  // on the wall. Left: a window on the night, a poster. Right: two shelves, a shield over crossed swords.
  { const x0 = 26, y0 = Math.max(22, top - 68), w = 78, h = 84; cFl = 4; cR(x0, y0, w, h, BLK); cR(x0 + 2, y0 + 2, w - 4, h - 4, 35); cFl = 0;
    for (let y = 0; y < h - 12; y++) for (let x = 0; x < w - 12; x++) cP(x0 + 6 + x, y0 + 6 + y, (y > (h - 12) * 0.62 ? 126 : 37) | EMIS);
    cEll(x0 + 50, y0 + 26, 9, 9, 32 | EMIS); cEll(x0 + 54, y0 + 23, 7, 7, 37 | EMIS);   // a crescent moon
    for (let k = 0; k < 7; k++) cP(x0 + 10 + ((cHash(k, 71) * 54) | 0), y0 + 10 + ((cHash(k, 72) * 34) | 0), 31 | EMIS);
    cTrap(y0 + h - 30, y0 + h - 6, x0 + 6, x0 + 30, x0 + 6, x0 + 44, 52 | EMIS); cTrap(y0 + h - 22, y0 + h - 6, x0 + 46, x0 + 60, x0 + 38, x0 + w - 6, 52 | EMIS);   // dark trees against it
    cFl = 4; cR(x0 + w / 2 - 2, y0 + 2, 4, h - 4, 34); cR(x0 + 2, y0 + h / 2 - 2, w - 4, 4, 34); cR(x0 - 4, y0 + h, w + 8, 6, BLK); cR(x0 - 2, y0 + h, w + 4, 4, 35); }
  cFl = 4;
  { const x0 = 20, y0 = top + 36, w = 92, h = 116; cR(x0, y0, w, h, BLK); cR(x0 + 2, y0 + 2, w - 4, h - 4, 26); cR(x0 + 6, y0 + 6, w - 12, h - 12, 20);
    cText('ROLL', x0 + w / 2 - 15, y0 + 12, 51, 2); cDie(x0 + w / 2, y0 + 58, 22, '20', 2); cText('OR DIE', x0 + w / 2 - 23, y0 + 94, 27, 2); }
  for (const [sy, n] of [[top - 6, 7], [top + 62, 5]]) {
    const sx = cW - 138; cR(sx, sy, 112, 8, BLK); cR(sx + 2, sy + 2, 108, 4, 35); cR(sx + 10, sy + 8, 4, 8, 33); cR(sx + 98, sy + 8, 4, 8, 33);
    let bx = sx + 6;
    for (let k = 0; k < n; k++) { const h = cHash(sy, k), w = 10 + ((h * 3) | 0) * 2, bh = 26 + ((cHash(k, sy) * 4) | 0) * 4, c = [21, 38, 54, 57, 49, 29, 110][(cHash(k + 9, sy) * 7) | 0];
      cR(bx, sy - bh, w, bh, BLK); cR(bx + 2, sy - bh + 2, w - 4, bh - 2, c); cR(bx + 2, sy - bh + 8, w - 4, 2, 51); cR(bx + 2, sy - 8, w - 4, 2, 51); bx += w - 2 + (h > 0.7 ? 8 : 0); }
    if (n === 5) cSkull(sx + 94, sy - 14);
  }
  { const x = cW - 82, y = top + 122; for (const s of [-1, 1]) { cLine(x - s * 30, y - 28, x + s * 30, y + 28, BLK, 8); cLine(x - s * 30, y - 28, x + s * 30, y + 28, 31, 4); cLineO(x - s * 30 - s * 7, y - 18, x - s * 30 + s * 9, y - 34, 49, 4); }
    cEllO(x, y, 22, 24, 21, 20); cEll(x, y, 16, 18, 22, 21); cR(x - 1, y - 20, 2, 40, 49); cR(x - 18, y - 1, 36, 2, 49); cEllO(x, y, 5, 5, 50, 49); }
  cWallM.fill(1, 0, wallB * cW); cWallOn = true;
  // the lamp over the table (its bulb is lit each frame, while the lamp is on)
  cFl = 6; cR(cx - 1, 14, 2, top - 6, 3);
  cTrap(top + 4, top + 26, cx - 16, cx + 16, cx - 40, cx + 40, BLK); cTrap(top + 6, top + 24, cx - 14, cx + 14, cx - 37, cx + 37, 54); cTrap(top + 6, top + 24, cx - 14, cx - 7, cx - 37, cx - 24, 55);
  cFl = 3; cEll(cx, top + 27, 9, 4, 25);
  // Dave's chair: a tall red back with wings
  cFl = 4; cRound(cx - 70, dY - 22, 140, sT - dY + 60, 18, BLK); cRound(cx - 68, dY - 20, 136, sT - dY + 56, 17, 20); cRound(cx - 58, dY - 10, 116, sT - dY + 40, 12, 21);
  for (let b = 0; b < 3; b++) for (let a = 0; a < 4; a++) cR(cx - 45 + a * 30 - 2, dY - 2 + b * 26, 4, 4, 19);
  for (const s of [-1, 1]) { cEllO(cx + s * 70, dY + 30, 9, 30, 20, 19); cEllO(cx + s * 66, dY - 16, 7, 7, 49, 48); }
  // the table: boards along its length, a darker rim, its front face and legs
  cFl = 0; cRound(tX - 2, tY - 2, tW + 4, tH + 4, 8, BLK);
  for (let y = 0; y < tH; y++) for (let x = 0; x < tW; x++) { const dx = Math.min(x, tW - 1 - x), dy = Math.min(y, tH - 1 - y); if (dx + dy < 7) continue;
    const pl = (x / 38) | 0, rim = dx < 5 || dy < 5; cP(tX + x, tY + y, rim ? 100 : x % 38 < 2 ? 100 : cHash(pl * 7 + 3, (y / 4) | 0) < 0.16 ? 100 : cHash(pl + 31, (y / 9) | 0) < 0.1 ? 102 : 101); }
  cR(tX + 4, tY + tH + 2, tW - 8, 16, BLK); cR(tX + 6, tY + tH + 2, tW - 12, 10, 99); cR(tX + 6, tY + tH + 12, tW - 12, 4, 98);
  for (const lx of [tX + 14, tX + tW - 32]) { cR(lx, tY + tH + 18, 18, 34, BLK); cR(lx + 2, tY + tH + 18, 14, 32, 98); }
  // the Dungeon Master's screen: two wings toward us, the middle panel with its skull
  cFl = 5;
  for (const s of [-1, 1]) for (let q = 0; q <= 46; q++) { const x = cx + s * (46 + q), k = q / 46, y0 = Math.round(sT - 8 * k), y1 = Math.round(sB + 10 * k), edge = q >= 45;
    cR(x, y0 - 2, 1, y1 - y0 + 4, BLK); if (!edge) { cR(x, y0, 1, y1 - y0, s < 0 ? 20 : 19); cR(x, y0 + 5, 1, 2, 49); cR(x, y1 - 7, 1, 2, 49); } }
  for (const s of [-1, 1]) { const x = cx + s * 69; for (let d = -6; d <= 6; d++) cR(x - (6 - Math.abs(d)), sT + 30 + d, (6 - Math.abs(d)) * 2 + 1, 1, 50); }
  cR(cx - 48, sT - 2, 96, sB - sT + 4, BLK); cR(cx - 46, sT, 92, sB - sT, 21); cFrame(cx - 41, sT + 5, 82, sB - sT - 10, 49);
  for (const s of [-1, 1]) { cLine(cx - s * 22, sT + 16, cx + s * 22, sT + 52, BLK, 8); cLine(cx - s * 22, sT + 16, cx + s * 22, sT + 52, 25, 4); for (const e of [-1, 1]) cEllO(cx + e * s * 22, sT + 34 + e * 18, 3, 3, 25); }
  cSkull(cx, sT + 30);
  // the map in the middle (0 = the game shows here), in a parchment border held down by four stones
  cFl = 5; cR(mX - 8, mY - 8, mw + 16, mhI + 16, BLK); cR(mX - 6, mY - 6, mw + 12, mhI + 12, 103); cR(mX - 6, mY + mhI + 2, mw + 12, 4, 102); cR(mX - 2, mY - 2, mw + 4, mhI + 4, BLK);
  cR(mX, mY, mw, mhI, 0);
  for (const [x, y] of [[mX - 9, mY - 9], [mX + mw + 9, mY - 9], [mX - 9, mY + mhI + 9], [mX + mw + 9, mY + mhI + 9]]) cEllO(x, y, 5, 4, 67, 66);
  // candles: two by the screen, two further down the table
  cFl = 6; for (const [x, y] of candles) { cR(x - 8, y + 16, 16, 6, BLK); cR(x - 6, y + 16, 12, 4, 49); cR(x - 5, y, 10, 18, BLK); cR(x - 3, y + 2, 6, 14, 26); cR(x + 1, y + 2, 2, 14, 25); }
  // Dave's side of the map: rule books, two pewter figures
  { const x = cx + 44, y = tY + 12; cR(x, y + 6, 40, 20, BLK); cR(x + 2, y + 8, 36, 16, 38); cR(x + 2, y + 20, 36, 2, 27); cR(x + 4, y, 36, 16, BLK); cR(x + 6, y + 2, 32, 12, 21); cR(x + 10, y + 6, 14, 2, 50); }
  for (const [x, y, c] of [[cx - 64, tY + 34, 31], [cx - 48, tY + 36, 26]]) { cEll(x, y, 6, 3, BLK); cR(x - 3, y - 14, 6, 13, BLK); cR(x - 2, y - 13, 4, 11, c); cEllO(x, y - 16, 2, 2, c); cR(x + 3, y - 12, 2, 8, 30); }
  // each player's place: an armchair (its back here; its arms go on in front, below), a sheet, dice, a pencil
  const chairBack = (id) => { const s = seat[id], w = D[id].w, h = D[id].h; cFl = 4;
    cRound(s.x - 4, s.y + 22, w + 8, h - 8, 16, BLK); cRound(s.x - 2, s.y + 24, w + 4, h - 12, 15, 34); cRound(s.x + 6, s.y + 32, w - 12, h - 30, 11, 35); cR(s.x - 2, s.y + h - 6, w + 4, 18, 33);
    for (let k = 0; k < 3; k++) cR(s.x + w / 2 - 22 + k * 20, s.y + 40, 4, 4, 33); };
  const chairFront = (id) => { const s = seat[id], w = D[id].w, y = s.clipY; cFl = 4;
    for (const ax of [s.x + 8, s.x + w - 8]) { cEllO(ax, y + 2, 13, 9, 35, 34); cEll(ax - 3, y - 2, 5, 2, 36); cR(ax - 5, y + 12, 10, 16, BLK); cR(ax - 3, y + 12, 6, 14, 33); } };
  const sheet = (x, y) => { cFl = 6; cR(x, y, 38, 50, BLK); cR(x + 2, y + 2, 34, 46, 27); cR(x + 5, y + 5, 10, 10, 25); cR(x + 18, y + 6, 15, 2, 24); cR(x + 18, y + 11, 11, 2, 24); for (let k = 0; k < 5; k++) cR(x + 5, y + 20 + k * 5, 28 - (k % 3) * 6, 2, 25); };
  const dice = (x, y, ramp) => { cFl = 6; cDie(x, y, 6, '', 1, ramp); cR(x + 9, y + 2, 10, 10, BLK); cR(x + 11, y + 4, 6, 6, ramp[3]); cR(x + 13, y + 6, 2, 2, 27); };
  for (const id of ['marc', 'aaron', 'chris']) { chairBack(id); chairFront(id); }
  sheet(tX + 12, seat.marc.y + 6); dice(tX + 20, seat.marc.y + 68, BLUE); cFl = 6; cLineO(tX + 46, seat.marc.y + 64, tX + 56, seat.marc.y + 42, 50, 2);
  sheet(tX + tW - 50, seat.aaron.y + 18); dice(tX + tW - 46, seat.aaron.y + 80, PURPLE);
  sheet(tX + tW - 50, seat.chris.y + 10); dice(tX + tW - 46, seat.chris.y + 72, GREEN); cFl = 6; cLineO(tX + tW - 58, seat.chris.y + 66, tX + tW - 52, seat.chris.y + 88, 50, 2);
  // snacks at the near end: a bowl of chips, cans, a pizza box
  cFl = 6;
  { const bx = tX + 40, by = tY + tH - 24; cEllO(bx, by, 22, 11, 32, 31); cEll(bx, by - 2, 17, 7, 49); for (let k = 0; k < 9; k++) cR(bx - 14 + ((cHash(k, 5) * 26) | 0), by - 8 + ((cHash(k, 6) * 9) | 0), 5, 3, k % 3 ? 50 : 51); }
  for (const [x, y, c, c2] of [[cx - 34, tY + tH - 36, 22, 21], [tX + tW - 22, seat.aaron.y + 106, 54, 53], [tX + 62, tY + tH - 38, 39, 38], [tX + 12, seat.marc.y - 30, 22, 21]]) { cR(x, y, 14, 22, BLK); cR(x + 2, y + 2, 10, 18, c); cR(x + 8, y + 2, 4, 18, c2); cR(x + 2, y + 2, 10, 3, 31); cR(x + 2, y + 10, 10, 2, 27); }
  { const x = cx + 8, y = tY + tH - 38; cR(x, y, 64, 30, BLK); cR(x + 2, y + 2, 60, 26, 102); cEll(x + 32, y + 15, 24, 10, 36); cEll(x + 32, y + 15, 21, 8, 50, 49); for (let k = 0; k < 6; k++) cR(x + 16 + ((cHash(k, 12) * 30) | 0), y + 10 + ((cHash(k, 13) * 9) | 0), 4, 3, 22); cTrap(y + 15, y + 26, x + 32, x + 33, x + 40, x + 56, 102); }
  cWallOn = false;
  // the light, three ways. Lamp on: its pool is brightest on the table and falls off to the corners,
  // with the cone under the shade showing on the wall. Lamp out: the candles' pools and the map's glow.
  const ly = tY + tH * 0.3, lit = new Float32Array(N), dark = new Float32Array(N);
  for (let y = 0, o = 0; y < cH; y++) for (let x = 0; x < cW; x++, o++) {
    const dx = (x - cx) / (cW * 0.6), dy = (y - ly) / (cH * 0.5); let v = 7.5 - 4.6 * Math.pow(Math.hypot(dx, dy), 1.25);
    if (y < lampB) v -= (lampB - y) * 0.025; else { const hw = 30 + (y - lampB) * 0.62, ax = Math.abs(x - cx); if (ax < hw) v += 0.75 * Math.min(1, (hw - ax) / 14); }
    lit[o] = clamp(v, 2.4, 6.85);
    let d = 1.9; for (const [fx, fy] of candles) { const q = ((x - fx) ** 2 + (y - fy + 6) ** 2) / 4600; if (q < 6) d += 3.7 * Math.exp(-q); }
    const mx = Math.max(mX - x, x - (mX + mw), 0), my = Math.max(mY - y, y - (mY + mhI), 0), q = (mx * mx + my * my) / 2300; if (q < 6) d += 2.3 * Math.exp(-q);
    dark[o] = clamp(d, 1.5, 6.4);
  }
  for (let y = 0, o = 0; y < cH; y++) for (let x = 0; x < cW; x++, o++) {
    const v = cS0[o], f = cF0[o], bay = BAYER[((y & 3) << 2) | (x & 3)];
    if (v === 0 || (v & EMIS)) { cCN[o] = cCD[o] = cCG[o] = v ? PAL32[v & 127] : 0; continue; }
    cCN[o] = cCL[(f ? f : (lit[o] + bay) | 0) * NPAL + v];
    const L = f ? Math.min(f, Math.max(1, Math.round(dark[o]))) : (dark[o] + bay) | 0;
    cCD[o] = cCL[L * NPAL + v]; cCG[o] = cCLg[L * NPAL + v];
  }
}

// ---------------------------------------------------------------- the shots
// A view of the room: the named place at `fy` of the way down the screen, at zoom z
function cineV(name, z = 1, fy = 0.44) {
  const g = cGeo;
  if (name === 'map') return { x: g.mX + g.mw / 2, y: g.mY + g.mh / 2, z: 3 };
  if (name === 'wide') return { x: cW / 2, y: cH / 2, z: 1 };
  const a = g.face[name] || { lamp: [g.cx, g.top + 10], table: [g.cx, g.tY + g.tH / 2], mapc: [g.cx, g.mY + g.mh / 2], wallL: [g.cx - 100, g.top + 96], wallR: [g.cx + 100, g.top + 96] }[name];
  return { x: a[0], y: a[1] + (0.5 - fy) * cH / z, z };
}
// A shot: { dur, cam: [from, to] (the camera drifts from one to the other over the shot), who + text
// (a caption), light ('N' lamp, 'D' lamp out, 'G' green), cut (jump to it) or ease (seconds to glide
// into it), pan: [a, b] (hold the first view until a of the way through, be on the second by b),
// fx: 'dead' | 'king' | 'maelis' | 'roll' }
function cineShots(kind, cls) {
  const me = PLAYER_OF[cls] || 'marc', ME = CINE_PEOPLE[me].name, V = cineV;
  if (kind === 'open') {
    const say_ = { warrior: 'I HIT WHATEVER NEEDS HITTING.', mage: 'I ASK NICELY. THEN I SET IT ON FIRE.', ranger: 'I COUNT THE EXITS. THEN I FIND THE PRIEST.' }[cls] || 'I GO IN.';
    return [
      { dur: 3.4, cam: [V('lamp', 2, 0.3), V('dave', 2)], light: 'N', cut: true, title: 'GAME NIGHT' },
      { dur: 2.8, cam: [V('dave', 2), V('dave', 2.25)], who: 'dave', text: 'TONIGHT: DUNGEONS OF BONES.' },
      { dur: 4.2, cam: [V('table', 1.2, 0.46), V('mapc', 1.9, 0.44)], light: 'D', ease: 1, who: 'dave', text: 'OAKHOLLOW WAS A VILLAGE. NOW IT IS ONE FIRE IN THE WOODS.' },
      { dur: 3.6, cam: [V('wallR', 1.5, 0.4), V('wallL', 1.5, 0.4)], light: 'G', cut: true, fx: 'dead', who: 'dave', text: 'THEN THE DEAD GOT UP.' },
      { dur: 4.2, cam: [V('dave', 1.7, 0.66), V('dave', 1.12, 0.6)], light: 'G', cut: true, fx: 'king', who: 'dave', text: 'SOMEONE IS PAYING FOR BONES. THEIR OLD KING IS ALMOST WHOLE.' },
      { dur: 3.4, cam: [V('dave', 2), V(me, 2)], light: 'N', ease: 0.5, pan: [0.5, 0.78], who: 'dave', text: `${ME}. YOU WALK INTO CAMP. WHAT DO YOU DO?` },
      { dur: 2.8, cam: [V(me, 2), V(me, 2.2)], who: me, text: say_ },
      { dur: 2.3, cam: [V('wide'), V('wide')], ease: 0.45, fx: 'roll', who: 'dave', text: 'ROLL.' },
    ];
  }
  if (kind === 'actEnd') return [
    { dur: 2.8, cam: [V('dave', 2), V('dave', 2.2)], light: 'N', ease: 0.6, who: 'dave', text: 'THE OLD KING IS DUST. AGAIN.' },
    { dur: 4, cam: [V('dave', 1.7, 0.66), V('dave', 1.3, 0.62)], light: 'G', cut: true, fx: 'maelis', who: 'dave', text: 'BUT MAELIS WENT SOUTH. AND HE TOOK SOMETHING WITH HIM.' },
    { dur: 2.6, cam: [V(me, 2), V(me, 2.2)], light: 'N', cut: true, who: me, text: 'THEN WE GO SOUTH.' },
    { dur: 3.4, cam: [V('wide'), V('table', 1.15, 0.5)], ease: 0.6, who: 'dave', text: 'NEXT WEEK. SOMEBODY ELSE BRINGS THE SNACKS.' },
  ];
  return [{ dur: 0.5, cam: [V('wide'), V('wide')], light: 'N', cut: true }];   // 'resume': a moment at the table, then into the map
}

// ---------------------------------------------------------------- running a cinematic
// G.cine = { kind, shots, k, st, ph, cam, ... }. kinds: 'open' (a new game: the story in three
// visions, the die, into the map), 'resume' (a saved game: straight into the map), 'actEnd' (out of
// the map, the night ends). ph: 'shots', 'zoom' (into the map; ends it), 'zoomOut', 'out' (a fade).
let CINE_OFF = null;
function cineOK() {
  if (CINE_OFF === null) { const q = params.get('cine'); CINE_OFF = q !== null ? q === '0' : location.protocol === 'file:'; }   // (off from local files unless asked: the test tools start games there)
  return !CINE_OFF && !PREVIEW;
}
const cineSmooth = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
function cineLerp(a, b, e) {   // between two views: the zoom in equal ratios, the centre along the path a zoom toward a point takes
  if (e <= 0) return a; if (e >= 1) return b;
  const z = a.z * Math.pow(b.z / a.z, e), w = Math.abs(a.z - b.z) < 0.01 ? e : (1 / a.z - 1 / z) / (1 / a.z - 1 / b.z);
  return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, z };
}
function cineSprites(kind) {   // the visions' sprites, built before they are needed
  const s = budgetOff(), out = { skel: [], king: [], maelis: [] };
  if (kind === 'open') { for (let f = 0; f < 8; f++) out.skel.push(getSprite('skeleton', MONSTERS.skeleton.look, 3, 'walk', f, { look: MONSTERS.skeleton.look })); for (let f = 0; f < 4; f++) out.king.push(getSprite('skeleton', MONSTERS.skelking.look, 1, 'idle', f, { look: MONSTERS.skelking.look })); }
  if (kind === 'actEnd') for (let f = 0; f < 4; f++) out.maelis.push(getSprite('hero', NPC_LOOKS.maelis, 1, 'idle', f, { look: NPC_LOOKS.maelis, cls: 'mage', combo: 0 }));
  budgetOn(s); return out;
}
function cineLight(to) { const C = G.cine; if (to === C.lB) return; C.lA = C.lt > 0.5 ? C.lB : C.lA; C.lB = to; C.lt = 0; }
function cineShot(k) {
  const C = G.cine, s = C.shots[k]; C.k = k; C.st = 0; C.chars = 0; C.total = s.text ? s.text.length : 0; C.ev = 0;
  C.camPrev = s.cut ? null : Object.assign({}, C.cam); if (s.cut) C.cam = s.cam[0];
  if (s.light) { if (s.light !== C.lB && s.light !== 'N') sfx('whoomp'); cineLight(s.light); }
  C.fxPrev = C.fx && C.fx !== s.fx ? { fx: C.fx, st: C.fxSt, t: 0 } : null; C.fx = s.fx || null; C.fxSt = 0;
  if (s.fx === 'dead') sfx('cry');
}
function startCine(kind, done = null) {
  if (cW !== OW || cH !== OH) cineBuild();
  const C = G.cine = { kind, done, shots: cineShots(kind, hero.cls), sp: cineSprites(kind), k: 0, st: 0, ph: 'shots', pt: 0, chars: 0, total: 0, ev: 0, cam: cineV('wide'), camPrev: null,
    lA: 'N', lB: 'N', lt: 1, bars: 0, shake: 0, flash: 0, fi: 0, fx: null, fxSt: 0, fxPrev: null, zA: null, zB: null, zt: 0, zd: 1 };
  G.mode = 'cine'; clearInput();
  if (kind === 'actEnd') { C.ph = 'zoomOut'; C.cam = cineV('map'); C.zA = C.cam; C.zB = cineV('wide'); C.zd = 2.2; }
  else { C.fi = kind === 'open' ? 1 : 0.35; if (kind !== 'open') C.bars = 0; cineShot(0); }
}
function cineEnd() { const C = G.cine; G.cine = null; G.mode = 'play'; clearInput(); G.autoTalkT = G.t + 1.2; if (C && C.done) C.done(); }   // (a beat in the game before anyone speaks)
function cineZoom(dur) { const C = G.cine; C.ph = 'zoom'; C.pt = 0; C.zA = Object.assign({}, C.cam); C.zB = cineV('map'); C.zt = 0; C.zd = dur; cineLight('N'); if (C.fx !== 'roll' || !C.landed) C.fx = null; C.fxPrev = null; }
function cineNext() {
  const C = G.cine;
  if (C.k + 1 < C.shots.length) { cineShot(C.k + 1); return; }
  if (C.kind === 'actEnd') { C.ph = 'out'; C.pt = 0; } else cineZoom(C.kind === 'open' ? 2.4 : 1.5);
}
function updateCine(dt) {
  const C = G.cine; if (!C) return;
  C.pt += dt; if (C.fi > 0) C.fi -= dt; if (C.shake > 0) C.shake -= dt; if (C.flash > 0) C.flash -= dt;
  C.lt = Math.min(1, C.lt + dt / 0.7); if (C.fxPrev) { C.fxPrev.t += dt; C.fxPrev.st += dt; if (C.fxPrev.t > 0.5) C.fxPrev = null; }
  const barsTo = C.kind === 'resume' || C.ph === 'zoom' ? 0 : 1; C.bars = clamp(C.bars + clamp(barsTo - C.bars, -dt * 1.4, dt * 1.8), 0, 1);
  if (C.ph === 'shots') {
    const s = C.shots[C.k]; C.st += dt; C.fxSt += dt; C.chars = Math.min(C.total, C.chars + dt * 34);
    const u = clamp(C.st / s.dur, 0, 1), path = cineLerp(s.cam[0], s.cam[1], s.pan ? cineSmooth((u - s.pan[0]) / (s.pan[1] - s.pan[0])) : u);
    C.cam = C.camPrev && s.ease && C.st < s.ease ? cineLerp(C.camPrev, path, cineSmooth(C.st / s.ease)) : path;
    if (s.fx === 'king' && !C.ev && C.st > 0.55) { C.ev = 1; C.flash = 0.3; C.shake = 0.5; sfx('boom'); }
    if (s.fx === 'maelis' && !C.ev && C.st > 0.4) { C.ev = 1; C.flash = 0.2; sfx('whoomp'); }
    if (s.fx === 'roll') { if (!C.ev && C.st > 0.35) { C.ev = 1; sfx('clatter'); } if (!C.landed && C.st > 1.25) { C.landed = true; C.shake = 0.25; sfx('clink'); sfx('thunk'); } }
    if (C.st >= s.dur) cineNext();
  } else if (C.ph === 'zoom' || C.ph === 'zoomOut') {
    C.zt = Math.min(1, C.zt + dt / C.zd); C.fxSt += dt;
    const e = C.zt < 0.5 ? 4 * C.zt ** 3 : 1 - ((-2 * C.zt + 2) ** 3) / 2; C.cam = cineLerp(C.zA, C.zB, e);
    if (C.zt >= 1) { if (C.ph === 'zoom') cineEnd(); else { C.ph = 'shots'; cineShot(0); } }
  } else if (C.ph === 'out') { if (C.pt > 0.6) cineEnd(); }
}
function cineLayout() { return { skip: { x: W - 56, y: 0, w: 56, h: 26 } }; }
function cineTap(p) {
  const C = G.cine; if (!C) return;
  if (C.ph === 'shots') {
    if (p && inRect(p, cineLayout().skip) && C.kind !== 'resume') { sfx('tap'); if (C.kind === 'actEnd') cineEnd(); else cineZoom(1.3); return; }
    if (C.fi > 0.4 || C.st < 0.25) return;
    const s = C.shots[C.k];
    if (C.chars < C.total) C.chars = C.total;
    else if (s.fx === 'roll') { if (C.landed) cineZoom(1.6); }   // (a tap too many while reading doesn't lose the roll)
    else if (C.kind === 'resume') cineEnd();
    else cineNext();
  } else if (C.ph === 'zoomOut') C.zt = 1;
  else if (C.ph === 'out') cineEnd();
  else if (C.ph === 'zoom' && C.kind === 'resume' && C.pt > 0.25) cineEnd();   // the opening's push into the map plays out; a saved game's can be cut
}

// ---------------------------------------------------------------- each frame: the room's light, the visions, the people
function cineBox(sp) {   // the rows a sprite's figure really fills (its picture has empty margins)
  if (sp.box) return sp.box; let y0 = sp.h, y1 = 0;
  for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) if (sp.data[j * sp.w + i]) { if (j < y0) y0 = j; y1 = j; break; }
  return sp.box = [y0, y1];
}
function cineFx(fx, st, a) {   // a vision on the back wall: st its time so far, a how much of it shows
  const g = cGeo, C = G.cine, t = G.t;
  if (fx === 'dead') {   // the dead, twice life size, marching across the wall
    for (let i = 0; i < 9; i++) { const sp = C.sp.skel[(Math.floor(t * 9) + i * 3) % 8], x = cW + 60 + i * 96 - st * 190; if (x < -120 || x > cW + 120) continue;
      cineGhost(sp, x, g.wallB + 6 + ((i * 5) % 3) * 4 + (sp.ay - cineBox(sp)[1]) * 2, 2, g.wallB, a * 0.86); }
  } else if (fx === 'king') {   // the king, rising behind the chair until his crown is under the beam
    if (st < 0.5) return; const sp = C.sp.king[Math.floor(t * 5) % 4], up = 1 - Math.pow(1 - clamp((st - 0.5) / 1.6, 0, 1), 3);
    cineGhost(sp, g.cx, 20 + (sp.ay - cineBox(sp)[0]) * 2 + (1 - up) * 170 + Math.round(Math.sin(t * 2.3) * 2), 2, g.wallB, a * Math.min(1, (st - 0.5) / 0.4 + 0.3));
  } else if (fx === 'maelis') {   // the man behind it all, in his hood
    if (st < 0.4) return; const sp = C.sp.maelis[Math.floor(t * 5) % 4];
    cineGhost(sp, g.cx, 26 + (sp.ay - cineBox(sp)[0]) * 3 + Math.round(Math.sin(t * 2) * 2), 3, g.wallB, a * Math.min(1, (st - 0.4) / 0.5) * 0.9);
  }
}
function cineDie(T, rest) {   // Dave's die: up toward us, huge, then down onto the table: a twenty
  const g = cGeo, k = rest ? 1 : clamp((T - 0.35) / 0.9, 0, 1); if (!rest && T < 0.35) return;
  const x0 = g.cx + 36, y0 = g.sT - 8, x1 = g.cx + 6, y1 = g.tY + 24, big = Math.sin(k * Math.PI), r = Math.round(11 + Math.pow(big, 1.3) * 70);
  const x = Math.round(x0 + (x1 - x0) * k + Math.sin(k * 9) * 10 * big), y = Math.round(y0 + (y1 - y0) * k + big * (cH * 0.5 - y0) * 0.75), z = Math.max(1, Math.round(r / 10));
  cFl = 6; cDie(x, y, r, k >= 1 ? '20' : String(1 + (Math.floor(T * 22) * 7) % 19), z);
  if (k >= 1 && !rest && T < 1.75) { cFl = 0; for (let a = 0; a < 10; a++) { const q = 12 + (T - 1.25) * 110; cR(Math.round(x + Math.cos(a * 0.628) * q), Math.round(y + Math.sin(a * 0.628) * q * 0.7), 3, 3, 18 | EMIS); } }
}
function cineDynamic(C) {
  const g = cGeo, t = G.t, mix = C.lA === C.lB ? 0 : C.lt, wN = C.lB === 'N' ? (C.lA === 'N' ? 1 : C.lt) : C.lA === 'N' ? 1 - C.lt : 0, green = C.lB === 'G' ? mix || 1 : C.lA === 'G' ? 1 - mix : 0;
  const s = C.ph === 'shots' ? C.shots[C.k] : null, speaker = s && s.text && C.chars < C.total ? s.who : null;
  cFl = 0;
  if (wN > 0.5) {   // the lamp's bulb and the string lights
    cEll(g.cx, g.top + 27, 9, 4, 18 | EMIS);
    for (let k = 0; k < g.bulbs.length; k++) { const [x, y, c] = g.bulbs[k]; if (Math.sin(t * 1.7 + k * 2.4) < -0.75) continue; cR(x - 1, y, 3, 4, c | EMIS); cR(x, y - 1, 1, 6, c | EMIS); }
  }
  if (C.fxPrev) cineFx(C.fxPrev.fx, C.fxPrev.st, 1 - C.fxPrev.t / 0.5);
  if (C.fx && C.fx !== 'roll') cineFx(C.fx, C.fxSt, 1);
  for (const id of ['dave', 'marc', 'aaron', 'chris']) {
    const P = CINE_PEOPLE[id], q = g.seat[id], talking = speaker === id;
    let bob = talking ? Math.round(Math.sin(t * 10) * 1.2 - 0.5) : Math.round(Math.sin(t * 1.3 + q.ph) * 0.7);
    if (id !== 'dave' && s && s.fx === 'king' && C.st > 0.55 && C.st < 0.85) bob -= 3;   // the players start at the king
    cineBust(P, q.x, q.y + bob, P.lit[C.lA], P.lit[C.lB], mix, q.clipY, ((t + q.ph * 1.7) % 3.9) < 0.13, talking && Math.floor(t * 9) % 2 === 0, q.fadeY);
  }
  cFl = 6; for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const fx = g.cx + sd * (16 + k * 8); cEll(fx, g.sT - 1, 4, 6, BLK); cEll(fx, g.sT - 2, 3, 5, wN > 0.5 ? 63 : 61, wN > 0.5 ? 62 : 60); }   // Dave's fingers over his screen
  cFl = 0;
  for (const [x, y] of g.candles) { const k = Math.floor(t * 9 + x) % 3, gr = green > 0.5; cEll(x + (k === 1 ? 1 : 0), y - 6, 3, 5 + (k === 2 ? 1 : 0) + (gr ? 2 : 0), (gr ? 55 : 16) | EMIS); cEll(x, y - 4, 1, 3, (gr ? 72 : 18) | EMIS); }
  if (wN > 0.5) for (let k = 0; k < 12; k++) {   // dust in the lamplight
    const x = Math.round(g.cx + (cHash(k, 1) - 0.5) * 250 + Math.sin(t * 0.6 + k) * 7), y = Math.round(g.top + 34 + ((((cHash(k, 2) * 240 - t * (5 + cHash(k, 3) * 7)) % 240) + 240) % 240));
    if (Math.sin(t * 1.7 + k * 2.1) < -0.2 || (Math.abs(x - g.cx) < 50 && y < g.sT)) continue;
    cR(x, y, 2, 2, 11 | EMIS);
  }
  if (C.fx === 'roll') cineDie(C.ph === 'shots' ? C.st : 9, C.ph !== 'shots');
}
// The game's own picture (no HUD) is kept when the world was drawn this frame (`fresh`): every
// fourth frame while a shot plays, every second during the push into the map (cineHolds).
function cineFull() { const C = G.cine; return C.ph === 'zoom' || C.ph === 'zoomOut'; }
function cineHolds() { const C = G.cine; if (!cGameOK || cW !== OW || cH !== OH) return false; C.fr = (C.fr || 0) + 1; return C.fr % (cineFull() ? 2 : 4) !== 0; }
function cineMini() {   // the game's picture at a third: each pixel the average of a 3x3 block
  const g = cGeo, mw = g.mw, k = Math.round(256 / 9);
  for (let j = 0, d = 0; j < g.mhI; j++) { const y0 = Math.min(j * 3, cH - 3) * cW; for (let i = 0; i < mw; i++, d++) {
    let r = 0, gg = 0, b = 0; const q = y0 + i * 3;
    for (let o = q; o < q + 3 * cW; o += cW) for (let a = 0; a < 3; a++) { const c = cGame[o + a]; r += c & 255; gg += (c >> 8) & 255; b += (c >> 16) & 255; }
    cMini[d] = (255 << 24) | (Math.min(255, (b * k) >> 8) << 16) | (Math.min(255, (gg * k) >> 8) << 8) | Math.min(255, (r * k) >> 8);
  } }
  cMiniOK = true;
}
// Then the room goes over the whole screen through the camera, with the game's picture where the
// map is: three scene pixels to one of the game's, so at zoom 3 on the map the screen is the game.
// The map shows the third-size picture as part of the scene until the push into it is half way
// (zoom 1.5), then the game's own pixels. Between whole zooms a scene pixel's edge is blended over
// one screen pixel, so a slow push or drift doesn't shimmer.
function cineCompose(fresh) {
  const C = G.cine; if (!C) return;
  if (cW !== OW || cH !== OH) { cineBuild(); const st = C.st; C.shots = cineShots(C.kind, hero.cls); C.cam = C.ph === 'zoom' ? cineV('map') : C.shots[C.k].cam[1]; if (C.zB) { C.zB = cineV(C.ph === 'zoom' ? 'map' : 'wide'); C.zA = C.zB; } C.camPrev = null; C.st = st; }
  if (fresh) { cGame.set(ov32); cGameOK = true; cMiniOK = false; }
  const g = cGeo, bufs = { N: cCN, D: cCD, G: cCG }, A = bufs[C.lA], B = bufs[C.lB];
  if (C.lA === C.lB || C.lt >= 1) cC.set(B);
  else { const m = C.lt; for (let y = 0, o = 0; y < cH; y++) { const by = (y & 3) << 2; for (let x = 0; x < cW; x++, o++) cC[o] = BAYER[by | (x & 3)] < m ? B[o] : A[o]; } }
  const z = C.cam.z, iz = 1 / z, hw = cW / 2, hh = cH / 2, mw = g.mw, mX = g.mX, mY = g.mY;
  if (!cineFull() || z < 1.5) { if (!cMiniOK) cineMini(); for (let j = 0; j < g.mhI; j++) cC.set(cMini.subarray(j * mw, (j + 1) * mw), (mY + j) * cW + mX); }
  cDyn = true; cineDynamic(C); cDyn = false;
  let vx = clamp(C.cam.x, hw * iz, cW - hw * iz), vy = clamp(C.cam.y, hh * iz, cH - hh * iz);
  if (C.shake > 0) { const a = Math.min(1, C.shake / 0.3) * 5 * iz; vx = clamp(vx + Math.sin(G.t * 83) * a, hw * iz, cW - hw * iz); vy = clamp(vy + Math.sin(G.t * 97 + 1) * a, hh * iz, cH - hh * iz); }
  for (let X = 0; X < cW; X++) {
    const sx = vx + (X + 0.5 - hw) * iz, u = sx - 0.5, i0 = Math.floor(u), w = (u - i0 - 0.5) * z + 0.5;
    if (w < 0.03) { cXa[X] = clamp(i0, 0, cW - 1); cXw[X] = 0; } else if (w > 0.97) { cXa[X] = clamp(i0 + 1, 0, cW - 1); cXw[X] = 0; } else { cXa[X] = clamp(i0, 0, cW - 2); cXw[X] = Math.round(w * 256); }
    cGx[X] = clamp(Math.floor((sx - mX) * 3 + 1e-6), 0, cW - 1);
  }
  for (let Y = 0, d = 0; Y < cH; Y++) {
    const syf = vy + (Y + 0.5 - hh) * iz, u = syf - 0.5, j0 = Math.floor(u); let wy = (u - j0 - 0.5) * z + 0.5, ya;
    if (wy < 0.03) { ya = clamp(j0, 0, cH - 1); wy = 0; } else if (wy > 0.97) { ya = clamp(j0 + 1, 0, cH - 1); wy = 0; } else { ya = clamp(j0, 0, cH - 2); wy = Math.round(wy * 256); }
    const row = ya * cW, gy = clamp(Math.floor((syf - mY) * 3 + 1e-6), 0, cH - 1) * cW;
    if (!wy) for (let X = 0; X < cW; X++, d++) {   // a whole row of scene pixels: blends only across
      const o = row + cXa[X]; let c = cC[o];
      if (c === 0) c = cGame[gy + cGx[X]];   // the map, late in the push: the game's own picture
      else { const wx = cXw[X]; if (wx) { const c2 = cC[o + 1]; if (c2) c = (((((c & 0xff00ff) * (256 - wx) + (c2 & 0xff00ff) * wx) >>> 8) & 0xff00ff) | ((((c & 0xff00) * (256 - wx) + (c2 & 0xff00) * wx) >>> 8) & 0xff00) | 0xff000000) >>> 0; } }
      ov32[d] = c;
    } else for (let X = 0; X < cW; X++, d++) {
      const o = row + cXa[X], wx = cXw[X]; let c = cC[o];
      if (c === 0) { ov32[d] = cGame[gy + cGx[X]]; continue; }
      if (wx) { const c2 = cC[o + 1]; if (c2) c = (((((c & 0xff00ff) * (256 - wx) + (c2 & 0xff00ff) * wx) >>> 8) & 0xff00ff) | ((((c & 0xff00) * (256 - wx) + (c2 & 0xff00) * wx) >>> 8) & 0xff00) | 0xff000000) >>> 0; }
      let c3 = cC[o + cW];
      if (c3) { if (wx) { const c4 = cC[o + cW + 1]; if (c4) c3 = (((((c3 & 0xff00ff) * (256 - wx) + (c4 & 0xff00ff) * wx) >>> 8) & 0xff00ff) | ((((c3 & 0xff00) * (256 - wx) + (c4 & 0xff00) * wx) >>> 8) & 0xff00) | 0xff000000) >>> 0; }
        c = (((((c & 0xff00ff) * (256 - wy) + (c3 & 0xff00ff) * wy) >>> 8) & 0xff00ff) | ((((c & 0xff00) * (256 - wy) + (c3 & 0xff00) * wy) >>> 8) & 0xff00) | 0xff000000) >>> 0; }
      ov32[d] = c;
    }
  }
}
// over it, at the HUD's scale: the film's bars, the caption (who, and a few words, typed), SKIP, the flashes and fades
function drawCineHud() {
  const C = G.cine; if (!C) return;
  const bt = Math.round(12 * C.bars), bb = Math.round(50 * C.bars);
  if (C.flash > 0) { const a = Math.min(0.85, C.flash / 0.3), col = PAL32[C.lB === 'G' ? 124 : 27]; for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) if (BAYER[((y & 3) << 2) | (x & 3)] < a) out32[o] = col; }
  if (bt) fillRect(0, 0, W, bt, BLK); if (bb) fillRect(0, H - bb, W, bb, BLK);
  if (C.ph === 'shots' && C.bars > 0.9) {
    const s = C.shots[C.k], y0 = H - 50;
    if (s.title && C.st > 0.5 && C.st < s.dur - 0.3) { textC(s.title, W / 2, y0 + 12, 51, 2); textC("DAVE'S BASEMENT", W / 2, y0 + 30, 25); }
    if (s.text) {
      const P = CINE_PEOPLE[s.who], big = wrapText(s.text, 32), z = big.length <= 2 ? 2 : 1, lines = z === 2 ? big : wrapText(s.text, 60);
      const nm = s.who === 'dave' ? 'DAVE' : P.name + (PLAYER_OF[hero.cls] === s.who ? ', THE ' + CLASS_WORD[hero.cls] : '');
      textC(nm, W / 2, y0 + 5, P.col);
      let left = Math.floor(C.chars); const lh = z === 2 ? 13 : 8, ty = y0 + 15 + (lines.length === 1 && z === 2 ? 6 : 0);
      for (let k = 0; k < lines.length && left > 0; k++) { const l = lines[k]; text(l.slice(0, left), Math.round(W / 2 - textWidth(l, z) / 2), ty + k * lh, 26, z); left -= l.length + 1; }
    }
    if (C.kind !== 'resume') textC('SKIP', W - 16, 4, 24);
  }
  if (C.fi > 0) fade(Math.min(1, C.fi / 0.7));
  if (C.ph === 'out') fade(Math.min(1, C.pt / 0.5));
}

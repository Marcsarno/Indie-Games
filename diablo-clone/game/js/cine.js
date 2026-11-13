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
// round 91: you are none of them: you are the fifth seat, at the near end of the table (the camera)

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
  const X0 = Math.round(x - sp.ax * k), Y0 = Math.round(y - sp.ay * k), bright = PAL32[72], rim = PAL32[52];
  if (!sp.rim) { sp.rim = new Uint8Array(sp.w * sp.h); for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) { const o = j * sp.w + i; if (sp.data[o] && (i === 0 || j === 0 || i === sp.w - 1 || j === sp.h - 1 || !sp.data[o - 1] || !sp.data[o + 1] || !sp.data[o - sp.w] || !sp.data[o + sp.w])) sp.rim[o] = 1; } }   // (round 91: its outline, so a pale shape still reads)
  for (let j = 0; j < sp.h; j++) for (let q = 0; q < k; q++) {
    const Y = Y0 + j * k + q; if (Y < 0) continue; if (Y >= clipY || Y >= cH) break;
    const by = (Y & 3) << 2, row = Y * cW, srow = j * sp.w;
    for (let i = 0; i < sp.w; i++) { const v = sp.data[srow + i]; if (!v) continue; const c = sp.rim[srow + i] ? rim : (v & EMIS) ? bright : cGhost[v & 127];
      for (let p = 0; p < k; p++) { const X = X0 + i * k + p; if (X < 0 || X >= cW || !cWallM[row + X] || BAYER[by | (X & 3)] >= a) continue; cC[row + X] = c; } }
  }
}

// ---------------------------------------------------------------- the room, built once
// Round 91 (the user: the angle is wrong; it should look down at the table, at the game's angle):
// the room is drawn in the game's own projection. Two walls meet in a corner behind Dave; the floor's
// boards and the walls' bricks run on the game's 2:1 diagonals; what hangs on a wall lies in its
// plane. The table runs straight away from you (its top foreshortened to half, as the game's ground
// is), so the map on it, a model of the world seen from the same angle, is a screen-shaped window
// onto the game. You sit at the near end: the camera is you.
const cWallY = (x, v) => cGeo.yC + Math.abs(x - cGeo.cx) / 2 - v;   // the screen y of height v up a wall, at column x
function cWallPx(x, v, c) { cP(x, Math.round(cWallY(x, v)), c); }
function cWallRect(x0, w, v0, h, c) { for (let x = x0; x < x0 + w; x++) for (let v = v0; v < v0 + h; v++) cWallPx(x, v, c); }   // a rectangle in a wall's plane (a parallelogram on screen)
function cWallFrame(x0, w, v0, h, c, t = 2) { cWallRect(x0, w, v0, t, c); cWallRect(x0, w, v0 + h - t, t, c); cWallRect(x0, t, v0, h, c); cWallRect(x0 + w - t, t, v0, h, c); }
function cWallText(s, x0, v0, c, z = 2) {   // text written along a wall (its rows slant with it)
  for (let n = 0; n < s.length; n++) { const gl = FONT[s[n]] || FONT['?'];
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (gl[r * 3 + q] === '1') for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) cWallPx(x0 + (n * 4 + q) * z + b, v0 + (4 - r) * z + a, c); }
}
function cQuad(pts, c) {   // a convex shape by its corners, filled row by row
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.ceil(y0); y <= Math.floor(y1); y++) { let l = 1e9, r = -1e9;
    for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) { const x = a[1] === b[1] ? Math.min(a[0], b[0]) : a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), x2 = a[1] === b[1] ? Math.max(a[0], b[0]) : x; l = Math.min(l, x, x2); r = Math.max(r, x, x2); } }
    for (let x = Math.round(l); x <= Math.round(r); x++) cP(x, y, c); }
}
function cineBuild() {
  cW = OW; cH = OH; const N = cW * cH;
  cS0 = new Uint8Array(N); cF0 = new Uint8Array(N); cCN = new Uint32Array(N); cCD = new Uint32Array(N); cCG = new Uint32Array(N); cC = new Uint32Array(N); cGame = new Uint32Array(N); cGameOK = cMiniOK = false;
  cXa = new Int32Array(cW); cXw = new Int32Array(cW); cGx = new Int32Array(cW); cWallM = new Uint8Array(N); cWallOn = false;
  if (!cCL) cineLightTable();
  const cx = cW >> 1, mw = cW / 3, mh = cH / 3, mhI = Math.ceil(mh), D = CINE_PEOPLE;
  const dY = Math.round(24 + Math.max(0, cH - 80 - (350 + mhI) - 20) * 0.6);   // Dave's head: the room sits in what the caption bars leave
  const sT = dY + 80, tY = sT + 62, sB = tY + 6, tW = 330, tX = cx - tW / 2, tH = mhI + 162, nearY = tY + tH, mX = Math.round(cx - mw / 2), mY = tY + 42, miniY = mY + mhI + 70, yC = sT - 40, Hw = 250;
  const seat = {
    dave: { x: cx - D.dave.face[0], y: dY, clipY: sT - 2, ph: 0 },   // (round 89's first Dave was half again the others' size and hand-fattened; the user: way too big, then: still too fat. Now his portrait as drawn.)
    marc: { x: 0, y: tY + 74, ph: 1.9 },   // (the players sit against the screen's edges: their portraits end there)
    aaron: { x: cW - D.aaron.w, y: tY + 12, ph: 3.1 },
    chris: { x: cW - D.chris.w, y: tY + 150, ph: 4.4 },
  };
  for (const id of ['marc', 'aaron', 'chris']) { seat[id].clipY = seat[id].y + D[id].h - 4; seat[id].fadeY = seat[id].clipY - 18; }   // their portraits' lower edges sink into the chair's shadow
  const face = {}; for (const id in seat) face[id] = [seat[id].x + D[id].face[0], seat[id].y + D[id].face[1]];
  const candles = [[mX - 20, mY - 8], [mX + mw + 20, mY - 8], [mX - 20, mY + mhI + 6], [mX + mw + 20, mY + mhI + 6]];
  const minis = [['warrior', cx - 93], ['paladin', cx - 31], ['mage', cx + 31], ['ranger', cx + 93]].map(([cls, x]) => ({ cls, x, y: miniY }));   // (round 97: four)
  const lampP = [tX + 34, tY + 40];
  cMini = new Uint32Array(mw * mhI);
  const g = cGeo = { cx, yC, Hw, tX, tY, tW, tH, nearY, mX, mY, mw, mh, mhI, sT, seat, face, candles, minis, miniY, lampP, bulbs: [] };
  cT = cS0; cTF = cF0; cFl = 0; cDyn = false;
  // the walls, the floor, the dark above: pixel by pixel. Bricks in courses along each wall; boards on the floor's diagonal.
  for (let y = 0, o = 0; y < cH; y++) for (let x = 0; x < cW; x++, o++) {
    const u = Math.abs(x - cx), yb = yC + u / 2;
    if (y >= yb) {   // the floor
      const a = 2 * y + x - 2 * yC - cx, pk = Math.floor(a / 26), b = 2 * y - x + pk * 53 + 4000, sg = Math.floor(b / 120), h = cHash(pk + 300, sg);
      cS0[o] = (a % 26 + 26) % 26 < 2 || b % 120 < 2 ? 98 : h < 0.22 ? 100 : h > 0.9 ? 101 : 99;
    } else if (y >= yb - Hw) {   // a wall
      const v2 = Math.round(2 * (yb - y)), course = (v2 / 32) | 0, h = cHash(course + (x < cx ? 0 : 99), ((u + course * 20) / 40) | 0);
      cS0[o] = u < 1 ? 64 : v2 < 20 ? (v2 > 15 ? 35 : 34) : v2 > 2 * Hw - 30 ? (v2 > 2 * Hw - 6 ? BLK : 33) : (v2 % 32 < 3 || (u + course * 20) % 40 < 2) ? 65 : h < 0.14 ? 68 : h > 0.86 ? 66 : 67;
      cWallM[o] = v2 >= 20 && v2 <= 2 * Hw - 30 ? 1 : 0;
    } else cS0[o] = 2;   // the dark above the walls
  }
  // string lights along the top of both walls (their bulbs light up each frame)
  for (const sd of [-1, 1]) for (let s = 0; s < 4; s++) { const x0 = cx + sd * (12 + s * 70), x1 = cx + sd * (12 + (s + 1) * 70);
    for (let k = 0; k <= 70; k++) { const x = Math.round(x0 + (x1 - x0) * k / 70), sag = Math.sin(Math.PI * k / 70) * 12; cWallPx(x, Hw - 26 - sag, 3); if (k % 23 === 11) g.bulbs.push([x, Math.round(cWallY(x, Hw - 30 - sag)), [51, 23, 55, 40][(s * 3 + k) % 4]]); } }
  // the left wall: a window on the night, a shield over crossed swords
  { const x0 = cx - 236, w = 72, v0 = 92, h = 92; cFl = 4; cWallRect(x0 - 4, w + 8, v0 - 4, h + 8, BLK); cWallRect(x0 - 2, w + 4, v0 - 2, h + 4, 35); cFl = 0;
    for (let x = x0 + 4; x < x0 + w - 4; x++) for (let v = v0 + 4; v < v0 + h - 4; v++) cWallPx(x, v, (v < v0 + 30 ? 126 : 37) | EMIS);
    for (let x = x0 + 4; x < x0 + w - 4; x++) { const tree = 16 + Math.abs(Math.sin(x * 0.5) * 9) + (x % 9 < 4 ? 8 : 0); for (let v = v0 + 4; v < v0 + 4 + tree; v++) cWallPx(x, v, 52 | EMIS); }
    for (let k = 0; k < 6; k++) cWallPx(x0 + 8 + ((cHash(k, 71) * 54) | 0), v0 + 50 + ((cHash(k, 72) * 34) | 0), 31 | EMIS);
    for (let dx = -8; dx <= 8; dx++) for (let dv = -8; dv <= 8; dv++) if (dx * dx + dv * dv <= 64 && (dx + 4) * (dx + 4) + (dv - 3) * (dv - 3) > 40) cWallPx(x0 + 48 + dx, v0 + 66 + dv, 32 | EMIS);   // a crescent moon
    cFl = 4; cWallRect(x0 + w / 2 - 2, 4, v0, h, 34); cWallRect(x0, w, v0 + h / 2 - 2, w, 34); cWallRect(x0 - 6, w + 12, v0 - 10, 6, BLK); cWallRect(x0 - 4, w + 8, v0 - 8, 4, 35); }
  { const xc = cx - 112, vc = 150; cFl = 4;
    for (const s of [-1, 1]) { const a = [xc - s * 34, cWallY(xc - s * 34, vc - 34)], b = [xc + s * 34, cWallY(xc + s * 34, vc + 34)]; cLine(a[0], a[1], b[0], b[1], BLK, 8); cLine(a[0], a[1], b[0], b[1], 31, 4); const q = [xc + s * 26, cWallY(xc + s * 26, vc + 26)]; cLineO(q[0] - 6, q[1] + 6 * s * 0, q[0] + 6, q[1] + 3, 49, 3); }
    for (let dx = -24; dx <= 24; dx++) for (let dv = -27; dv <= 27; dv++) { const e = (dx / 24) ** 2 + (dv / 27) ** 2; if (e <= 1) cWallPx(xc + dx, vc + dv, e > 0.78 ? BLK : Math.abs(dx) < 2 || Math.abs(dv) < 2 ? 49 : dx + dv > 6 ? 20 : 21); }
    for (let dx = -5; dx <= 5; dx++) for (let dv = -5; dv <= 5; dv++) if (dx * dx + dv * dv <= 25) cWallPx(xc + dx, vc + dv, dx * dx + dv * dv > 15 ? 49 : 50); }
  // the right wall: two shelves of books and a skull; a poster
  for (const [v, n] of [[150, 6], [210, 5]]) {
    const x0 = cx + 64, len = 128, dep = 12, A = [x0, cWallY(x0, v)], B = [x0 + len, cWallY(x0 + len, v)];
    let bx = x0 + 6;
    for (let k = 0; k < n; k++) { const h = cHash(v, k), w = 10 + ((h * 3) | 0) * 2, bh = 26 + ((cHash(k, v) * 4) | 0) * 4, c = [21, 38, 54, 57, 49, 29, 110][(cHash(k + 9, v) * 7) | 0];
      cFl = 4; cWallRect(bx, w, v, bh, BLK); cWallRect(bx + 2, w - 4, v + 2, bh - 4, c); cWallRect(bx + 2, w - 4, v + bh - 10, 2, 51); cWallRect(bx + 2, w - 4, v + 6, 2, 51); bx += w - 2 + (h > 0.7 ? 8 : 0); }
    cFl = 4; cQuad([A, B, [B[0] - dep, B[1] + dep / 2], [A[0] - dep, A[1] + dep / 2]], 35); cQuad([[A[0] - dep, A[1] + dep / 2], [B[0] - dep, B[1] + dep / 2], [B[0] - dep, B[1] + dep / 2 + 4], [A[0] - dep, A[1] + dep / 2 + 4]], 33);
    if (n === 5) { cFl = 5; cSkull(x0 + len - 22, Math.round(cWallY(x0 + len - 16, v)) - 12); }
  }
  { const x0 = cx + 202, w = 58, v0 = 66, h = 96; cFl = 4; cWallRect(x0, w, v0, h, BLK); cWallRect(x0 + 2, w - 4, v0 + 2, h - 4, 26); cWallRect(x0 + 5, w - 10, v0 + 5, h - 10, 20);
    cWallText('ROLL', x0 + 13, v0 + h - 22, 51, 2); cWallText('OR DIE', x0 + 6, v0 + 12, 27, 1);
    for (let dx = -13; dx <= 13; dx++) for (let dv = -14; dv <= 14; dv++) { const hw = 13 * (Math.abs(dv) < 7 ? 1 : 1 - (Math.abs(dv) - 7) / 7.5); if (Math.abs(dx) <= hw) cWallPx(x0 + w / 2 + dx, v0 + 44 + dv, Math.abs(dx) > hw - 2 || Math.abs(dv) > 12 ? BLK : dx - dv < -8 ? 23 : dx - dv > 8 ? 21 : 22); } }
  cWallOn = true;   // everything from here on stands in front of the walls
  // a rug under the table and the chairs, with a border of diamonds
  { const x0 = tX - 70, w = tW + 140, y0 = tY + 54, h = tH + 10; cRound(x0, y0, w, h, 8, BLK); cRound(x0 + 2, y0 + 2, w - 4, h - 4, 7, 20); cFrame(x0 + 8, y0 + 8, w - 16, h - 16, 49); cFrame(x0 + 20, y0 + 20, w - 40, h - 40, 21);
    const dia = (x, y) => { for (let d = -3; d <= 3; d++) cR(x - (3 - Math.abs(d)) * 2, y + d, (3 - Math.abs(d)) * 4 + 1, 1, 50); };
    for (let x = x0 + 30; x < x0 + w - 20; x += 28) dia(x, y0 + h - 14); for (let y = y0 + 30; y < y0 + h - 20; y += 22) { dia(x0 + 14, y); dia(x0 + w - 15, y); } }
  // Dave's chair: a tall red wing chair in front of the corner, its shadow on the floor
  cFl = 3; cEll(cx, sT + 44, 84, 16, 98);
  cFl = 4; cRound(cx - 70, dY - 22, 140, sT - dY + 60, 18, BLK); cRound(cx - 68, dY - 20, 136, sT - dY + 56, 17, 20); cRound(cx - 58, dY - 10, 116, sT - dY + 40, 12, 21);
  for (let b = 0; b < 3; b++) for (let a = 0; a < 4; a++) cR(cx - 45 + a * 30 - 2, dY - 2 + b * 26, 4, 4, 19);
  for (const s of [-1, 1]) { cEllO(cx + s * 70, dY + 30, 9, 30, 20, 19); cEllO(cx + s * 66, dY - 16, 7, 7, 49, 48); }
  // the table: its top, boards along its length, a darker rim; the near edge's face and the near legs; its shadow
  cFl = 3; cR(tX + 8, nearY + 18, tW - 16, 40, 98);
  cFl = 0; cRound(tX - 2, tY - 2, tW + 4, tH + 4, 8, BLK);
  for (let y = 0; y < tH; y++) for (let x = 0; x < tW; x++) { const dx = Math.min(x, tW - 1 - x), dy = Math.min(y, tH - 1 - y); if (dx + dy < 7) continue;
    const pl = (x / 41) | 0, rim = dx < 5 || dy < 4; cP(tX + x, tY + y, rim ? 100 : x % 41 < 2 ? 100 : cHash(pl * 7 + 3, (y / 4) | 0) < 0.16 ? 100 : cHash(pl + 31, (y / 9) | 0) < 0.1 ? 102 : 101); }
  cFl = 4; cR(tX + 2, nearY + 2, tW - 4, 18, BLK); cR(tX + 4, nearY + 2, tW - 8, 12, 99); cR(tX + 4, nearY + 14, tW - 8, 4, 98);
  for (const lx of [tX + 10, tX + tW - 28]) { cR(lx, nearY + 18, 18, 46, BLK); cR(lx + 2, nearY + 18, 14, 44, 98); cR(lx + 2, nearY + 18, 4, 44, 99); }
  // the Dungeon Master's screen: two wings toward us, the middle panel with its skull
  cFl = 5;
  for (const s of [-1, 1]) for (let q = 0; q <= 46; q++) { const x = cx + s * (46 + q), k = q / 46, y0 = Math.round(sT - 8 * k), y1 = Math.round(sB + 10 * k), edge = q >= 45;
    cR(x, y0 - 2, 1, y1 - y0 + 4, BLK); if (!edge) { cR(x, y0, 1, y1 - y0, s < 0 ? 20 : 19); cR(x, y0 + 5, 1, 2, 49); cR(x, y1 - 7, 1, 2, 49); } }
  for (const s of [-1, 1]) { const x = cx + s * 69; for (let d = -6; d <= 6; d++) cR(x - (6 - Math.abs(d)), sT + 30 + d, (6 - Math.abs(d)) * 2 + 1, 1, 50); }
  cR(cx - 48, sT - 2, 96, sB - sT + 4, BLK); cR(cx - 46, sT, 92, sB - sT, 21); cFrame(cx - 41, sT + 5, 82, sB - sT - 10, 49);
  for (const s of [-1, 1]) { cLine(cx - s * 22, sT + 16, cx + s * 22, sT + 52, BLK, 8); cLine(cx - s * 22, sT + 16, cx + s * 22, sT + 52, 25, 4); for (const e of [-1, 1]) cEllO(cx + e * s * 22, sT + 34 + e * 18, 3, 3, 25); }
  cSkull(cx, sT + 30);
  // the map in the middle (0 = the game shows here): a board with a raised frame, its near side's face showing
  cFl = 5; cR(mX - 9, mY - 9, mw + 18, mhI + 24, BLK); cR(mX - 7, mY - 7, mw + 14, mhI + 14, 103); cR(mX - 7, mY + mhI + 7, mw + 14, 6, 101); cR(mX - 7, mY - 7, mw + 14, 2, 103);
  cR(mX - 2, mY - 2, mw + 4, mhI + 4, BLK); cR(mX, mY, mw, mhI, 0);
  // a green banker's lamp on Dave's left (its bulb is lit each frame, while the lamp is on), rule books on his right, two pewter figures
  { const [x, y] = lampP; cFl = 5; cEllO(x, y, 12, 5, 49, 48); cR(x - 2, y - 28, 4, 26, BLK); cR(x - 1, y - 28, 2, 26, 50);
    cTrap(y - 44, y - 30, x - 10, x + 10, x - 20, x + 20, BLK); cTrap(y - 43, y - 31, x - 9, x + 9, x - 18, x + 18, 54); cTrap(y - 43, y - 38, x - 9, x - 2, x - 18, x - 8, 55); cR(x - 20, y - 31, 40, 2, 53); cR(x + 12, y - 30, 1, 8, 50); }
  { const x = tX + tW - 64, y = tY + 12; cFl = 5; cR(x, y + 8, 46, 18, BLK); cR(x + 2, y + 10, 42, 14, 38); cR(x + 2, y + 21, 42, 3, 27); cR(x + 4, y, 40, 14, BLK); cR(x + 6, y + 2, 36, 10, 21); cR(x + 6, y + 9, 36, 3, 26); cR(x + 12, y + 4, 14, 2, 50); }
  for (const [x, y, c] of [[cx - 60, tY + 34, 31], [cx + 52, tY + 36, 26]]) { cFl = 5; cEll(x, y, 6, 3, BLK); cR(x - 3, y - 14, 6, 13, BLK); cR(x - 2, y - 13, 4, 11, c); cEllO(x, y - 16, 2, 2, c); cR(x + 3, y - 12, 2, 8, 30); }
  // candles at the map's corners
  cFl = 6; for (const [x, y] of candles) { cEll(x, y + 17, 9, 4, BLK); cEll(x, y + 16, 7, 3, 49); cR(x - 5, y, 10, 18, BLK); cR(x - 3, y + 2, 6, 14, 26); cR(x + 1, y + 2, 2, 14, 25); cEll(x, y + 1, 3, 1, 27); }
  // the players' places: an armchair (its back here; its arms in front), a sheet, dice, a pencil
  const chairBack = (id) => { const s = seat[id], w = D[id].w, h = D[id].h; cFl = 3; cEll(s.x + w / 2, s.y + h + 18, w / 2 + 10, 12, 98); cFl = 4;
    cRound(s.x - 4, s.y + 22, w + 8, h - 8, 16, BLK); cRound(s.x - 2, s.y + 24, w + 4, h - 12, 15, 34); cRound(s.x + 6, s.y + 32, w - 12, h - 30, 11, 35); cR(s.x - 2, s.y + h - 6, w + 4, 18, 33);
    for (let k = 0; k < 3; k++) cR(s.x + w / 2 - 22 + k * 20, s.y + 40, 4, 4, 33); };
  const chairFront = (id) => { const s = seat[id], w = D[id].w, y = s.clipY; cFl = 4;
    for (const ax of [s.x + 8, s.x + w - 8]) { cEllO(ax, y + 2, 13, 9, 35, 34); cEll(ax - 3, y - 2, 5, 2, 36); cR(ax - 5, y + 12, 10, 16, BLK); cR(ax - 3, y + 12, 6, 14, 33); } };
  const sheet = (x, y, w = 38, h = 30) => { cFl = 6; cR(x, y, w, h, BLK); cR(x + 2, y + 2, w - 4, h - 4, 27); cR(x + 5, y + 4, 8, 7, 25); cR(x + 16, y + 5, w - 22, 2, 24); cR(x + 16, y + 9, w - 28, 2, 24); for (let k = 0; k < 3; k++) cR(x + 5, y + 14 + k * 4, w - 12 - (k % 2) * 8, 2, 25); };
  const dice = (x, y, ramp) => { cFl = 6; cDie(x, y, 6, '', 1, ramp); cR(x + 9, y + 2, 10, 8, BLK); cR(x + 11, y + 4, 6, 4, ramp[3]); cR(x + 13, y + 5, 2, 2, 27); };
  const can = (x, y, c, c2) => { cFl = 6; cR(x, y + 3, 14, 16, BLK); cR(x + 2, y + 4, 10, 14, c); cR(x + 8, y + 4, 4, 14, c2); cR(x + 2, y + 10, 10, 2, 27); cEll(x + 7, y + 3, 6, 3, BLK); cEll(x + 7, y + 3, 5, 2, 31); cR(x + 6, y + 2, 2, 1, 29); };
  for (const id of ['marc', 'aaron', 'chris']) { chairBack(id); chairFront(id); }
  sheet(tX + 10, seat.marc.y + 2); dice(tX + 20, seat.marc.y + 50, BLUE); cFl = 6; cLineO(tX + 46, seat.marc.y + 44, tX + 56, seat.marc.y + 28, 50, 2); can(tX + 30, seat.marc.y + 92, 39, 38);
  sheet(tX + tW - 48, seat.aaron.y + 22); dice(tX + tW - 44, seat.aaron.y + 68, PURPLE); can(tX + tW - 30, seat.aaron.y + 84, 54, 53);
  sheet(tX + tW - 48, seat.chris.y + 4); dice(tX + tW - 44, seat.chris.y + 50, GREEN); cFl = 6; cLineO(tX + tW - 56, seat.chris.y + 46, tX + tW - 50, seat.chris.y + 66, 50, 2);
  // your end: your sheet, your dice, the snacks, and the three miniatures' bases (the figures stand on them each frame)
  sheet(tX + 12, miniY - 46, 46, 36); cFl = 6; cLineO(tX + 62, miniY - 40, tX + 70, miniY - 18, 50, 2);
  dice(tX + tW - 44, miniY - 30, RED);
  { const bx = tX + 34, by = nearY - 22; cFl = 6; cEllO(bx, by, 20, 9, 32, 31); cEll(bx, by - 2, 15, 6, 49); for (let k = 0; k < 8; k++) cR(bx - 12 + ((cHash(k, 5) * 22) | 0), by - 7 + ((cHash(k, 6) * 7) | 0), 5, 3, k % 3 ? 50 : 51); }
  can(tX + tW - 34, nearY - 38, 22, 21);
  for (const m of minis) { cFl = 4; cEll(m.x, m.y + 1, 15, 7, BLK); cEll(m.x, m.y, 13, 5, 66); cEll(m.x - 2, m.y - 1, 9, 3, 67); }
  cWallOn = false;
  // the light, three ways. Lamp on: the banker's lamp and the room's light, brightest on the table,
  // falling off to the corners; the right wall turned from it. Lamp out: the candles' pools and the map's glow.
  const ly = tY + tH * 0.4, lit = new Float32Array(N), dark = new Float32Array(N);
  for (let y = 0, o = 0; y < cH; y++) for (let x = 0; x < cW; x++, o++) {
    const u = Math.abs(x - cx), yb = yC + u / 2, onWall = y < yb && y >= yb - Hw, onFloor = y >= yb && !(x >= tX && x < tX + tW && y >= tY && y < nearY + 18);
    const dx = (x - cx) / (cW * 0.62), dy = (y - ly) / (cH * 0.52); let v = 7.4 - 4.4 * Math.pow(Math.hypot(dx, dy), 1.25);
    { const q = ((x - lampP[0]) ** 2 + (y - lampP[1] + 20) ** 2) / 5200; if (q < 5) v += 1.1 * Math.exp(-q); }
    if (onWall && x > cx) v -= 0.55;
    if (onFloor) v -= Math.max(0, 1 - (y - yb) / 26) * 1.2;   // the floor darkens into the walls' foot
    lit[o] = clamp(v, 2.2, 6.85);
    let d = 1.8; for (const [fx, fy] of candles) { const q = ((x - fx) ** 2 + (y - fy + 6) ** 2) / 4200; if (q < 6) d += 3.6 * Math.exp(-q); }
    const mx = Math.max(mX - x, x - (mX + mw), 0), my = Math.max(mY - y, y - (mY + mhI), 0), q = (mx * mx + my * my) / 2300; if (q < 6) d += 2.3 * Math.exp(-q);
    dark[o] = clamp(d, 1.4, 6.4);
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
  const a = g.face[name] || { table: [g.cx, (g.tY + g.nearY) / 2], mapc: [g.cx, g.mY + g.mh / 2], die: DIE_REST(), skel: cineSkelAt(), corner: [g.cx, g.yC - 70], near: [g.cx, g.miniY - 18], lamp: g.lampP }[name];
  return { x: a[0], y: a[1] + (0.5 - fy) * cH / z, z };
}
const cineCam = s => Array.isArray(s) ? cineV(...s) : s;   // a shot's camera: [name, z, fy] (so a new screen size re-frames it) or a view
// A shot: { dur, cam: [from, to] (the camera drifts from one to the other over the shot), who, as (the
// one Dave is voicing), text (a caption), light ('N' lamp, 'D' lamp out, 'G' green), cut (jump to it) or
// ease (seconds to glide into it), pan: [a, b] (hold the first view until a of the way through, be on
// the second by b), fx: a vision ('dead' | 'wolves' | 'bandits' | 'king' | 'maelis'), wait (it does not
// end on its own), roll (you roll the die), reward [as, text] (choose a reward at the table), onEnd }
const CINE_LIGHT_FX = { dead: 1, wolves: 1, bandits: 1, king: 1, maelis: 1 };
function questShots(stage) {   // a quest at the table: Dave gives it in a few words, as whoever gives it; a friend chimes in
  const q = QUEST_TABLE[stage], out = [];
  q.lines.forEach(([who, as, text, fx], n) => {
    const dur = 1.5 + text.length * 0.05;
    if (who !== 'dave') out.push({ dur, cam: [[who, 2], [who, 2.15]], light: 'N', ease: 0.45, who, text });
    else if (fx) out.push({ dur: dur + 0.6, cam: [['corner', 1.4, 0.42], ['corner', 1.28, 0.4]], light: 'G', cut: true, fx, who, as, text });
    else out.push({ dur, cam: [['dave', n % 2 ? 2.2 : 1.95], ['dave', n % 2 ? 2.05 : 2.1]], light: 'N', ease: 0.45, who, as, text });
  });
  if (q.reward) out.push({ dur: 1, wait: true, cam: [['table', 1.18, 0.4], ['table', 1.2, 0.4]], light: 'N', ease: 0.6, reward: q.reward, onReward: q.after });
  else out[out.length - 1].onEnd = q.after;
  return out;
}
// Round 111: the user's opening (their beat sheet, voiced by them in ElevenLabs; vo/ and sound.js). Dave
// opens the campaign deadpan and the table derails it. The lines run on the voices' own timing and a tap
// moves on, except where the timing is the joke: Marc's die, the pause before EVEN THE KIDS, the silence
// while the skeleton stands up, and Dave cut off mid-word. It plays the first time (and from OPTIONS);
// after that the title is just Dave asking who you are playing.
const vLen = k => (typeof VO_LEN !== 'undefined' && VO_LEN[k]) || 2;
function introShots() {
  const L = (vo, who, text, cam, o = {}) => Object.assign({ vo, who, text, cam, light: 'N', cut: true, dur: (o.pre || 0) + vLen(vo) + (o.gap ?? 0.15) }, o);
  return [
    L('open-01-dave', 'dave', 'FOR A THOUSAND YEARS, OAKHOLLOW HAS BURIED ITS DEAD.', [['wide'], ['dave', 1.45]], { cut: false, gap: 0.1, pre: 1.4 }),
    L('open-02-marc', 'marc', 'SWEET! ROLLING A D20 TO SAVE THE VILLAGE!', [['marc', 2], ['marc', 2.15]], { gap: 0.05 }),
    L('open-03-dave', 'dave', "MARC. WE HAVEN'T STARTED.", [['dave', 2.1], ['dave', 2.25]], { gap: 0 }),
    { dur: 2.25, roll: true, auto: true, face: 1, fx: 'roll', noTap: true, cam: [['die', 3.2, 0.52], ['die', 3.7, 0.52]], light: 'N', cut: true },   // he rolls anyway: a one, in close-up
    L('open-05a-aaron', 'aaron', 'NICE, MARC. YOU KILLED THE WHOLE VILLAGE. I LOOT EVERYONE.', [['aaron', 2], ['aaron', 2.15]], { gap: 0 }),
    L('open-05b-aaron', 'aaron', 'EVEN THE KIDS.', [['aaron', 2.15], ['aaron', 2.3]], { pre: 0.7, cut: false, ease: 0.3, noTap: true }),
    L('open-06-dave', 'dave', "THEY WERE ALREADY DEAD. IT'S A GRAVEYARD.", [['dave', 2], ['dave', 2.1]]),
    L('open-07-dave', 'dave', 'THEN THEY GOT UP.', [['dave', 2.3], ['dave', 2.5]], { gap: 0 }),
    { dur: 1.9, fx: 'rise', noTap: true, cam: [['skel', 2.4], ['skel', 2.9]], light: 'G', cut: true },   // a second and a half of nothing while the skeleton stands up
    L('open-08-chris', 'chris', 'GREAT. NOW THEY WANT THEIR STUFF BACK.', [['chris', 2], ['chris', 2.15]]),
    L('open-09-dave', 'dave', 'AND SOMEONE IS PAYING FOR THEIR BONES.', [['skel', 2], ['skel', 2.4]], { fx: 'coin' }),
    L('open-10-dave', 'dave', 'THE SURVIVORS SPEAK OF SOMETHING OLD, BENEATH THE-', [['mapc', 1.5], ['mapc', 1.75]], { light: 'D', fx: 'glow', gap: 0, noTap: true }),
    L('open-11-aaron', 'aaron', "A BOSS. I'M SAVING MY POTIONS.", [['aaron', 2], ['aaron', 2.15]], { gap: 0.05 }),
    L('open-12-chris', 'chris', "YOU WON'T USE THEM ANYWAY.", [['chris', 2], ['chris', 2.15]], { gap: 0.05 }),
    L('open-13a-dave', 'dave', 'I HAD THREE MORE PAGES.', [['dave', 2.2], ['dave', 2.35]], { gap: 0.3, papers: true }),   // round 111c: the user's line; he looks at his notes and tosses them
  ];
}
function cineShots(kind, cls, opts = {}) {
  if (kind === 'title') {
    const ask = opts.intro ? { dur: vLen('open-13b-dave') + 0.25, vo: 'open-13b-dave', cam: [['dave', 2.35], ['near', 1.4, 0.5]], pan: [0.3, 1], light: 'N', ease: 0.01, who: 'dave', text: 'FINE. WHAT CLASS ARE YOU PLAYING TONIGHT?', minis: true, minisAt: 1.1 }   // (the sigh and the toss on Dave, then down to your miniatures)
      : { dur: 2.4, vo: 'ask-dave', cam: [['wide'], ['wide']], light: 'N', cut: true, who: 'dave', text: 'WHAT CLASS ARE YOU PLAYING TONIGHT?', minis: true };
    return [...(opts.intro ? [{ dur: 1, wait: true, gate: true, cam: [['wide'], ['table', 1.12, 0.46]], light: 'N' }, ...introShots()] : []), ask,
      { dur: 1, wait: true, pick: true, cam: [['near', 1.75, 0.55], ['near', 1.75, 0.55]], ease: 1.5, who: 'dave', text: ask.text, keep: true }];
  }
  if (kind === 'open') { const pk = { warrior: 'barbarian', mage: 'mage', ranger: 'ranger', paladin: 'paladin' }[cls] || 'barbarian';   // (round 111: the opening's story moved to the title; the priest gives his quest in the game)
    return [
      { dur: vLen('pick-' + pk) + 0.35, vo: 'pick-' + pk, cam: [['dave', 1.9], ['dave', 2.1]], light: 'N', ease: 1.1, who: 'dave', text: 'A ' + pk.toUpperCase() + '. GOOD.' },
      { dur: 1, wait: true, roll: true, vo: 'open-15-dave', landVo: 'open-16-dave', landText: 'A NATURAL TWENTY. OF COURSE.', cam: [['table', 1.12, 0.5], ['table', 1.16, 0.5]], light: 'N', ease: 0.7, fx: 'roll', who: 'dave', text: 'YOU REACH THE CAMP. ROLL.' },
      { dur: vLen('open-17-marc') + 0.45, vo: 'open-17-marc', cam: [['marc', 2.1], ['marc', 2.2]], light: 'N', cut: true, who: 'marc', text: "I'LL RE-ROLL." },
      { dur: 1.5, cheer: true, cam: [['table', 1.12, 0.5], ['table', 1.18, 0.5]], light: 'N', cut: true },
    ]; }
  if (kind === 'quest') return questShots(opts.stage);
  if (kind === 'actEnd') return [
    { dur: 2.8, cam: [['dave', 2], ['dave', 2.2]], light: 'N', who: 'dave', text: 'THE OLD KING IS DUST. AGAIN.' },
    { dur: 4, cam: [['dave', 1.7, 0.66], ['dave', 1.3, 0.62]], light: 'G', cut: true, fx: 'maelis', who: 'dave', text: 'BUT MAELIS WENT SOUTH. AND HE TOOK SOMETHING WITH HIM.' },
    { dur: 2.6, cam: [['marc', 2], ['marc', 2.2]], light: 'N', cut: true, who: 'marc', text: 'THEN WE GO SOUTH.' },
    { dur: 3.4, cam: [['wide'], ['table', 1.15, 0.5]], ease: 0.6, who: 'dave', text: 'NEXT WEEK. SOMEBODY ELSE BRINGS THE SNACKS.' },
  ];
  return [];
}

// ---------------------------------------------------------------- running a cinematic
// G.cine = { kind, shots, k, st, ph, cam, ... }. kinds: 'title' (the game opens here: you pick your
// hero from three miniatures), 'open' (a new game: the story in visions, the first quest, your roll,
// into the map), 'resume' (a saved game: into the map), 'quest' (up out of the game to the table for
// a quest and back down), 'actEnd' (up to the table, the night ends).
// ph: 'shots'; 'lift' (out of the game up to the table) and 'drop' (back down into it), the one
// move every visit to the table uses; 'out' (a fade).
let CINE_OFF = null;
function cineOK() {
  if (CINE_OFF === null) { const q = params.get('cine'); CINE_OFF = q !== null ? q === '0' : location.protocol === 'file:'; }   // (off from local files unless asked: the test tools start games there)
  return !CINE_OFF && !PREVIEW;
}
const cineSmooth = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const cineInOut = u => u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function cineLerp(a, b, e) {   // between two views: the zoom in equal ratios, the centre along the path a zoom toward a point takes
  if (e <= 0) return a; if (e >= 1) return b;
  const z = a.z * Math.pow(b.z / a.z, e), w = Math.abs(a.z - b.z) < 0.01 ? e : (1 / a.z - 1 / z) / (1 / a.z - 1 / b.z);
  return { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, z };
}
// The crane: from one view to another by way of the whole table. The zoom follows a curve (in equal
// ratios) that dips to take in the room between them; the centre bends through the table's middle.
function cineArc(a, b, dip = 0.45) { const g = cGeo; return { a, b, lc: Math.log(dip), m: { x: g.cx, y: (g.tY + g.nearY) / 2 - 20 } }; }
function cineArcAt(P, e) {
  const { a, b, lc, m } = P, i = 1 - e, w0 = i * i, w1 = 2 * e * i, w2 = e * e;
  return { x: w0 * a.x + w1 * m.x + w2 * b.x, y: w0 * a.y + w1 * m.y + w2 * b.y, z: Math.max(1, Math.exp(w0 * Math.log(a.z) + w1 * lc + w2 * Math.log(b.z))) };
}
const CINE_SP = {};
function cineSp(kind) {   // a vision's sprites (the game's own), built the first time they are needed
  if (CINE_SP[kind]) return CINE_SP[kind];
  const s = budgetOff(), out = {}, mk = (fam, look, d, clip, n, ent) => { const a = []; for (let f = 0; f < n; f++) a.push(getSprite(fam, look, d, clip, f, ent || { look })); return a; };
  const hent = look => ({ look, cls: 'warrior', combo: 0 });
  if (kind === 'dead') { const L = MONSTERS.skeleton.look; out.L = mk('skeleton', L, 2, 'walk', 8); out.R = mk('skeleton', L, 0, 'walk', 8); }
  if (kind === 'wolves') { const L = MONSTERS.wolf.look; out.L = mk('hound', L, 2, 'walk', 8); out.R = mk('hound', L, 0, 'walk', 8); }
  if (kind === 'bandits') { const L = MONSTERS.brigand.look; out.L = mk('hero', L, 2, 'walk', 8, hent(L)); out.R = mk('hero', L, 0, 'walk', 8, hent(L)); }
  if (kind === 'king') out.A = mk('skeleton', MONSTERS.skelking.look, 1, 'idle', 4);
  if (kind === 'maelis') out.A = mk('hero', NPC_LOOKS.maelis, 1, 'idle', 4, { look: NPC_LOOKS.maelis, cls: 'mage', combo: 0 });
  budgetOn(s); return CINE_SP[kind] = out;
}
function cineLight(to) { const C = G.cine; if (to === C.lB) return; C.lA = C.lt > 0.5 ? C.lB : C.lA; C.lB = to; C.lt = 0; }
function cineShot(k) {
  const C = G.cine, s = C.shots[k], prev = C.shots[C.k]; C.k = k; C.st = 0; C.ev = 0;
  C.chars = s.keep && prev && prev.text === s.text ? C.chars : 0; C.total = s.text ? s.text.length : 0;
  C.camPrev = s.cut ? null : Object.assign({}, C.cam); if (s.cut) C.cam = cineCam(s.cam[0]);
  if (s.light) { if (s.light !== C.lB && s.light !== 'N') sfx('whoomp'); cineLight(s.light); }
  C.fxPrev = C.fx && C.fx !== s.fx && C.fx !== 'roll' ? { fx: C.fx, st: C.fxSt, t: 0 } : null; C.fx = s.fx || null; C.fxSt = 0;
  if (s.fx && s.fx !== 'roll') cineSp(s.fx);
  if (s.fx === 'dead' || s.fx === 'wolves') sfx(s.fx === 'wolves' ? 'growl' : 'cry');
  if (s.roll) { C.rollT = null; C.landed = false; C.dieFace = s.face || 20; }
  voStop(); C.voOn = false; C.voHold = 0;   // round 111: the voices (started by updateCine, which waits for a line still on its way)
  C.typeK = s.vo ? Math.max(24, C.total / Math.max(0.6, (vLen(s.vo) - (s.voFrom || 0)) * 0.8)) : 34;   // (the caption keeps pace with the voice)
  if (s.minis && C.miniIn == null) C.miniIn = G.t + (s.minisAt || 0);
  if (s.papers && C.papersAt == null) C.papersAt = G.t;
  if (s.fx === 'rise' && C.risenAt == null) C.risenAt = G.t;
  if (s.fx === 'coin' && C.coinAt == null) { C.coinAt = G.t + 0.35; C.coinHits = 0; }
  if (s.cheer) { C.cheer = 1.3; for (const w of ['marc', 'aaron', 'chris']) vo('cheer-' + w, 0, true); }
  if (s.pick && C.kind === 'title') try { localStorage.setItem('dcg-intro', '1'); } catch (e) { /* storage blocked */ }
  if (s.reward) {   // the reward: three cards on the table, chosen there (the game's own reward box, over the table)
    openTalk([[s.reward[0], s.reward[1]]], 'COLLECT', s.onReward, rewardChoice()); G.mode = 'cine';
  }
}
function startCine(kind, opts = {}) {
  if (cW !== OW || cH !== OH) cineBuild();
  const P = G.cine, C = G.cine = { kind, intro: !!opts.intro, done: opts.done || null, stages: opts.stage ? [opts.stage] : [], shots: cineShots(kind, hero.cls, opts), k: 0, st: 0, ph: 'shots', pt: 0, chars: 0, total: 0, ev: 0,
    cam: P ? P.cam : cineV('wide'), camPrev: null, lA: P ? P.lB : 'N', lB: P ? P.lB : 'N', lt: 1, bars: P ? P.bars : 0, shake: 0, flash: 0, fi: 0, fx: null, fxSt: 0, fxPrev: null, cheer: 0, view: P ? P.view : null };
  if (kind !== 'title') G.mode = 'cine'; clearInput();
  if (kind === 'title') { C.fi = 0.9; cineShot(0); }
  else if (kind === 'resume') cineDrop(1.9);
  else if (kind === 'quest' || kind === 'actEnd') cineLift();
  else { if (!P) C.fi = 0.8; cineShot(0); }
}
function cineLift() {   // out of the game: the frame holds, the HUD fades, the camera rises off the map to the table
  const C = G.cine; C.ph = 'lift'; C.pt = 0; C.moved = false; C.hold = 0.3; C.pd = 2.2; C.cam = cineV('map'); C.path = cineArc(C.cam, cineCam(C.shots[0].cam[0]), 0.42); C.bars = 0;
}
function cineDrop(dur) {   // back into it: the camera rises off the table and dives into the map; it lands as the game
  const C = G.cine; C.ph = 'drop'; C.pt = 0; C.moved = false; C.hold = 0; C.pd = dur; C.path = cineArc(Object.assign({}, C.cam), cineV('map'), 0.55); cineLight('N');
  if (!(C.fx === 'roll' && C.landed)) C.fx = null; C.fxPrev = null;
}
function cineEnd() { const C = G.cine; G.cine = null; G.mode = 'play'; clearInput(); G.autoTalkT = G.t + 1.2; G.hudInT = G.t; if (C && C.done) C.done(); }   // (a beat in the game before anyone speaks; the HUD fades back in)
function cineMoreQuest() {   // in camp, the next quest may be waiting with the same table: no trip down and back up
  const C = G.cine, st = storyStage();
  if (!LV.hub || !QUEST_TABLE[st] || !CAMP_ROLE[st] || st === 'meet' || C.stages.includes(st)) return null;
  C.stages.push(st); return questShots(st);
}
function cineNext() {
  const C = G.cine, s = C.shots[C.k];
  if (s && s.onEnd && !s.ended) { s.ended = true; s.onEnd(); }
  if (C.k + 1 < C.shots.length) { cineShot(C.k + 1); return; }
  if (C.kind === 'quest') { const more = cineMoreQuest(); if (more) { C.shots.push(...more); cineShot(C.k + 1); return; } }
  if (C.kind === 'actEnd') { C.ph = 'out'; C.pt = 0; } else cineDrop(2.3);
}
function cineSkip() {   // SKIP: what the skipped lines would have done still happens; a reward still waits to be chosen
  const C = G.cine;
  for (;;) {
    for (let k = C.k; k < C.shots.length; k++) { const s = C.shots[k]; if (s.reward && k > C.k) { cineShot(k); return; } if (s.onEnd && !s.ended) { s.ended = true; s.onEnd(); } }
    if (C.kind !== 'quest') break;
    const more = cineMoreQuest(); if (!more) break; C.shots.push(...more); C.k = C.shots.length - more.length; cineShot(C.k); if (C.shots[C.k].reward) return;
  }
  if (C.kind === 'actEnd') cineEnd(); else cineDrop(1.5);
}
function cineRoll() { const C = G.cine; if (C.rollT !== null) return; C.rollT = C.st; C.dieHits = 0; sfx('swing', 0.5); }   // (round 109: the throw whooshes; the clatter is on the landing)
function updateCine(dt) {
  const C = G.cine; if (!C) return;
  C.pt += dt; if (C.fi > 0) C.fi -= dt; if (C.shake > 0) C.shake -= dt; if (C.wobble > 0) C.wobble -= dt; if (C.flash > 0) C.flash -= dt; if (C.cheer > 0) C.cheer -= dt;
  C.lt = Math.min(1, C.lt + dt / 0.7); if (C.fxPrev) { C.fxPrev.t += dt; C.fxPrev.st += dt; if (C.fxPrev.t > 0.5) C.fxPrev = null; }
  const barsTo = C.kind === 'resume' || C.ph === 'drop' || (C.ph === 'lift' && C.pt < C.hold) ? 0 : 1; C.bars = clamp(C.bars + clamp(barsTo - C.bars, -dt * 1.4, dt * 1.8), 0, 1);
  if (C.ph === 'shots') {
    const s = C.shots[C.k], hold = !C.voOn && s.vo && C.st >= (s.pre || 0) && voPending(s.vo) && (C.voHold += dt) < 3;   // (round 111b: a line not loaded yet holds its shot, up to 3 s)
    if (!hold) { C.st += dt; C.fxSt += dt; }
    if (!hold && !C.voOn && C.st >= (s.pre || 0)) { C.voOn = true; if (s.vo) vo(s.vo, s.voFrom || 0); }   // (EVEN THE KIDS waits a beat)
    if (C.voOn) C.chars = Math.min(C.total, C.chars + dt * (C.typeK || 34));
    if (C.papersAt != null && !C.papersTossed && G.t - C.papersAt > PAPER_TOSS) { C.papersTossed = true; sfx('swing', 0.3); }   // (round 111c: the pages go)
    if (C.coinAt != null && C.coinHits < 2) { const T = G.t - C.coinAt; if (T >= COIN_HIT[C.coinHits]) { sfx('clink', C.coinHits ? 0.45 : 1); C.coinHits++; } }
    const u = clamp(C.st / s.dur, 0, 1), a = cineCam(s.cam[0]), b = cineCam(s.cam[1]), path = cineLerp(a, b, s.pan ? cineSmooth((u - s.pan[0]) / (s.pan[1] - s.pan[0])) : u);
    C.cam = C.camPrev && s.ease && C.st < s.ease ? cineLerp(C.camPrev, path, cineSmooth(C.st / s.ease)) : path;
    if (s.fx === 'king' && !C.ev && C.st > 0.55) { C.ev = 1; C.flash = 0.3; C.shake = 0.5; C.cheer = 0.4; sfx('boom'); }
    if (s.fx === 'maelis' && !C.ev && C.st > 0.4) { C.ev = 1; C.flash = 0.2; sfx('whoomp'); }
    if (s.roll) {
      if (C.rollT === null && C.st > (s.auto ? 0.2 : 4.5)) cineRoll();
      if (C.rollT !== null) { const T = C.st - C.rollT;
        for (let n = (C.dieHits || 0); n < 3 && T >= DIE_HIT[n]; n++) { C.dieHits = n + 1; sfx('thunk', [1, 0.6, 0.35][n]); if (n === 0) sfx('clatter', 0.7); C.shake = Math.max(C.shake || 0, [0.16, 0.08, 0.04][n]); C.wobble = Math.max(C.wobble || 0, [0.4, 0.22, 0.1][n]); }   // (round 109: each landing hits the table)
        if (!C.landed && T > DIE_END) { C.landed = true; C.shake = 0.12; C.restDie = String(C.dieFace);
          if (C.dieFace === 20) { sfx('crit'); if (s.landText) { s.text = s.landText; C.chars = 0; C.total = s.text.length; C.typeK = s.landVo ? C.total / (vLen(s.landVo) * 0.8) : 34; } if (s.landVo) vo(s.landVo); }
          else sfx('thunk', 0.5); }   // a one: no fanfare; the camera just sits on it
        if (s.auto ? C.st >= s.dur : T > DIE_END + (s.landVo ? vLen(s.landVo) + 0.35 : 1.85)) cineNext(); }
    } else if (!s.wait && C.st >= s.dur) cineNext();
  } else if (C.ph === 'lift' || C.ph === 'drop') {
    if (!C.moved && C.pt >= C.hold) { C.moved = true; sfx(C.ph === 'lift' ? 'blink' : 'meteor'); }
    const u = clamp((C.pt - C.hold) / (C.pd - C.hold), 0, 1); C.cam = cineArcAt(C.path, cineInOut(u));
    if (u >= 1) { if (C.ph === 'drop') { sfx('whoomp'); cineEnd(); } else { C.ph = 'shots'; cineShot(0); C.camPrev = null; } }
  } else if (C.ph === 'out') { if (C.pt > 0.6) cineEnd(); }
}
function cineLayout() { return { skip: { x: W - 56, y: 0, w: 56, h: 26 } }; }
function cineTap(p) {
  const C = G.cine; if (!C) return;
  if (G.talk) {   // the reward, at the table
    if (!p) { if (G.talk.reward && G.talk.pick < 0) return; const r = talkLayout().btn; p = [r.x + 2, r.y + 2]; }
    talkTap(p); if (!G.talk) { G.mode = 'cine'; cineNext(); } return;
  }
  if (C.ph === 'shots') {
    if (p && inRect(p, cineLayout().skip) && C.kind !== 'resume' && C.kind !== 'title') { sfx('tap'); cineSkip(); return; }
    if (C.fi > 0.4 || C.st < 0.25) return;
    const s = C.shots[C.k];
    if (s.noTap) return;
    if (s.roll) { if (C.rollT === null) cineRoll(); else if (C.landed && C.st - C.rollT > (s.landVo ? DIE_END + vLen(s.landVo) - 0.4 : 1.6)) cineNext(); return; }
    if (s.vo) { if (C.st > 0.3 && !s.wait) cineNext(); return; }   // (a voiced line: a tap moves on)
    if (C.chars < C.total) C.chars = C.total; else if (!s.wait) cineNext();
  } else if (C.ph === 'out') cineEnd();
  else if (C.ph === 'drop' && C.kind === 'resume' && C.pt > 0.3) cineEnd();   // a saved game's dive can be cut short
}
const openingDone = () => { G.lastSt = 'meet'; G.lastStory = G.story; saveGame(); };   // (round 111: Osric gives his quest in the game now, not at the table)
function cineTitleTap(p) {   // round 111: a tap during the opening (the miniatures and PLAY wait for its last two shots)
  const C = G.cine; if (!C || C.kind !== 'title' || C.ph !== 'shots') return false;
  const s = C.shots[C.k]; if (s.pick || s.minis) return false;
  if (s.gate) { if (cineGateReady(C)) { sfx('tap'); cineNext(); } return true; }
  if (inRect(p, cineLayout().skip)) { sfx('tap'); if (C.risenAt == null) C.risenAt = G.t - 9; cineShot(C.shots.length - 2); return true; }
  if (s.noTap || C.st < 0.3 || C.fi > 0.4) return true;
  cineNext(); return true;
}
const cineGateReady = C => C.st > 1.2 && ((voLoaded() > 0.99 && musicLoaded()) || C.st > 12);   // (round 111b: everything has arrived, or 12 s have gone by)
const introWanted = () => { if (params.get('intro') === '1') return true; try { return !localStorage.getItem('dcg-intro'); } catch (e) { return true; } };

// ---------------------------------------------------------------- each frame: the visions, the miniatures, the die, the people
function cineBox(sp) {   // the rows a sprite's figure really fills (its picture has empty margins)
  if (sp.box) return sp.box; let y0 = sp.h, y1 = 0;
  for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) if (sp.data[j * sp.w + i]) { if (j < y0) y0 = j; y1 = j; break; }
  return sp.box = [y0, y1];
}
function cineFx(fx, st, a) {   // a vision on the walls: st its time so far, a how much of it shows
  const g = cGeo, t = G.t, S = cineSp(fx);
  if (S.L) {   // a march out of the corner, along both walls, out from behind Dave's chair
    for (let j = 0; j < 16; j++) { const sd = j % 2 ? 1 : -1, u = 18 + st * 70 - (j >> 1) * 40; if (u < 18 || u > 300) continue;
      const sp = (sd < 0 ? S.L : S.R)[(Math.floor(t * 10) + j * 3) % 8], x = g.cx + sd * u;
      cineGhost(sp, x, cWallY(x, 12) + (sp.ay - cineBox(sp)[1]), 1, cH, a); }
  } else if (fx === 'king') {   // the king, rising out of the corner behind the chair until his crown nears the beam
    if (st < 0.5) return; const sp = S.A[Math.floor(t * 5) % 4], up = 1 - Math.pow(1 - clamp((st - 0.5) / 1.6, 0, 1), 3);
    cineGhost(sp, g.cx, g.yC - g.Hw + 30 + (sp.ay - cineBox(sp)[0]) * 2 + (1 - up) * 190 + Math.round(Math.sin(t * 2.3) * 2), 2, cH, a * Math.min(1, (st - 0.5) / 0.4 + 0.3));
  } else if (fx === 'maelis') {   // the man behind it all, in his hood
    if (st < 0.4) return; const sp = S.A[Math.floor(t * 5) % 4];
    cineGhost(sp, g.cx, g.yC - g.Hw + 36 + (sp.ay - cineBox(sp)[0]) * 3 + Math.round(Math.sin(t * 2) * 2), 3, cH, a * Math.min(1, (st - 0.4) / 0.5) * 0.9);
  }
}
function cineMinis() {   // the three miniatures at your end of the table; yours wears your gear, once you are playing
  const g = cGeo, title = G.mode === 'title', sel = title ? TITLE.sel : hero.cls, s = budgetOff();
  for (const m of g.minis) {
    const look = !title && m.cls === hero.cls ? hero.look : TITLE.looks && TITLE.looks[m.cls]; if (!look) continue;
    const on = m.cls === sel, ent = { look, cls: m.cls, combo: 0 };
    let clip = 'idle', f = Math.floor(G.t / 0.2 + m.x) % 4, hop = 0;
    if (on && title && G.t - TITLE.pickT < 1.6) {   // picked: it hops and swings, as the old title's heroes did
      const bow = m.cls === 'ranger', list = weaponSwing(look, 0), tot = list.reduce((q, k) => q + k.ms, 0), ms = ((G.t - TITLE.pickT) * 1000) % (tot + 500), k = ms < tot ? swingKey(list, ms) : -1;
      if (k >= 0) { clip = bow ? 'shoot' : 'attack'; f = k; } hop = Math.round(Math.max(0, Math.sin((G.t - TITLE.pickT) * 9)) * 6 * Math.max(0, 1 - (G.t - TITLE.pickT) / 0.7));
    }
    const C = G.cine, k0 = C && C.intro && C.kind === 'title' ? (C.miniIn == null ? -1 : (G.t - C.miniIn - g.minis.indexOf(m) * 0.09) / 0.45) : 2;   // (round 111: in the opening, they hop onto their bases when Dave asks)
    if (k0 < 0) continue;
    const drop = k0 >= 1 ? 0 : Math.round(k0 < 0.7 ? 46 * (1 - (k0 / 0.7) ** 2) : 7 * Math.sin((k0 - 0.7) / 0.3 * Math.PI));
    if (on && k0 >= 1) { cFl = 0; const pulse = Math.floor(G.t * 3) % 2; for (let q = 0; q < 64; q++) { const a = q / 64 * 6.283, x = Math.round(m.x + Math.cos(a) * 18), y = Math.round(m.y + Math.sin(a) * 8); cP(x, y, (pulse ? 51 : 50) | EMIS); cP(x + 1, y, (pulse ? 50 : 49) | EMIS); } }
    const wob = G.cine && G.cine.wobble > 0 ? G.cine.wobble : 0, wx = wob ? Math.round(Math.sin(G.t * 70 + m.x) * wob * 4) : 0; hop += wob ? Math.round(Math.abs(Math.sin(G.t * 45 + m.x)) * wob * 5) : 0;   // (round 109: the die's landing rattles the miniatures)
    const sp = getSprite('hero', look, 1, clip, f, ent, 1), X0 = m.x - sp.ax + wx, Y0 = m.y - 3 - hop - drop - sp.ay; cFl = on ? 6 : 5;
    for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) { const v = sp.data[j * sp.w + i]; if (v) cP(X0 + i, Y0 + j, v); }
  }
  budgetOn(s);
}
// round 109 (the user: it clipped through the miniatures and never felt like it hit the table): thrown from
// your seat into the open table IN FRONT of the miniatures (between two bases), so it never crosses them; it
// falls into a hard first impact (squash, thud, the table shakes, the miniatures wobble), two smaller
// bounces, a short tumble that slows (the faces turn slower and slower), a rock, and a twenty
const DIE_HIT = [0.42, 0.74, 0.95], DIE_END = 1.15;
function dieTrack(T) {   // ground position (x, y on the table), height z, squash (0..1) at time T
  const g = cGeo, L = (a, b, u) => a + (b - a) * u, ez = u => 1 - (1 - u) * (1 - u);
  const P = [[g.cx + 26, cH + 46], [g.cx + 50, g.miniY + 34], [g.cx + 58, g.miniY + 27], [g.cx + 63, g.miniY + 23], [g.cx + 65, g.miniY + 22]];
  let x, y, z = 0, sq = 0;
  if (T < DIE_HIT[0]) { const u = T / DIE_HIT[0]; x = L(P[0][0], P[1][0], u); y = L(P[0][1], P[1][1], u); z = (1 - u) * 46 + 64 * Math.sin(Math.PI * u); }
  else if (T < DIE_HIT[1]) { const u = (T - DIE_HIT[0]) / (DIE_HIT[1] - DIE_HIT[0]); x = L(P[1][0], P[2][0], u); y = L(P[1][1], P[2][1], u); z = 20 * Math.sin(Math.PI * u); }
  else if (T < DIE_HIT[2]) { const u = (T - DIE_HIT[1]) / (DIE_HIT[2] - DIE_HIT[1]); x = L(P[2][0], P[3][0], u); y = L(P[2][1], P[3][1], u); z = 7 * Math.sin(Math.PI * u); }
  else { const u = Math.min(1, (T - DIE_HIT[2]) / (DIE_END - DIE_HIT[2])); x = L(P[3][0], P[4][0], ez(u)); y = L(P[3][1], P[4][1], ez(u)); }
  for (let n = 0; n < 3; n++) { const d = T - DIE_HIT[n]; if (d >= 0 && d < 0.07) sq = Math.max(sq, (1 - d / 0.07) * (n === 0 ? 1 : n === 1 ? 0.6 : 0.35)); }
  return { x, y, z, sq, rock: T > DIE_HIT[2] && T < DIE_END + 0.25 ? Math.sin((T - DIE_HIT[2]) * 30) * Math.max(0, 1 - (T - DIE_HIT[2]) / 0.45) : 0 };
}
function cDieSq(cx, cy, r, label, z, ramp, sq, rock) {   // the die squashed on impact (wider, lower) and rocking as it settles
  const ry = Math.max(3, Math.round(r * (1 - 0.28 * sq))), rx = r * (1 + 0.22 * sq), lean = rock * 0.18;
  for (let pass = 0; pass < 2; pass++) { const R = pass ? ry : ry + 2, RX = pass ? rx : rx + 2;
    for (let y = -R; y <= R; y++) { const hw = Math.round(RX * 0.88 * (Math.abs(y) < R / 2 ? 1 : 1 - (Math.abs(y) - R / 2) / (R / 2) * 0.98)), sh = Math.round(y * lean);
      for (let x = -hw; x <= hw; x++) cP(cx + x + sh, cy + y, !pass ? BLK : x + y * 0.8 < -r * 0.45 ? ramp[4] : x + y * 0.8 > r * 0.55 ? ramp[2] : ramp[3]); } }
  if (label) cText(label, cx - Math.floor((label.length * 4 - 1) * z / 2), cy - Math.floor(5 * z / 2), 27, z);
}
function cineDie(T) {
  const g = cGeo, D = dieTrack(T), yf = g.miniY + 22, near = clamp((D.y - yf) / (cH + 46 - yf), 0, 1);
  const r = Math.round(11 + 26 * near + D.z * 0.05);
  // its shadow on the table: tight and dark when it is close to the table, wide and faint high up
  cFl = 0; const lift = Math.min(1, D.z / 70); cEll(Math.round(D.x + D.z * 0.18), Math.round(D.y + r * 0.55), Math.max(3, Math.round(r * (0.95 - 0.35 * lift))), Math.max(2, Math.round(r * (0.32 - 0.12 * lift))), 2);
  const want = (G.cine && G.cine.dieFace) || 20, phase = T >= DIE_END ? 0 : 26 * T - 11 * T * T, face = T >= DIE_END ? String(want) : String(1 + (Math.floor(phase) * 7) % 19);
  cFl = 6; cDieSq(Math.round(D.x), Math.round(D.y - D.z), r, face, Math.max(1, Math.round(r / 10)), RED, D.sq, D.rock);
  if (want === 20 && T >= DIE_END && T < 1.75) {   // the twenty: a ring of gold and red sparks, a glow round the die
    cFl = 0; const q = 12 + (T - DIE_END) * 110;
    for (let a = 0; a < 16; a++) cR(Math.round(D.x + Math.cos(a * 0.3927) * q), Math.round(D.y + Math.sin(a * 0.3927) * q * 0.5), 3, 3, (a % 2 ? 18 : 51) | EMIS);
    if (T < 1.45) for (let a = 0; a < 40; a++) { const t2 = a / 40 * 6.283; cP(Math.round(D.x + Math.cos(t2) * (r + 4)), Math.round(D.y + Math.sin(t2) * (r + 4)), 51 | EMIS); }
  }
}
// Round 111, the opening's props: the die where it fell, the skeleton miniature lying on the map (it stands
// up in the green), the silver coin that drops onto it, and a sick glow seeping out from under the map.
const DIE_REST = () => [cGeo.cx + 65, cGeo.miniY + 22];
const cineSkelAt = () => [Math.round(cGeo.mX + cGeo.mw * 0.63), Math.round(cGeo.mY + cGeo.mh * 0.6)];
const COIN_HIT = [0.42, 0.62];
function cineSkelMini(C) {
  const [x, y] = cineSkelAt(), L = MONSTERS.skeleton.look, b = budgetOff();
  const up = C.risenAt == null ? 0 : clamp((G.t - C.risenAt - 0.3) / 0.6, 0, 1), k = 1 - Math.pow(1 - up, 3);
  const ang = (1 - k) * 1.5708 - (up > 0 && up < 1 ? Math.sin(up * Math.PI) * 0.12 : 0), co = Math.cos(ang), si = Math.sin(ang);   // lying on its side, then up (a little lurch)
  cFl = 4; cEll(x, y + 1, 11, 5, BLK); cEll(x, y, 9, 3, 66); cEll(x - 2, y - 1, 6, 2, 67);
  const green = C.lB === 'G' || C.lA === 'G';
  if (up > 0 && green) { cFl = 0; for (let q = 0; q < 40; q++) { const a = q / 40 * 6.283; if (cHash(q, Math.floor(G.t * 8)) < 0.5) cP(Math.round(x + Math.cos(a) * 12), Math.round(y + Math.sin(a) * 5), 72 | EMIS); } }
  const sp = getSprite('skeleton', L, 1, 'idle', up >= 1 ? Math.floor(G.t / 0.2) % 4 : 0, { look: L }, 1), R = Math.max(sp.w, sp.h);
  cFl = 5;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {   // turned about its feet, a pixel at a time
    const sx = Math.round(sp.ax + co * dx + si * dy), sy = Math.round(sp.ay - si * dx + co * dy);
    if (sx < 0 || sy < 0 || sx >= sp.w || sy >= sp.h) continue; const v = sp.data[sy * sp.w + sx]; if (v) cP(x + dx, y - 2 + dy, v);
  }
  if (up >= 1 && green) { cFl = 0; const hy = y - 2 - sp.ay + Math.round(sp.h * 0.17); cP(x - 2, hy, 72 | EMIS); cP(x + 1, hy, 72 | EMIS); }   // its eyes catch the green
  budgetOn(b);
  if (C.coinAt != null && G.t >= C.coinAt) {   // a silver coin, spinning down onto the bones, then off them onto the base
    const T = G.t - C.coinAt, [h0, h1] = COIN_HIT;
    let cx = x + 1, z = 0;
    if (T < h0) z = 70 * (1 - (T / h0) ** 2) + 10; else if (T < h1) { const u = (T - h0) / (h1 - h0); cx = x + 1 + 7 * u; z = 10 * (1 - u) + 7 * Math.sin(u * Math.PI); } else cx = x + 8;
    const cy = y + (T < h0 ? -2 : 2), spin = T < h1 ? 0.35 + 0.65 * Math.abs(Math.cos(T * 22)) : 1;
    const X = Math.round(cx), Y = Math.round(cy - z), rx2 = Math.max(1, Math.round(4 * spin));
    cFl = 0; if (z < 40) cEll(X, cy + 2, 4, 1, 2);
    if (T < h0) for (let q = 1; q < 5; q++) cP(X + (q & 1), Y - q * 4, (q < 3 ? 26 : 25) | EMIS);   // a glint trailing it down
    cFl = 6; cEll(X, Y, rx2 + 1, 4, BLK); cEll(X, Y, rx2, 3, 25 | EMIS); cEll(X, Y - 1, Math.max(0, rx2 - 1), 1, 26 | EMIS); cP(X - 1, Y - 1, 27 | EMIS);
    const hit = Math.min(Math.abs(T - h0), Math.abs(T - h1));   // a spark where it rings off the bone
    if (hit < 0.12) { const r = 3 + Math.round(hit * 40); for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cP(X + ex * r, Y + ey * r, 27 | EMIS); }
  }
}
const PAPER_TOSS = 1.75;
function cinePapers(C) {   // round 111c: Dave's three more pages: up over his screen, a look, then tossed aside onto the table
  const g = cGeo, T = G.t - C.papersAt, rise = cineSmooth(T / 0.3);
  for (let n = 2; n >= 0; n--) {   // three sheets; the top one is drawn last
    const u = clamp((T - PAPER_TOSS - n * 0.08) / 0.55, 0, 1), a0 = -0.08 + n * 0.06;
    const hx = g.cx - 3 + n * 3, hy = g.sT + 16 - 26 * rise - n * 2 + (T > 0.3 && T < PAPER_TOSS ? Math.round(Math.sin(T * 6 + n) * 0.7) : 0);
    const lx = g.cx + 66 + n * 8, ly = g.tY + 13 + n * 3, k = cineSmooth(u);
    const x = hx + (lx - hx) * k, y = hy + (ly - hy) * k - Math.sin(u * Math.PI) * 26, a = a0 + u * (2.4 + n * 0.8), sy = 1 - 0.45 * u;   // (it ends lying flat: shorter)
    const ca = Math.cos(a), sa = Math.sin(a), w = 16, h = 11, P = (px, py) => [Math.round(x + px * ca - py * sa), Math.round(y + (px * sa + py * ca) * sy)];
    cFl = 6; cQuad([P(-w - 1, -h - 1), P(w + 1, -h - 1), P(w + 1, h + 1), P(-w - 1, h + 1)], BLK); cQuad([P(-w, -h), P(w, -h), P(w, h), P(-w, h)], n ? 26 : 27);
    for (let r = -h + 3; r < h - 1; r += 3) { const [x0, y0] = P(-w + 3, r), [x1, y1] = P(w - 3 - ((r * 7 + n * 5) & 7), r); cLine(x0, y0, x1, y1, 25, 1); }   // his handwriting
  }
}
function cineGlow(st) {   // something old, beneath: a sick green light spilling out from under the map onto the table, pulsing
  const g = cGeo, a = Math.min(1, st / 0.9) * (0.75 + 0.25 * Math.sin(G.t * 3.1)), R = 12, x0 = Math.round(g.mX), y0 = Math.round(g.mY), x1 = Math.round(g.mX + g.mw), y1 = Math.round(g.mY + g.mh); cFl = 0;
  for (let y = y0 - R; y < y1 + R; y++) for (let x = x0 - R; x < x1 + R; x++) {
    const dx = x < x0 ? x0 - x : x >= x1 ? x - x1 + 1 : 0, dy = y < y0 ? y0 - y : y >= y1 ? y - y1 + 1 : 0; if (!dx && !dy) { x = Math.max(x, x1 - 1); continue; }
    const d = Math.max(dx, dy), k = a * (1 - d / R) * (0.8 + 0.2 * Math.sin(x * 0.21 + y * 0.17 - G.t * 2.4));
    if (BAYER[((y & 3) << 2) | (x & 3)] < k * 0.9) cP(x, y, (k > 0.6 ? 72 : 55) | EMIS);
  }
}
function cineDynamic(C) {
  const g = cGeo, t = G.t, mix = C.lA === C.lB ? 0 : C.lt, wN = C.lB === 'N' ? (C.lA === 'N' ? 1 : C.lt) : C.lA === 'N' ? 1 - C.lt : 0, green = C.lB === 'G' ? mix || 1 : C.lA === 'G' ? 1 - mix : 0;
  const s = C.ph === 'shots' ? C.shots[C.k] : null, speaker = !s || !s.text ? null : s.vo ? (C.voOn && C.st - (s.pre || 0) < vLen(s.vo) - (s.voFrom || 0) - 0.1 ? s.who : null) : C.chars < C.total ? s.who : null;
  cFl = 0;
  if (wN > 0.5) {   // the banker's lamp and the string lights
    const [lx, ly] = g.lampP; cEll(lx, ly - 30, 14, 2, 18 | EMIS); cR(lx - 3, ly - 30, 6, 2, 27 | EMIS);
    for (let k = 0; k < g.bulbs.length; k++) { const [x, y, c] = g.bulbs[k]; if (Math.sin(t * 1.7 + k * 2.4) < -0.75) continue; cR(x - 1, y, 3, 4, c | EMIS); cR(x, y - 1, 1, 6, c | EMIS); }
  }
  if (C.fxPrev) cineFx(C.fxPrev.fx, C.fxPrev.st, 1 - C.fxPrev.t / 0.5);
  if (C.fx && C.fx !== 'roll') cineFx(C.fx, C.fxSt, 1);
  if (C.intro) cineSkelMini(C);
  if (C.fx === 'glow') cineGlow(C.fxSt);
  cineMinis();
  for (const id of ['dave', 'marc', 'aaron', 'chris']) {
    const P = CINE_PEOPLE[id], q = g.seat[id], talking = speaker === id;
    let bob = talking ? Math.round(Math.sin(t * 10) * 1.2 - 0.5) : Math.round(Math.sin(t * 1.3 + q.ph) * 0.7);
    if (id !== 'dave' && C.cheer > 0) bob -= Math.round(3 * Math.abs(Math.sin(C.cheer * 14)));   // the table reacts: the king, a twenty
    cineBust(P, q.x, q.y + bob, P.lit[C.lA], P.lit[C.lB], mix, q.clipY, ((t + q.ph * 1.7) % 3.9) < 0.13, talking && Math.floor(t * 9) % 2 === 0, q.fadeY);
  }
  cFl = 6; for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const fx = g.cx + sd * (16 + k * 8); cEll(fx, g.sT - 1, 4, 6, BLK); cEll(fx, g.sT - 2, 3, 5, wN > 0.5 ? 63 : 61, wN > 0.5 ? 62 : 60); }   // Dave's fingers over his screen
  if (C.papersAt != null && C.kind === 'title') cinePapers(C);
  cFl = 0;
  for (const [x, y] of g.candles) { const k = Math.floor(t * 9 + x) % 3, gr = green > 0.5; cEll(x + (k === 1 ? 1 : 0), y - 6, 3, 5 + (k === 2 ? 1 : 0) + (gr ? 2 : 0), (gr ? 55 : 16) | EMIS); cEll(x, y - 4, 1, 3, (gr ? 72 : 18) | EMIS); }
  if (wN > 0.5) for (let k = 0; k < 12; k++) {   // dust in the light
    const x = Math.round(g.cx + (cHash(k, 1) - 0.5) * 300 + Math.sin(t * 0.6 + k) * 7), y = Math.round(g.yC - 60 + ((((cHash(k, 2) * 300 - t * (5 + cHash(k, 3) * 7)) % 300) + 300) % 300));
    if (Math.sin(t * 1.7 + k * 2.1) < -0.2 || (Math.abs(x - g.cx) < 50 && y < g.sT)) continue;
    cR(x, y, 2, 2, 11 | EMIS);
  }
  if (s && s.roll && C.rollT !== null && C.rollT !== undefined) cineDie(C.st - C.rollT);
  else if (C.restDie) { const [x, y] = DIE_REST(); cFl = 0; cEll(x, y + 6, 10, 3, 2); cFl = 6; cDieSq(x, y, 11, C.restDie, 1, RED, 0, 0); }   // (round 111: a thrown die stays where it fell)
}
// The game's own picture (no HUD) is kept when the world was drawn this frame (`fresh`): every
// fourth frame while a shot plays, every second during a lift or a drop (cineHolds).
function cineFull() { const C = G.cine; return C.ph === 'lift' || C.ph === 'drop'; }
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
  if (cW !== OW || cH !== OH) { cineBuild(); C.camPrev = null; if (C.path) C.path = cineArc(C.ph === 'drop' ? cineV('wide') : cineV('map'), C.ph === 'drop' ? cineV('map') : cineCam(C.shots[0].cam[0])); C.cam = C.ph === 'shots' ? cineCam(C.shots[C.k].cam[1]) : cineV('wide'); }   // (a new screen size: the room is rebuilt and every shot re-framed)
  if (fresh) { cGame.set(ov32); cGameOK = true; cMiniOK = false; }
  const g = cGeo, bufs = { N: cCN, D: cCD, G: cCG }, A = bufs[C.lA], B = bufs[C.lB];
  if (C.lA === C.lB || C.lt >= 1) cC.set(B);
  else { const m = C.lt; for (let y = 0, o = 0; y < cH; y++) { const by = (y & 3) << 2; for (let x = 0; x < cW; x++, o++) cC[o] = BAYER[by | (x & 3)] < m ? B[o] : A[o]; } }
  const z = Math.max(1, C.cam.z), iz = 1 / z, hw = cW / 2, hh = cH / 2, mw = g.mw, mX = g.mX, mY = g.mY;
  if (!cineFull() || z < 1.5) { if (!cMiniOK) cineMini(); for (let j = 0; j < g.mhI; j++) cC.set(cMini.subarray(j * mw, (j + 1) * mw), (mY + j) * cW + mX); }
  cDyn = true; cineDynamic(C); cDyn = false;
  let vx = clamp(C.cam.x, hw * iz, cW - hw * iz), vy = clamp(C.cam.y, hh * iz, cH - hh * iz);
  if (C.shake > 0) { const a = Math.min(1, C.shake / 0.3) * 5 * iz; vx = clamp(vx + Math.sin(G.t * 83) * a, hw * iz, cW - hw * iz); vy = clamp(vy + Math.sin(G.t * 97 + 1) * a, hh * iz, cH - hh * iz); }
  C.view = { vx, vy, z };   // (the title's taps and labels find the miniatures through it)
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
  const s0 = C.ph === 'shots' ? C.shots[C.k] : null, tall = s0 && s0.text && wrapText(s0.text, 32).length === 3, bt = Math.round(12 * C.bars), bb = Math.round((tall ? 64 : 50) * C.bars);
  if (C.flash > 0) { const a = Math.min(0.85, C.flash / 0.3), col = PAL32[C.lB === 'G' ? 124 : 27]; for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) if (BAYER[((y & 3) << 2) | (x & 3)] < a) out32[o] = col; }
  if (bt) fillRect(0, 0, W, bt, BLK); if (bb) fillRect(0, H - bb, W, bb, BLK);
  if (C.ph === 'shots' && C.bars > 0.9 && !G.talk) {
    const s = C.shots[C.k], y0 = H - (tall ? 64 : 50);
    if (s.text) {
      const P = CINE_PEOPLE[s.who], big = wrapText(s.text, 32), z = big.length <= 3 ? 2 : 1, lines = z === 2 ? big : wrapText(s.text, 60);
      const nm = s.who === 'dave' ? (s.as ? 'DAVE, AS ' + s.as : 'DAVE') : P.name;
      textC(nm, W / 2, y0 + 5, P.col);
      let left = Math.floor(C.chars); const lh = z === 2 ? 13 : 8, ty = y0 + 15 + (lines.length === 1 && z === 2 ? 6 : 0);
      for (let k = 0; k < lines.length && left > 0; k++) { const l = lines[k]; text(l.slice(0, left), Math.round(W / 2 - textWidth(l, z) / 2), ty + k * lh, 26, z); left -= l.length + 1; }
    }
    if (s.roll && C.rollT === null && C.st > 0.8 && Math.floor(G.t * 2.5) % 2 === 0) textC('TAP TO ROLL', W / 2, Math.round(H * 0.62), 51, 2);
    if (s.gate) {   // round 111b: the table gets ready before the night starts
      const y = H - 44;
      if (cineGateReady(C)) { if (Math.floor(G.t * 1.6) % 2 === 0) textC('TAP TO SIT DOWN', W / 2, y, 51, 2); textC('SOUND ON', W / 2, y + 20, 24); }
      else { const n = Math.round(voLoaded() * 10); textC('THE OTHERS ARE SITTING DOWN' + '...'.slice(0, 1 + Math.floor(G.t * 2) % 3), W / 2, y, 26); cR0(W / 2 - 50, y + 12, n); }
    }
    if (C.kind !== 'resume' && (C.kind !== 'title' || !(s.minis || s.pick))) textC('SKIP', W - 16, 4, 24);
  }
  if (G.talk) drawTalk();   // a reward chosen at the table
  if (C.fi > 0) fade(Math.min(1, C.fi / 0.7));
  if (C.ph === 'out') fade(Math.min(1, C.pt / 0.5));
}
// The game opens at the table: you are the fifth seat. Dave asks who you are playing; your three
// miniatures stand in front of you. Tap one, then PLAY (or CONTINUE a saved hero).
function drawTableTitle(btn) {
  const C = G.cine; drawCineHud();
  if (C.bars > 0.5) textC('DUNGEONS OF BONES', W / 2, 4, 22);
  const V = C.view; if (!V) return;
  const toS = (x, y) => [((x - V.vx) * V.z + cW / 2) / SPX, ((y - V.vy) * V.z + cH / 2) / SPX], pickK = C.shots.length - 1, ready = C.k === pickK && C.st > 1.1 && !TITLE.opts, live = C.k >= pickK - 1;   // (round 111: the opening runs first)
  for (const m of cGeo.minis) {
    const [sx, sy] = toS(m.x, m.y), info = CLASS_INFO[m.cls], save = loadSave(m.cls), on = TITLE.sel === m.cls;
    if (ready) { textC(info.name, Math.round(sx), Math.round(sy + 8), on ? info.col : 25); textC(save ? 'LEVEL ' + (save.hero ? save.hero.lvl : 1) : 'NEW', Math.round(sx), Math.round(sy + 16), save ? (on ? 51 : 49) : 24); }
    if (!TITLE.opts && live) UI.titleBtns.push({ x: sx - 22, y: sy - 40, w: 44, h: 64, on: () => { titlePick(m.cls); if (C.k < pickK) cineShot(pickK); } });
  }
  if (ready) {
    const cls = TITLE.sel, save = loadSave(cls), info = CLASS_INFO[cls], by = Math.round(H * 0.67);
    textC(info.lines.join('. '), W / 2, by - 12, 26);
    btn(save ? `CONTINUE  LEVEL ${save.hero ? save.hero.lvl : 1}` : `PLAY THE ${info.name}`, W / 2 - 80, by, 160, 24, () => startGame(!!save, cls), 51, 6, 51);
    if (save) btn(TITLE.eraseT > G.t ? 'TAP AGAIN: ERASE LEVEL ' + (save.hero ? save.hero.lvl : 1) : 'START OVER', W / 2 - 80, by + 30, 160, 16, () => { if (TITLE.eraseT > G.t) startGame(false, cls); else TITLE.eraseT = G.t + 3; }, TITLE.eraseT > G.t ? 23 : 25, 3, 6);
  }
  if (C.k === pickK) {
    if (TITLE.opts) { fade(0.8); drawTitleOptions(btn, Math.round(H * 0.5)); drawTitleCredits(Math.round(H * 0.5) + 30); }
    btn(TITLE.opts ? 'OPTIONS  -' : 'OPTIONS  +', W - 70, 16, 64, 14, () => { TITLE.opts = !TITLE.opts; }, 25, 3, 6);
  }
}

function cR0(x, y, n) { fillRect(x, y, 100, 4, 3); fillRect(x, y, n * 10, 4, 51); }   // a little loading bar (ten steps)

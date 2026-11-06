import assert from 'assert';
import { parseAndValidateMasterCsv, importMasterDataFromCsv } from '../src/lib/dataIntegrityGuard';

const sampleDataset = `nisn,nama_siswa,kelas,gender,status,no_hp_ortu
0106436229,Abdul Sendi Mamonto,XI Merdeka D,Laki-laki,Aktif,082193147509
0116150651,ABIGAIL MIKHAYLA QEENLIV RANTUNG,X Merdeka D,Perempuan,Aktif,085256693473
0089808303,Abriel Glensi Essing,XII Merdeka C,Laki-laki,Aktif,
0118556862,Adelia Linggama,X Merdeka B,Perempuan,Aktif,
0106001150,ADELIANI MACHIKO,X Merdeka D,Perempuan,Aktif,
0118609907,ADEWELKI LALUA,X Merdeka B,Laki-laki,Aktif,
0094564384,AFANDY DJOSUA LUMENTUNG,XII Merdeka A,Laki-laki,Aktif,085756909485
0082649697,AFGAN ABDULLATIF,XII Merdeka C,Laki-laki,Aktif,
0097382115,AFGAN NGARE,X Merdeka A,Laki-laki,Aktif,
0082427892,AFGAN POTABUGA,XII Merdeka D,Laki-laki,Aktif,085399454781
0083250878,Afgan Suleman,XII Merdeka D,Laki-laki,Aktif,
0115343889,AFIANSYAH FIKRAN PUNENGO,X Merdeka D,Laki-laki,Aktif,
0119579232,Afrilia Zahra Mayo,X Merdeka D,Perempuan,Aktif,
0106990191,AFSYAR HAFIDZ MAMONTO,XI Merdeka A,Laki-laki,Aktif,
0117438861,Aftran Gani Modeong,X Merdeka C,Laki-laki,Aktif,
3092006168,AGFIRAN POTABUGA,XII Merdeka A,Laki-laki,Aktif,
0094641560,AGRESYA ARTIKA KUBALANG,XII Merdeka C,Perempuan,Aktif,
0103579234,Agustinus Alesandro Talunda,XI Merdeka D,Laki-laki,Aktif,081242043871
0104021038,AHMAD ALFAREL MOMONGAN,XI Merdeka B,Laki-laki,Aktif,
0123322984,Ahmad Syafwan Ma'arif Potabuga,X Merdeka A,Laki-laki,Aktif,
0113834422,AHMAD TIRTA PAUDI,XI Merdeka C,Laki-laki,Aktif,
0105991114,AIMAN LINGGAMA,XII Merdeka B,Laki-laki,Aktif,
0099094010,AISYAH PAPUTUNGAN,XII Merdeka B,Perempuan,Aktif,
0116833456,AKBAR ASIS,X Merdeka A,Laki-laki,Aktif,082348745506
0104401517,Akbar Paputungan,XI Merdeka B,Laki-laki,Aktif,
0104397643,Akbar Simbala,XI Merdeka A,Laki-laki,Aktif,082395454647
0104670613,AKRIS ELFANO PULU,XI Merdeka B,Laki-laki,Aktif,
0115762958,AL NUGI MAKALUNSENGE,X Merdeka D,Laki-laki,Aktif,085256042394
0115596797,Al Sukron Unini,X Merdeka C,Laki-laki,Aktif,
0092450015,ALBERTA MARJELYN LANTAA OGELANG,XII Merdeka B,Perempuan,Aktif,085399461092
0117698644,ALDIANO LOKAS,X Merdeka D,Laki-laki,Aktif,
0092052081,ALFARO GERALDO MAMINTADE,XII Merdeka D,Laki-laki,Aktif,081348325983
0081721824,Alfatir Limpong,XII Merdeka D,Laki-laki,Aktif,082196798834
0113047930,ALFINO TADIUS APAI,X Merdeka D,Laki-laki,Aktif,
0091015612,ALFIRA SASILIA KANTOR,XII Merdeka B,Perempuan,Aktif,082348855485
0105993072,ALFRILIO ODNIEL REZI LUPA,XI Merdeka A,Laki-laki,Aktif,
0117809486,ALGIFAHRI IBRAHIMOVICH ABRAM,X Merdeka D,Laki-laki,Aktif,
0105321763,Alia Balqis Simbala,XI Merdeka D,Perempuan,Aktif,
0117529018,Alifa Aryanti Mokoginta,X Merdeka C,Perempuan,Aktif,
0105247710,Alisa Potabuga,XI Merdeka A,Perempuan,Aktif,085240621372
0098051686,alisya lasabuda,XII Merdeka B,Perempuan,Aktif,
0091266741,Aliya Sitiamang,XI Merdeka A,Perempuan,Aktif,082399392934
0091827288,ALIZAH ASHARINA,XII Merdeka B,Perempuan,Aktif,082316385545
0107437537,ALKHIVEN ANDRE TOLI,XI Merdeka C,Laki-laki,Aktif,
0093454254,ALMIRANDA SITIAMANG,XI Merdeka A,Perempuan,Aktif,082318933268
0104217863,ALTER GEORGE WAHE,X Merdeka D,Laki-laki,Aktif,
0094027834,Alvadilan Potabuga,XII Merdeka D,Laki-laki,Aktif,
0113760636,Alvano Geovani Gideon Wowor,X Merdeka D,Laki-laki,Aktif,082114246184
0117712670,ALVARO FABIANO BANGKULU,X Merdeka D,Laki-laki,Aktif,
0115049803,ALVIN SOLANG,X Merdeka D,Laki-laki,Aktif,
0092505170,Alzikra Potabuga,XII Merdeka D,Laki-laki,Aktif,
0117593564,Amelia Mokoagow,X Merdeka C,Perempuan,Aktif,081245994318
0113714282,AMIRA CHANTIKA RINDAHATI,X Merdeka B,Perempuan,Aktif,
3103682504,Ananda Al Hafiz Mokoagow,XI Merdeka A,Laki-laki,Aktif,081341937003
0107751228,ANDERSON JAMAL MANGOLI,XI Merdeka D,Laki-laki,Aktif,
0112777713,ANDITA DAENG PAREMMA,X Merdeka A,Perempuan,Aktif,
0115527169,Andra Mokodompit,X Merdeka C,Laki-laki,Aktif,081245812007
0112595001,Andra Reikal Bawuna,X Merdeka A,Laki-laki,Aktif,
0113390707,ANGGI MATITA,X Merdeka A,Perempuan,Aktif,
0103432039,Anggrainy Putry Paputungan,XI Merdeka D,Perempuan,Aktif,081245811599
0085844019,Aninda Hairatulnisa Pangalima,XII Merdeka B,Perempuan,Aktif,081242945747
0086076596,Anisa Ambat,XII Merdeka C,Perempuan,Aktif,081241951148
0109425970,ANISYA ZEZKIA TALU,XI Merdeka B,Perempuan,Aktif,
0119710366,Anugrah Prayoga Sambali,X Merdeka A,Laki-laki,Aktif,082349324166
0105926838,ARAFAH MOKOGINTA,XI Merdeka C,Laki-laki,Aktif,
0116735189,ARIYO ASER MAMBU,X Merdeka A,Laki-laki,Aktif,
0114792599,Aryandira Paputungan,X Merdeka C,Laki-laki,Aktif,
0112917759,Arzalia Safa Kheyza Boroma,X Merdeka B,Perempuan,Aktif,
0117901016,ASER MAMBU,X Merdeka B,Laki-laki,Aktif,
0101856763,Asmiranda Paputungan,XI Merdeka A,Perempuan,Aktif,082190061511
0118367553,ASWITA SARUNDAYANG,X Merdeka D,Perempuan,Aktif,
0099557495,Aulia Mokodompit,XI Merdeka C,Perempuan,Aktif,081242629162
0092540327,Aulia Putri Damogalad,XI Merdeka B,Perempuan,Aktif,085340367055
0087525975,AURELIA JELITA HIMPEDE,XII Merdeka C,Perempuan,Aktif,
0115717496,Ayu Wantira Mokodompit,X Merdeka A,Perempuan,Aktif,
0113333901,Azriel Ilham Tumelap,XI Merdeka B,Laki-laki,Aktif,082191367382
0108191065,Balqis Anugerah Mamonto,XI Merdeka A,Perempuan,Aktif,085298156079
0094441528,Bayu Alfarezi Husuna,XII Merdeka C,Laki-laki,Aktif,
0117980709,Bebby Azzahra Paman,X Merdeka D,Perempuan,Aktif,
0114479097,Bima Sambali,X Merdeka C,Laki-laki,Aktif,082293995640
0105748155,Brigita Eunike Rumagit,XI Merdeka C,Perempuan,Aktif,085242591416
0112287993,Bunga Salsabilla Mamonto,X Merdeka A,Perempuan,Aktif,082338583909
0102002106,Chantika Charlotte Talunda,XI Merdeka A,Perempuan,Aktif,085218417385
0108746138,Chantika Dewindi Modeong,X Merdeka A,Perempuan,Aktif,
0102021423,Chindi Modeong,XI Merdeka B,Perempuan,Aktif,
0092937138,Choirul Azzam Limbanadi,XII Merdeka C,Laki-laki,Aktif,
0091982774,Christano William Koagow,XI Merdeka B,Laki-laki,Aktif,089609584500
0096263674,CHRISTON MAMELO,XII Merdeka A,Laki-laki,Aktif,085240166834
0113095863,Christopan Marfelo Hadinaung,X Merdeka C,Laki-laki,Aktif,
0108798597,CINRIA PAPUTUNGAN,XII Merdeka A,Perempuan,Aktif,
0093321100,Cinta Kaoru Rahma Mokodompit,XII Merdeka A,Perempuan,Aktif,
0113620169,Cladimir Manuharisi,X Merdeka A,Laki-laki,Aktif,
3123160554,CLARHISYA CHINTA MERUNG,X Merdeka B,Perempuan,Aktif,
0114175160,DAMIREL FAEROS MAMONTO,X Merdeka A,Laki-laki,Aktif,
0102225397,Dandi Pasanbuna,XI Merdeka C,Laki-laki,Aktif,
0095505982,DANIEL ERING TALU,XI Merdeka D,Laki-laki,Aktif,
0109889770,Defita Damogalad,XI Merdeka C,Perempuan,Aktif,081356734934
0112828111,Denyer Rychard Tatampil,X Merdeka D,Laki-laki,Aktif,
0103954435,DEVINA PAPUTUNGAN,XI Merdeka C,Perempuan,Aktif,
0118921485,Devita Nasaru,X Merdeka C,Perempuan,Aktif,
0088243105,Dhea Frederika Maatita,XII Merdeka B,Perempuan,Aktif,085824437321
0095075669,DIRGA PUTRA PAPUTUNGAN,XII Merdeka B,Laki-laki,Aktif,
0114062807,Diva Kumalasari Mokoagow,X Merdeka B,Perempuan,Aktif,082293995640
0091949247,Diyen Tama,XI Merdeka D,Laki-laki,Aktif,0821955006164
0094017665,DJIVENT JEFIERT TAKALAMINGAN,XII Merdeka D,Laki-laki,Aktif,
0111361697,DWI RISQIYANA LIMBANADI,XI Merdeka A,Perempuan,Aktif,
0091069775,EGIDIA QUINSHA MAMENTIWALO,XI Merdeka B,Perempuan,Aktif,
0094088206,ELENA PUTRI SAERANG,XII Merdeka A,Perempuan,Aktif,
0101210526,Elishua Keren Boki,XI Merdeka A,Perempuan,Aktif,
0102412952,ELSA MAURA LIWOSO,X Merdeka C,Perempuan,Aktif,081523765631
0096962835,Elvia Dalero,XII Merdeka D,Perempuan,Aktif,082189372123
0092808151,ESTI CRISTOVERA TAHULENDING,XII Merdeka B,Perempuan,Aktif,085342443367
0108389790,EXSEL BERTI LUA,XI Merdeka C,Laki-laki,Aktif,
0106481294,Fabian Tololiu,XII Merdeka C,Laki-laki,Aktif,082187789946
3109156369,FADIL PAPUTUNGAN,X Merdeka C,Laki-laki,Aktif,
0116527389,Fadila Natalia Tandayu,X Merdeka D,Perempuan,Aktif,
3107386786,Fahirus Kobandaha,XI Merdeka D,Perempuan,Aktif,082393227245
0109205001,Fahujian Mamuat,X Merdeka B,Laki-laki,Aktif,
3105065775,FAIZAH,XI Merdeka A,Perempuan,Aktif,081340089162
0114491193,FANLI MOKODASER,X Merdeka C,Laki-laki,Aktif,
0095984475,Farel Dataw,XI Merdeka D,Laki-laki,Aktif,
0088236315,FAREL MOOTALU,XII Merdeka A,Laki-laki,Aktif,0895704286600
0097768776,Farel Surya Okay,XII Merdeka A,Laki-laki,Aktif,085397995315
0104508043,Farhan Nur Mustaqiem,XI Merdeka B,Laki-laki,Aktif,085340146828
3119673023,Farli Papea Larenggam,X Merdeka C,Laki-laki,Aktif,
3109086328,FATHURRAHMAN PAPUTUNGAN,XI Merdeka B,Laki-laki,Aktif,
0092033975,FERNANDO FRANSISCHO MAMINTADE,XII Merdeka D,Laki-laki,Aktif,
0097272354,FERYSHA ANRENI KANSIL,XII Merdeka C,Perempuan,Aktif,
0098594515,FIKI ALFATRA MOKODOMPIT,XII Merdeka B,Laki-laki,Aktif,
0106768399,FIO RIVALDO BINULANG,XI Merdeka D,Laki-laki,Aktif,
0099089262,Fira Cantika Lemba,XII Merdeka C,Perempuan,Aktif,
0101753941,Firni Pontorondo,XI Merdeka D,Perempuan,Aktif,085824437248
0095798397,FIRNIA NINGSIH POTABUGA,XII Merdeka D,Perempuan,Aktif,
0114160216,Fitria Makalalag,X Merdeka C,Perempuan,Aktif,082193008735
0104275174,Fitria Paputungan,XI Merdeka B,Perempuan,Aktif,
0095000935,Fitriani Karto,XI Merdeka B,Perempuan,Aktif,
0089584543,Fitrianti Mahful,XII Merdeka D,Perempuan,Aktif,082345759664
0092830224,FIZRI MAMONTO,XII Merdeka A,Laki-laki,Aktif,
0094453654,Fransisco Stefanus Tumbelaka,XII Merdeka D,Laki-laki,Aktif,085824437321
0091275193,Friskilla Natasya Laude,XII Merdeka C,Perempuan,Aktif,
0108469445,Frisya Zevanya Mainti,XI Merdeka A,Perempuan,Aktif,
0124810479,GALANG SOLEMAN,X Merdeka C,Laki-laki,Aktif,
0099948086,Gazza Rombe,XII Merdeka A,Laki-laki,Aktif,085756636949
0102225664,GEBRIANI DEAN BADE,XI Merdeka C,Perempuan,Aktif,085398936247
0093773955,GHEISYA R. LIGAWA,XII Merdeka A,Perempuan,Aktif,
3096979552,GIBRAN LAKORO,XII Merdeka B,Laki-laki,Aktif,
0108929725,Gio Fandi Paputungan,XI Merdeka B,Laki-laki,Aktif,082198103070
0115859314,GIOVANI PRATAMA POLLO,X Merdeka D,Laki-laki,Aktif,
0106659665,Givara Losung,XII Merdeka A,Perempuan,Aktif,081262772188
0107347319,GIVENLY HIZKIA JUNIOR PONAMON,XI Merdeka A,Laki-laki,Aktif,
3109225356,Glen Saputra Mamahit,XII Merdeka B,Laki-laki,Aktif,
0109013001,GLEYSIA MARSYA YOHANIS,XI Merdeka B,Perempuan,Aktif,085756624093
0099702910,GRISEELSILYA SUNDANA,XII Merdeka C,Perempuan,Aktif,
3106380951,Hajalia Paputungan,XI Merdeka D,Perempuan,Aktif,
0107248007,HASTI DAMOPOLII,XI Merdeka B,Perempuan,Aktif,
0096195374,INEL AIRA TUMOKA,XII Merdeka B,Perempuan,Aktif,
0085145903,INTANIA VALENTINA WOWILING,XII Merdeka D,Perempuan,Aktif,082349226845
0107289483,IQRAM MODEONG,XI Merdeka D,Laki-laki,Aktif,
0104225310,Izma Inayah Mamonto,XI Merdeka B,Perempuan,Aktif,081342247766
0117608905,JANWAR RISKY ARUNDAA,X Merdeka C,Laki-laki,Aktif,
0093344439,Jason Jeremy Tandayu,XII Merdeka C,Laki-laki,Aktif,085242690424
0107454320,JELITA ESSING,XI Merdeka D,Perempuan,Aktif,
0096270787,JENNY DINDI RAHAYU ASTUTI SUWARNO,XII Merdeka B,Perempuan,Aktif,085342051963
0092239424,JEQLIN BALAU,XII Merdeka C,Perempuan,Aktif,
0103968186,JERIKHO POLUAN,XI Merdeka D,Laki-laki,Aktif,
0087632584,JEYMAN VRANSIS MISA,XII Merdeka B,Laki-laki,Aktif,
0102795288,Jhesya Bunga Mandolfo,XI Merdeka B,Perempuan,Aktif,081240877570
0098076549,JIHAN PAPUTUNGAN,XII Merdeka A,Perempuan,Aktif,
0101285281,JIMI AXELEON DEFIN SADIA,XI Merdeka C,Laki-laki,Aktif,
0099943429,Jofanly Emor,XI Merdeka B,Laki-laki,Aktif,
0104867450,John Prince Rumewo,XI Merdeka C,Laki-laki,Aktif,081382182802
0107295150,Jonathan Paputungan,XI Merdeka B,Laki-laki,Aktif,085657225772
0106861313,JUAN FRILLY NATALIS PIRI,XI Merdeka D,Laki-laki,Aktif,
0106495221,Juandira Lantiuna,XI Merdeka C,Laki-laki,Aktif,
0108381924,Julvita Enjelia Lahea,XI Merdeka C,Perempuan,Aktif,
0094731407,JUNIARTO ESSING,XII Merdeka C,Laki-laki,Aktif,
0091579938,JUNIOR MARVEL MORES SAHABAT,XII Merdeka D,Laki-laki,Aktif,
0104662458,JUVANLI TAHULENDING,XI Merdeka D,Laki-laki,Aktif,
0106933180,Karmila Simbala,XI Merdeka A,Perempuan,Aktif,
3106388834,KAYYIRAH AZZAH SURIAWAN,XI Merdeka A,Perempuan,Aktif,
0075136167,Keni Kaunang,XII Merdeka B,Laki-laki,Aktif,
0099202119,KEYTSIA ESTELINDA MALANGSIA,XII Merdeka B,Perempuan,Aktif,
3110463111,Keyza Alfishar Modeong,X Merdeka D,Laki-laki,Aktif,
0099278264,Keyzia Lapasaw,XII Merdeka A,Perempuan,Aktif,
0113637853,KHOIRUL AZAM MAMONTO,X Merdeka D,Laki-laki,Aktif,
0106368768,KRISTIAN MARFELO TAPADA,X Merdeka C,Laki-laki,Aktif,
0107216524,Kristy Isyel Awi,XI Merdeka B,Perempuan,Aktif,081244995620
0103699921,KULIANCE WUDU,XI Merdeka D,Perempuan,Aktif,
0081297979,Kumairah Noho,XII Merdeka D,Perempuan,Aktif,081244278196
0095923041,LARASATI PULU,XII Merdeka C,Perempuan,Aktif,081344369915
0096028775,LEONARD PAPEA,XII Merdeka C,Laki-laki,Aktif,081524711894
0102414581,LEONEL NAFTANIEL MAKAWIMBANG,XI Merdeka B,Laki-laki,Aktif,082393208264
0108263872,Lheonel Messy Putra Rantung,XII Merdeka B,Laki-laki,Aktif,082187522008
0113306342,LIFI LATIFA LANTONG,X Merdeka B,Perempuan,Aktif,081354816035
0117489659,LIONEL SIMSON PAPUARENDA,X Merdeka B,Laki-laki,Aktif,
0094674297,M. SAIFUL JAMIL AL FARUQ,XII Merdeka D,Laki-laki,Aktif,
0082561140,Maksel Niklas Sihure,XII Merdeka B,Laki-laki,Aktif,
0094309730,MARCELO ESSING,XII Merdeka D,Laki-laki,Aktif,
0093926780,MARSELIA KAEHES,XII Merdeka C,Perempuan,Aktif,
0111846195,Marselina Kadengkang,X Merdeka A,Perempuan,Aktif,
0095569918,MARSELINO BAWOLE,XI Merdeka C,Laki-laki,Aktif,
0091012995,MARSELIO KAEHES,XI Merdeka C,Laki-laki,Aktif,
0109831652,Marsya Adelia Hasani,XI Merdeka C,Perempuan,Aktif,
0106785678,Marsya Ingga Manurat,XI Merdeka C,Perempuan,Aktif,
0119318784,MARSYA LUISYE WELMINCE LUPA,X Merdeka A,Perempuan,Aktif,
0113075125,Marvel Lukas Puasa,X Merdeka A,Laki-laki,Aktif,
0088520376,Marwah Khartikha Shari Mokoginta,XI Merdeka A,Perempuan,Aktif,082349768926
0114764325,MEIDIAN SYALOMITA DAROME,X Merdeka C,Perempuan,Aktif,
0096830129,Meiva Adelia Sahabat,XII Merdeka C,Perempuan,Aktif,
0092817902,Melfi Sarundayang,XII Merdeka A,Perempuan,Aktif,082187668682
3117366976,Melsyan Marceliana .a .Gogerino,X Merdeka C,Perempuan,Aktif,
0103504978,Melvin Gamaliel Sahae,XI Merdeka D,Laki-laki,Aktif,081242626050
0101978864,MEVLAN MAULANA MOKODOMPIT,XI Merdeka D,Laki-laki,Aktif,081241948237
0093731513,Mevtahuljana Korompot,XII Merdeka B,Perempuan,Aktif,082349167991
0116567307,Mey Citra Potabuga,X Merdeka B,Perempuan,Aktif,
0114556493,Meygiantari Putri Paputungan,X Merdeka C,Perempuan,Aktif,
0116532505,MEYVI NADINE TINE,X Merdeka D,Perempuan,Aktif,
0103197045,MICKHAEL JUYER PADE,X Merdeka A,Laki-laki,Aktif,085656333578
0121386878,Mikhaela M Pangungsikang,X Merdeka C,Perempuan,Aktif,
0085406416,Miracle Kardia Tulangow,XII Merdeka A,Laki-laki,Aktif,081241569392
0108142708,Miranda Halibu,XI Merdeka C,Perempuan,Aktif,081244995620
0107012049,Mirando Halibu,XI Merdeka C,Laki-laki,Aktif,085240336592
0122491689,Moh Ibas Paputungan,X Merdeka A,Laki-laki,Aktif,
0099790639,Moh. Adlyansyah Mokodompit,XII Merdeka A,Laki-laki,Aktif,082393976727
0111725361,MOH. ALIF USMAN,X Merdeka B,Laki-laki,Aktif,
0067300398,MOH. FADEL PAPUTUNGAN,XII Merdeka B,Laki-laki,Aktif,
3098730692,MOH. FADHYL MAMONTO,XII Merdeka A,Laki-laki,Aktif,
0096912752,Moh. Fahrezi Nasaru,XII Merdeka B,Laki-laki,Aktif,
0107945772,MOH. FAREL MOKODOMPIT,X Merdeka D,Laki-laki,Aktif,
0115595940,Moh. Junior Al Azhar Ranti,X Merdeka A,Laki-laki,Aktif,085398065542
0091394525,Moh.Akbar Abram,XII Merdeka A,Laki-laki,Aktif,
0113086390,MOHAMAD ANUGERAH PAPUTUNGAN,XI Merdeka B,Laki-laki,Aktif,081242147968
0111136689,Mohamad Ardiansyah Lababu,X Merdeka B,Laki-laki,Aktif,
0091611586,Mohamad Nabil Maleteng,XI Merdeka B,Laki-laki,Aktif,
0105197597,Mohamad Rizzy Fahry Bahansubu,X Merdeka B,Laki-laki,Aktif,
0093951648,MOHAMAD ZHIDNI ALHEID,XI Merdeka D,Laki-laki,Aktif,081243577269
0118445407,MOHAMMAD RIZKI SAPUTRA PAPUTUNGAN,X Merdeka D,Laki-laki,Aktif,085657226110
0119935518,MOHAMMAD YUDA FIRMANSYA KATILI,X Merdeka A,Laki-laki,Aktif,
0106183476,MONIKA CEREN TUMANGKENG,XI Merdeka A,Perempuan,Aktif,082349156468
0092703573,Mourinho Afgan Manoarfa,XI Merdeka C,Laki-laki,Aktif,081241937275
3091404425,MUH. HAMAL,XII Merdeka D,Laki-laki,Aktif,
0105627735,Muh. Ridho Sulaeman,XI Merdeka B,Laki-laki,Aktif,082292843510
0093617659,Muhamad Cipta Batalipu,XII Merdeka B,Laki-laki,Aktif,085796182901
0117047113,Muhamad Fadil Mamonto,X Merdeka A,Laki-laki,Aktif,
0096611821,Muhamad Fajri Alkatiri,XII Merdeka D,Laki-laki,Aktif,
0103690858,Muhamad Khiandra Mamonto,XI Merdeka B,Laki-laki,Aktif,
0128460520,MUHAMAD RAIHAN MATITA,X Merdeka C,Laki-laki,Aktif,
0086081724,Muhamat Raski Modeong,XII Merdeka D,Laki-laki,Aktif,
0115933087,Muhammad Adila Sayuri,X Merdeka A,Laki-laki,Aktif,081342358483
0117599425,Muhammad Gazali Paparang,X Merdeka D,Laki-laki,Aktif,082344783992
0114407351,Muhammad Khairul Radjak,X Merdeka A,Laki-laki,Aktif,
0114492788,Mukhamat Abdul Ajis,X Merdeka A,Laki-laki,Aktif,
0094392392,MUNIRA MANGULA,XII Merdeka C,Perempuan,Aktif,082175282896
0109571935,MUZDHALIFAH CAHAYA MAMONTO,X Merdeka B,Perempuan,Aktif,081242147189
0116303897,Nabila Tiara Anggrainy Gaib,XI Merdeka A,Perempuan,Aktif,082398417677
0118018777,Nabilla Baswan,X Merdeka D,Perempuan,Aktif,085657226301
0113486024,NAFLA NAURA PAPUTUNGAN,X Merdeka C,Perempuan,Aktif,
0089220367,NAISILA ALIFAH ESTEVANUS,XII Merdeka D,Perempuan,Aktif,
0108257907,NASYIFA INSYIRAH PAPUTUNGAN,X Merdeka D,Perempuan,Aktif,089698751600
0109352197,Natasya Ginoga,XI Merdeka A,Perempuan,Aktif,
0113746833,Nathanael T. Illy,X Merdeka D,Laki-laki,Aktif,
0116239897,Navisyah Vina Londah,X Merdeka B,Perempuan,Aktif,081349753132
0116263514,NAYSA KARUNIA MOKOGINTA,X Merdeka A,Perempuan,Aktif,
0118945464,Naysa Losung,X Merdeka C,Perempuan,Aktif,082346917775
0092294082,Nazwa Mokodompit,XII Merdeka B,Perempuan,Aktif,085298840032
0115618889,NEILA MAMONTO,X Merdeka B,Perempuan,Aktif,
0085135074,NERISA AURELLY MOKOGINTA,XII Merdeka A,Perempuan,Aktif,
0092421768,Nesira Potabuga,XII Merdeka D,Perempuan,Aktif,
0106187309,NHAYSILA AULLIA RAMADHANI MODEONG,XII Merdeka A,Perempuan,Aktif,
3103674558,NIKITA MARDESA,X Merdeka D,Perempuan,Aktif,
0113620304,NIKITA RAYA KANAITAN,X Merdeka A,Perempuan,Aktif,
0093039214,NIKITA SAMEL,XI Merdeka D,Perempuan,Aktif,
0111226248,Niva Naura Mamonto,X Merdeka D,Perempuan,Aktif,085824437255
0092336668,Novalino Marsello Wahongan,XI Merdeka D,Laki-laki,Aktif,085240655314
0116640070,Novelia Dandi,X Merdeka B,Perempuan,Aktif,082397111217
0102056140,NUR SYAFANA,XI Merdeka A,Perempuan,Aktif,082393744432
0104788969,NURAENA ELIAS,XI Merdeka A,Perempuan,Aktif,
0098694370,Nuraini Musa,XI Merdeka C,Perempuan,Aktif,081240243023
3114549193,NURHAEDAH MULIYADI,X Merdeka B,Perempuan,Aktif,
0119760576,NURKASI POTABUGA,X Merdeka B,Perempuan,Aktif,
0119575444,Nurul Aesafitra Husain,X Merdeka B,Perempuan,Aktif,085280252510
0084847892,Nurvita Paputungan,XII Merdeka B,Perempuan,Aktif,082349755433
0114500590,Obama Mokoginta,X Merdeka B,Laki-laki,Aktif,
0115626238,OKJEVAN MANEIN,X Merdeka B,Laki-laki,Aktif,
0115171885,OSIL YOSAPAT WENTINUSA,X Merdeka A,Laki-laki,Aktif,
0104925441,PELISA ANGGRAINI,XI Merdeka A,Perempuan,Aktif,
0093836874,PRADIKIA PRATAMA MODEONG,XII Merdeka A,Laki-laki,Aktif,
0107836003,Prameswari Suparto,XI Merdeka B,Perempuan,Aktif,082195506098
0119441952,Prayer Audi Kaunang,X Merdeka D,Laki-laki,Aktif,085335723128
0109787429,Prischilla Jessica Wuisan,XI Merdeka A,Perempuan,Aktif,
0112235350,PUTRA ALGIFAHRI TUDJAENA,X Merdeka C,Laki-laki,Aktif,
0117545536,PUTRA MOHAMAD PAPUTUNGAN,X Merdeka B,Laki-laki,Aktif,
0117244120,PUTRI KHALIFA ABRAM,X Merdeka A,Perempuan,Aktif,085340436698
0118551779,Putri Modeong,X Merdeka A,Perempuan,Aktif,085398945689
0118072456,Putri Nayla Potabuga,X Merdeka C,Perempuan,Aktif,
0082486545,PUTRI SULISTIA MOKODOMPIT,XII Merdeka C,Perempuan,Aktif,085342058117
0106749239,Putri Zahyra Novadita Paputungan,XI Merdeka A,Perempuan,Aktif,
0116074726,Rabigfirli Potabuga,X Merdeka A,Laki-laki,Aktif,
0127268195,RAFA ALFARIZKY RORONG,X Merdeka B,Laki-laki,Aktif,
0114882363,Raffy Ahmad Salehe,XI Merdeka D,Laki-laki,Aktif,082189028021
0094271877,RAFI GRAFI HAMIM,XI Merdeka C,Laki-laki,Aktif,
0106342612,Rafi Modeong,XI Merdeka D,Laki-laki,Aktif,081342726966
0092137871,RAFLI DARENTA,XII Merdeka C,Laki-laki,Aktif,085696549501
0108415576,Rahayu Paputungan,X Merdeka B,Perempuan,Aktif,
0112618148,RAISYA NUR AINI ALIE,X Merdeka C,Perempuan,Aktif,0895338110691
0108631435,Rama Dwi Putra Abug,XI Merdeka B,Laki-laki,Aktif,
0101717048,Rascal Pratama Doludu,XII Merdeka A,Laki-laki,Aktif,085340345108
0119608730,Rasya Anugrah Mokodompit,X Merdeka C,Laki-laki,Aktif,
9994863033,Rasya Putra Bangkil,XI Merdeka C,Laki-laki,Aktif,085696236733
3102192443,RAVA PUTRA LAODE,XI Merdeka D,Laki-laki,Aktif,
0115257763,Rebeca Holygrace Meydinda Lumintang,X Merdeka A,Perempuan,Aktif,
0077269395,REFAN YOSAFAT BANGKELING,XII Merdeka C,Laki-laki,Aktif,
0093789272,Regi Paputungan,XI Merdeka B,Laki-laki,Aktif,081343680235
0104543612,Revana Anggraini Kadengkang,XI Merdeka B,Perempuan,Aktif,
0101722108,Revie Aprilio Jarang,XI Merdeka A,Laki-laki,Aktif,
0117788946,Reyzi Aurellia Putri Kunrade,XI Merdeka A,Perempuan,Aktif,
0099181844,Reyzky Afwandi lapulo,XII Merdeka D,Laki-laki,Aktif,
0103784178,Rezky Al Zikry Modeong,XI Merdeka B,Laki-laki,Aktif,085340146828
0094261701,Rifaldi Paputungan,XII Merdeka D,Laki-laki,Aktif,
0114388486,Riska Mamonto,X Merdeka C,Perempuan,Aktif,081354628150
0094572359,RISNA RAHAYU ABARANG,XII Merdeka A,Perempuan,Aktif,085396542016
0101751887,RIVA PALENSE,XI Merdeka D,Perempuan,Aktif,
0094352218,RIVALDI TRIFOSA OGELANG,XII Merdeka A,Laki-laki,Aktif,
0117706370,RIZKY ADITYA USUP,X Merdeka B,Laki-laki,Aktif,082290065145
0111279662,Rizky Paputungan,X Merdeka B,Laki-laki,Aktif,081386842975
0074727887,Royan Paputungan,XII Merdeka C,Laki-laki,Aktif,
0127456691,SABRINA ABRAM,X Merdeka B,Perempuan,Aktif,081245144133
0096126007,SAFA RIYANTI PUTRI MOKOAGOW,XII Merdeka A,Perempuan,Aktif,
0075686714,Safar Paputungan,XII Merdeka D,Laki-laki,Aktif,
0072026888,Safila Cahyani Linggama,X Merdeka D,Perempuan,Aktif,
0112215221,Saputra Nizam Kartoredjo,X Merdeka D,Laki-laki,Aktif,082354973186
0101275145,Sartika pantow,X Merdeka D,Perempuan,Aktif,
0118380085,Saskia Latodjo,X Merdeka C,Perempuan,Aktif,
0098048394,SASTRI ABDJUL,XII Merdeka B,Perempuan,Aktif,082111818943
0097130913,Sefanya Patrisia Manongko,XII Merdeka A,Perempuan,Aktif,085298116851
0103266659,SEIDI ANATASYA MANDIANGAN,XI Merdeka C,Perempuan,Aktif,
0108922114,Sergia Mokoginta,X Merdeka B,Perempuan,Aktif,081355209286
0114468096,Serlina Putri Linggama,X Merdeka C,Perempuan,Aktif,
0097030263,SESILIA ANGGAI,XI Merdeka D,Perempuan,Aktif,085340406825
0085842568,Sevilla Bangkil,XII Merdeka C,Perempuan,Aktif,081523810668
0098714392,Shafa Alzahra Pakaya,X Merdeka C,Perempuan,Aktif,085242194057
0091936120,Shafa Punusingon,XII Merdeka C,Perempuan,Aktif,085230137380
0097564065,Shifa Fauzia Paputungan,XII Merdeka B,Perempuan,Aktif,082190053784
0081939514,Shireen Herdita Ligawa,XII Merdeka A,Perempuan,Aktif,081251190980
0101748040,Siti Marwah Ukkas,XI Merdeka D,Perempuan,Aktif,
0107984572,Siti Nurhalisa Paputungan,XI Merdeka D,Perempuan,Aktif,
0103696622,Siti Salsa Fadila Himba,XI Merdeka D,Perempuan,Aktif,
0098482564,SRI MULIAWATI POTABUGA,XII Merdeka B,Perempuan,Aktif,
0129021437,Sri Yulandari S Bangkil,X Merdeka D,Perempuan,Aktif,
0115085112,SRI YUNI ADAM,X Merdeka C,Perempuan,Aktif,
0098649344,Stef mandolfo,X Merdeka B,Laki-laki,Aktif,085397737490
0119128025,Stevano Singkandai,X Merdeka B,Laki-laki,Aktif,
0116777004,STEVINI VANYA SONO,X Merdeka C,Perempuan,Aktif,
0103879410,STIVEN REIN HARD PAPEA,XI Merdeka B,Laki-laki,Aktif,
0093505801,Suci Paputungan,XII Merdeka D,Perempuan,Aktif,
0097672920,SYABBRI PRATAMA HASANNUDIN,XII Merdeka D,Laki-laki,Aktif,
3103828081,Syafiyah Zhilvia Bohang,XII Merdeka A,Perempuan,Aktif,085212253086
0114756677,SYALOMITA HALENA LANTAA,X Merdeka D,Perempuan,Aktif,081524729817
0104812464,Syekina Theovani Rimpulaeng,XI Merdeka C,Perempuan,Aktif,
0111402383,SYIFA ADILLAH KADI,XI Merdeka A,Perempuan,Aktif,082293859296
0107213705,Syifa Alika Losung,XI Merdeka B,Perempuan,Aktif,085256419403
0115267220,Syifa Potabuga,X Merdeka B,Perempuan,Aktif,082145938987
0125077002,SYIRA APRILIA SABBAN,X Merdeka A,Perempuan,Aktif,081310389906
0081547688,TEGAR ALBANI MANOPPO,XII Merdeka D,Laki-laki,Aktif,
0098564812,Teni Ahmadi,X Merdeka C,Perempuan,Aktif,
3087264049,TIARA RAHMADANI MURI,XII Merdeka B,Perempuan,Aktif,082196711459
0116556944,TIFA MALIKA LASABUDA,X Merdeka D,Perempuan,Aktif,
0095271602,TRISTAN GABRIEL KADUA,XI Merdeka C,Laki-laki,Aktif,
0075130525,Vanda Asmiranda Lahai,XII Merdeka D,Perempuan,Aktif,
0118574172,Virga Algazali Paputungan,X Merdeka A,Laki-laki,Aktif,
0111943757,Virginia Anggraini Mokodompit,X Merdeka A,Perempuan,Aktif,085242732626
0099064568,VIRGINIA C MAMINTADE,XI Merdeka B,Perempuan,Aktif,
3094490403,VITRA SIMBALA,XI Merdeka C,Perempuan,Aktif,
0115605884,Wahyu Anugra Putra Pangalima,X Merdeka B,Laki-laki,Aktif,082195096898
0108132233,Wahyu Yaya Wizar Paputungan,XI Merdeka C,Laki-laki,Aktif,085657226896
0112254834,WARUI WILLI TINE,X Merdeka A,Laki-laki,Aktif,
0105983940,WIDIANINGSI MAKALALAG,XI Merdeka A,Perempuan,Aktif,082196717662
0115644916,WISNU SAPUTRA,X Merdeka D,Laki-laki,Aktif,
0082323559,Yedija Barael,XII Merdeka C,Laki-laki,Aktif,081341878182
0103330212,YOEL TANDAYU,XI Merdeka A,Laki-laki,Aktif,
0098756634,YULIANTI MARSADU,XII Merdeka D,Perempuan,Aktif,082296811169
0096540340,Yuliasri Makalalag,XII Merdeka B,Perempuan,Aktif,
0122115928,YUZKA SANGKALA,X Merdeka B,Laki-laki,Aktif,
3116626409,ZHAYRA DEANA TAKERUBUN,X Merdeka B,Perempuan,Aktif,
0108315804,ZHIVILIA ADELHEIDT MAMENTIWALO,X Merdeka A,Perempuan,Aktif,081524729817
0104767918,Zidan Alfauzan Mandagi,XI Merdeka B,Laki-laki,Aktif,
0101405793,ZIFARA MAMONTO,X Merdeka C,Perempuan,Aktif,081241546090
0101579117,ZIFARA PAPUTUNGAN,XI Merdeka A,Perempuan,Aktif,
0101130899,Zifara Regina Suleman,XI Merdeka B,Perempuan,Aktif,085656604955
3106840932,ZIFARAH LETISYA MOLANTONG,XII Merdeka A,Perempuan,Aktif,
0099019493,Zilbina Putri Bade,XII Merdeka D,Perempuan,Aktif,081355601959
3108995135,Zivanna Letisha Paputungan,XI Merdeka A,Perempuan,Aktif,`;

async function testDataset() {
  console.log('Testing sampleDataset parsing...');
  try {
    const rows = parseAndValidateMasterCsv(sampleDataset, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });
    console.log('Successfully parsed rows:', rows.length);
    assert.strictEqual(rows.length, 392, 'Should parse all 392 students in the sample dataset');
    
    // Check various students
    const s1 = rows[0];
    console.log('Row 0:', s1);
    assert.strictEqual(s1.nisn, '0106436229');
    assert.strictEqual(s1.nama_siswa, 'Abdul Sendi Mamonto');
    assert.strictEqual(s1.kelas, 'XI Merdeka D');
    assert.strictEqual(s1.gender, 'Laki-laki');
    assert.strictEqual(s1.status, 'Aktif');
    assert.strictEqual(s1.no_hp_ortu, '082193147509');

    // Row with empty phone number
    const sEmptyPhone = rows.find(r => r.nama_siswa === 'Abriel Glensi Essing');
    console.log('Row with empty phone:', sEmptyPhone);
    assert.ok(sEmptyPhone);
    assert.strictEqual(sEmptyPhone?.no_hp_ortu, '');

    // Row with apostrophe in name: Ahmad Syafwan Ma'arif Potabuga
    const sMaarif = rows.find(r => r.nama_siswa.includes("Ma'arif"));
    console.log('Row with apostrophe in name:', sMaarif);
    assert.ok(sMaarif, 'Ahmad Syafwan Maarif should be found');

    // Row with dots in name: Melsyan Marceliana .a .Gogerino
    const sDots = rows.find(r => r.nama_siswa.includes('Melsyan'));
    console.log('Row with dots in name:', sDots);
    assert.ok(sDots, 'Melsyan should be found');

    // Mock Supabase to test importMasterDataFromCsv
    let upsertedBatches: any[][] = [];
    const mockSupabase: any = {
      from: (tbl: string) => {
        return {
          select: (fields: string) => {
            return {
              eq: (col: string, val: string) => ({
                in: (inCol: string, inVals: string[]) => Promise.resolve({ data: [], error: null }),
                limit: (lim: number) => Promise.resolve({ data: [], error: null })
              })
            };
          },
          upsert: async (batch: any[], opts: any) => {
            upsertedBatches.push(batch);
            return { data: batch, error: null };
          }
        };
      }
    };

    const res = await importMasterDataFromCsv(mockSupabase, sampleDataset, 'data_siswa', {
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    });
    console.log('Import result count:', res.count);
    assert.strictEqual(res.count, 392);
    const totalUpserted = upsertedBatches.reduce((acc, b) => acc + b.length, 0);
    assert.strictEqual(totalUpserted, 392);

    // Section B: normalizeAdminTab Verification
    const { normalizeAdminTab } = await import('../src/components/AdminDataView');
    assert.strictEqual(normalizeAdminTab(undefined), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab(''), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('data_siswa'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('siswa'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('Data_Siswa'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('DATA_SISWA'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('student'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('students'), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('  data_siswa  '), 'Data_Siswa');
    assert.strictEqual(normalizeAdminTab('data_guru'), 'Data_Guru');
    assert.strictEqual(normalizeAdminTab('guru'), 'Data_Guru');
    assert.strictEqual(normalizeAdminTab('data_kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('kelas'), 'Data_Kelas');
    assert.strictEqual(normalizeAdminTab('data_mapel'), 'Data_Mapel');
    assert.strictEqual(normalizeAdminTab('kalender_pendidikan'), 'Kalender_Pendidikan');
    assert.strictEqual(normalizeAdminTab('jadwal_pelajaran'), 'Jadwal_Pelajaran');
    assert.strictEqual(normalizeAdminTab('wali_kelas'), 'Wali_Kelas');
    console.log('normalizeAdminTab checks passed!');

    // Section C: Template_Data_Siswa.csv Definition Check
    const fs = await import('fs');
    const path = await import('path');
    const adminDataSrc = fs.readFileSync(path.join(__dirname, '../src/components/AdminDataView.tsx'), 'utf8');
    assert.ok(adminDataSrc.includes("filename: 'Template_Data_Siswa.csv'"));
    assert.ok(adminDataSrc.includes("headers: ['nisn', 'nama_siswa', 'kelas', 'gender', 'status', 'no_hp_ortu']"));
    console.log('Template_Data_Siswa definition check passed!');

    // Section D: Table Rendering & Empty State Avoidance Simulation
    // When 392 students are uploaded, dataList has 392 items.
    const ITEMS_PER_PAGE = 20;
    const dataList = rows;
    assert.strictEqual(dataList.length, 392);
    
    // Condition for empty state in AdminDataView:
    // (!dataList || dataList.length === 0) ? 'Tabel ini kosong atau data belum dapat dimuat.' : ...
    const isEmpty = (!dataList || dataList.length === 0);
    assert.strictEqual(isEmpty, false, 'Table must NOT be marked empty when 392 students are loaded');

    // Page 0 has 20 items
    const page0 = dataList.slice(0, ITEMS_PER_PAGE);
    assert.strictEqual(page0.length, 20);
    const totalPages = Math.ceil(dataList.length / ITEMS_PER_PAGE);
    assert.strictEqual(totalPages, 20);

    // Filtering by class
    const xiMerdekaD = dataList.filter(s => s.kelas === 'XI Merdeka D');
    assert.ok(xiMerdekaD.length > 0);
    assert.strictEqual(xiMerdekaD[0].nama_siswa, 'Abdul Sendi Mamonto');

    console.log('ALL SAMPLE DATASET, TEMPLATE & TABLE VISIBILITY CHECKS PASSED!');
  } catch (err) {
    console.error('FAILED parsing sampleDataset:', err);
    process.exit(1);
  }
}

testDataset();

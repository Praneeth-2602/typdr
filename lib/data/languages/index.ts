import { COMMON_WORDS } from "@/lib/data/corpus";

export interface LanguagePack {
  code: string;
  name: string;
  wordList: string[];
  sampleQuotes: { text: string; author: string }[];
  rtl: boolean;
}

const HINDI_WORDS = [
  "paani","ghar","kaam","log","din","aaj","kal","pyar","dil","zindagi","dost","khana",
  "raat","subah","shaam","bachpan","maa","pita","bhai","behen","duniya","sapna","ummeed",
  "khushi","gussa","dard","muskaan","aankh","haath","pair","sar","dil","dimag","yaad",
  "bhool","milna","jaana","aana","rehna","karna","bolna","sunna","dekhna","samajhna",
  "sochna","likhna","padhna","chalna","daudna","baithna","uthna","sona","jagana","khelna",
  "gaana","nachna","hasna","rona","jeetna","haar","shuru","khatam","pehle","baad","andar",
  "bahar","upar","neeche","pass","door","zyada","kam","bahut","thoda","sab","kuch","koi",
  "har","ek","do","teen","chaar","paanch","saal","mahina","hafta","ghanta","minute",
  "shahar","gaon","sadak","bazaar","dukaan","school","college","office","hospital","station",
  "train","bus","gaadi","cycle","paisa","rupee","sasta","mehnga","achha","bura","bada",
  "chhota","naya","purana","garam","thanda","safed","kala","laal","neela","peela","hara",
  "namaste","dhanyavad","kripya","maaf","theek","bilkul","zaroor","shayad","kabhi","hamesha",
  "kab","kahan","kyun","kaise","kaun","kya","haan","nahi","aur","lekin","phir","abhi",
  "jab","tab","agar","to","se","mein","par","ke","ki","ka","ye","woh","hum","tum","aap",
  "main","bhi","hi","toh","bas","yaar","bhaiya","didi","uncle","aunty","beta","beti",
];

const SPANISH_WORDS = [
  "el","la","de","que","y","a","en","un","ser","se","no","haber","por","con","su","para",
  "como","estar","tener","le","lo","todo","pero","más","hacer","o","poder","decir","este",
  "ir","otro","ese","la","si","me","ya","ver","porque","dar","cuando","él","muy","sin",
  "vez","mucho","saber","qué","sobre","mi","alguno","mismo","yo","también","hasta","año",
  "dos","querer","entre","así","primero","desde","grande","eso","ni","nos","llegar","pasar",
  "tiempo","ella","sí","día","uno","bien","poco","deber","entonces","poner","cosa","tanto",
  "hombre","parecer","nuestro","tan","donde","ahora","parte","después","vida","quedar",
  "siempre","creer","hablar","llevar","dejar","nada","cada","seguir","menos","nuevo","encontrar",
  "algo","solo","decir","país","contra","hacia","casa","durante","aún","aunque","manera",
  "antes","ciudad","mundo","bajo","trabajo","agua","gente","nombre","madre","padre","amigo",
  "libro","escuela","comida","noche","mañana","tarde","hoy","ayer","mañana","bueno","malo",
  "grande","pequeño","rápido","lento","fácil","difícil","feliz","triste","amor","odio",
  "juego","caminar","correr","comer","beber","dormir","leer","escribir","pensar","sentir",
  "mirar","escuchar","abrir","cerrar","empezar","terminar","comprar","vender","ganar","perder",
  "gracias","hola","adiós","por favor","perdón","claro","vale","bueno","vamos","aquí","allí",
];

const GERMAN_WORDS = [
  "der","die","das","und","in","den","von","zu","mit","sich","des","auf","für","ist","im",
  "dem","nicht","ein","eine","als","auch","es","an","werden","aus","er","hat","dass","sie",
  "nach","wird","bei","einer","um","am","sind","noch","wie","einem","über","einen","so",
  "zum","war","haben","nur","oder","aber","vor","zur","bis","mehr","durch","man","sein",
  "wurde","sei","ich","wenn","was","wir","dann","unter","kann","schon","hier","alle","oder",
  "dieser","doch","jetzt","immer","ihnen","ihrem","sehr","etwa","ohne","etwas","nichts",
  "machen","geben","kommen","gehen","sehen","sagen","wissen","wollen","müssen","können",
  "sollen","lassen","stehen","finden","bleiben","liegen","heißen","denken","nehmen","zeigen",
  "zeit","jahr","tag","mensch","leben","hand","augen","haus","arbeit","welt","land","stadt",
  "wasser","freund","mutter","vater","kind","schule","buch","nacht","morgen","abend","heute",
  "gestern","gut","schlecht","groß","klein","neu","alt","schnell","langsam","leicht","schwer",
];

const JAPANESE_ROMAJI = [
  "watashi","anata","kare","kanojo","desu","masu","arigatou","sumimasen","konnichiwa","ohayou",
  "konbanwa","sayounara","hai","iie","onegaishimasu","douzo","genki","namae","nihongo","eigo",
  "sensei","gakusei","tomodachi","kazoku","okaasan","otousan","ani","ane","otouto","imouto",
  "uchi","ie","gakkou","kaisha","eki","densha","basu","kuruma","jitensha","michi",
  "tabemono","nomimono","mizu","ocha","koucha","gohan","pan","sakana","niku","yasai",
  "kudamono","ringo","banana","sakura","yama","kawa","umi","sora","ame","yuki",
  "hi","tsuki","hoshi","asa","hiru","yoru","kyou","ashita","kinou","ima",
  "toki","nen","tsuki","shuukan","ichi","ni","san","yon","go","roku","nana","hachi","kyuu","juu",
];

export const LANGUAGE_PACKS: LanguagePack[] = [
  {
    code: "en",
    name: "English",
    wordList: COMMON_WORDS,
    sampleQuotes: [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    ],
    rtl: false,
  },
  {
    code: "hi",
    name: "Hindi (Romanized)",
    wordList: HINDI_WORDS,
    sampleQuotes: [
      { text: "zindagi ek sapna hai, jee lo isse dil se.", author: "Proverb" },
    ],
    rtl: false,
  },
  {
    code: "es",
    name: "Spanish",
    wordList: SPANISH_WORDS,
    sampleQuotes: [
      { text: "El futuro pertenece a quienes creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" },
    ],
    rtl: false,
  },
  {
    code: "de",
    name: "German",
    wordList: GERMAN_WORDS,
    sampleQuotes: [
      { text: "Im Mittelpunkt jeder Schwierigkeit liegt eine Gelegenheit.", author: "Albert Einstein" },
    ],
    rtl: false,
  },
  {
    code: "ja",
    name: "Japanese (Romaji)",
    wordList: JAPANESE_ROMAJI,
    sampleQuotes: [
      { text: "arigatou gozaimasu. mata ashita aimashou.", author: "Everyday" },
    ],
    rtl: false,
  },
];

export function getLanguagePack(code: string): LanguagePack {
  return LANGUAGE_PACKS.find((p) => p.code === code) ?? LANGUAGE_PACKS[0];
}

export const LANG_STORAGE_KEY = "typdr-language";

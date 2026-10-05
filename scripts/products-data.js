/**
 * Связи «продукция ↔ гранит».
 *
 * Как добавить изделие:
 * 1. Новый объект в этом массиве.
 * 2. category: "memorial" или "construction".
 * 3. order — порядок внутри своего блока (меньше = раньше).
 * 4. granites — 2–4 id из scripts/stones-data.js.
 * 5. Текст страницы — в scripts/products-articles.json (тот же id).
 *
 * Порядок блоков задаётся НЕ позицией в массиве, а полем category.
 * Сначала все memorial, затем все construction. Внутри блока — по order.
 * См. sortedProducts() в scripts/build-granite-pages.js.
 *
 * Допущения (в текст сайта не выводятся):
 * - Блоки на странице: сначала memorial (документы 10–13), затем construction.
 *   Это требование текущей вёрстки. В PLAN.md таблица страниц перечисляет
 *   строительный блок раньше, но порядок вывода здесь задаёт category.
 * - stolbiki и balyasiny — construction, как в PLAN.md: категории 1–9 и 14–15.
 *   На странице столбиков остаются и мемориальные ограды, и ландшафтные столбы.
 *   На странице балясин мемориальный декор остаётся подразделом.
 * - Подтипы (ГП-1, цельная ступень, фигурная стела и т.д.) не вынесены в отдельные карточки.
 * - Если порода не названа в документе изделия, связь взята из поля uses этой породы
 *   в scripts/stones-data.js. Такие id помечены комментарием «допущение».
 */

module.exports = [
  {
    id: "pamyatniki",
    category: "memorial",
    order: 10,
    name: "Памятники",
    summary: "Стандартные и фигурные стелы для одиночных и семейных мемориалов.",
    granites: [
      "gabbro-diabaz", // документ
      "hauki", // допущение: uses «Стелы с прямой гравировкой»
      "kolskiy", // допущение: uses «Стелы с прямой гравировкой»
      "dymovskiy" // допущение: uses «Мемориальные комплексы»
    ]
  },
  {
    id: "nadgrobiya",
    category: "memorial",
    order: 11,
    name: "Надгробные плиты",
    summary: "Сплошные, модульные и наклонные плиты перекрытия захоронения.",
    granites: [
      "gabbro-diabaz", // документ
      "hauki", // допущение: прямая гравировка портрета
      "kolskiy" // допущение: прямая гравировка портрета
    ]
  },
  {
    id: "tumby",
    category: "memorial",
    order: 12,
    name: "Тумбы под памятники",
    summary: "Прямоугольные, фигурные и многоярусные основания под стелу.",
    granites: [
      "gabbro-diabaz", // документ
      "hauki", // допущение: тот же мемориальный комплект, что и стела
      "kolskiy" // допущение: тот же мемориальный комплект, что и стела
    ]
  },
  {
    id: "tsvetniki",
    category: "memorial",
    order: 13,
    name: "Цветники",
    summary: "Балки обрамления могильного холма: классические, модульные и резные.",
    granites: [
      "gabbro-diabaz", // документ: габброиды
      "kupetskiy", // допущение: uses «Мемориальные изделия»
      "krasnogorskiy", // допущение: uses «Мемориальные изделия»
      "mavara" // допущение: uses «Мемориальные изделия»
    ]
  },
  {
    id: "stolbiki",
    category: "construction",
    order: 14,
    name: "Столбики и опорные столбы",
    summary: "Угловые и рядовые опоры оград, постаменты и заборные столбы.",
    granites: [
      "gabbro-diabaz", // документ: габброиды
      "vozrozhdenie", // допущение: uses «Городские объекты»
      "kupetskiy", // допущение: uses «Мемориальные изделия»
      "kashina-gora" // допущение: uses «Мемориальные изделия»
    ]
  },
  {
    id: "plity-mosheniya",
    category: "construction",
    order: 1,
    name: "Плиты мощения",
    summary: "Термообработка, бучарда, пиленая и полированная лицевая поверхность.",
    granites: [
      "gabbro-diabaz", // документ
      "vozrozhdenie", // допущение: uses «Мощение и бордюры», серый тон палитры
      "kalguvaara", // допущение: uses «Плиты и ступени», красный тон палитры
      "onego-green" // допущение: uses «Мощение», зелёный тон палитры
    ]
  },
  {
    id: "bordyury",
    category: "construction",
    order: 2,
    name: "Бордюры",
    summary: "Бортовые камни ГП-1–ГП-5 для дорог, тротуаров и площадок.",
    granites: [
      "gabbro-diabaz", // документ: габброиды
      "vozrozhdenie", // допущение: uses «Мощение и бордюры»
      "kolskiy", // допущение: uses «Мощение и бордюры»
      "hauki" // допущение: uses «Мощение и бордюры»
    ]
  },
  {
    id: "oblicovochnye-plity",
    category: "construction",
    order: 3,
    name: "Облицовочные плиты",
    summary: "Плиты для фасада, цоколя и интерьера.",
    granites: [
      "gabbro-diabaz", // документ
      "onezhskiy-labradorit", // документ
      "dymovskiy", // допущение: uses «Облицовка и ступени»
      "vinga" // допущение: uses «Облицовка»
    ]
  },
  {
    id: "stupeni",
    category: "construction",
    order: 4,
    name: "Ступени",
    summary: "Цельные, накладные и радиусные ступени для лестниц и входных групп.",
    granites: [
      "gabbro-diabaz", // документ
      "kalguvaara", // допущение: uses «Плиты и ступени»
      "dymovskiy", // допущение: uses «Облицовка и ступени»
      "krasnogorskiy" // допущение: uses «Облицовка и ступени»
    ]
  },
  {
    id: "bollardy",
    category: "construction",
    order: 5,
    name: "Болларды",
    summary: "Дорожные и парковые столбики без ржавчины и покраски.",
    granites: [
      "gabbro-diabaz", // документ
      "vozrozhdenie", // допущение: uses «Городские объекты»
      "hauki" // допущение: uses «Мощение и бордюры»
    ]
  },
  {
    id: "bruschatka",
    category: "construction",
    order: 6,
    name: "Брусчатка",
    summary: "Полнопиленная, пилено-колотая и колотая брусчатка.",
    granites: [
      "gabbro-diabaz", // допущение: uses породы «Плиты мощения и брусчатка»; в документе имя не названо
      "vozrozhdenie", // допущение: uses «Мощение и бордюры»
      "kashina-gora", // допущение: uses «Массовое мощение»
      "hauki" // допущение: uses «Мощение и бордюры»
    ]
  },
  {
    id: "fasad-nvf",
    category: "construction",
    order: 7,
    name: "Плиты для навесных фасадов",
    summary: "Плиты 18–30 мм для систем навесных вентилируемых фасадов.",
    granites: [
      "gabbro-diabaz", // документ: габброиды
      "onezhskiy-labradorit", // документ
      "amphibolite", // допущение: uses «Фасадные акценты»
      "mavara" // допущение: uses «Фасады и цоколи»
    ]
  },
  {
    id: "taktilnye-plity",
    category: "construction",
    order: 8,
    name: "Тактильные плиты",
    summary: "Направляющие и предупреждающие плиты для доступной среды.",
    granites: [
      "gabbro-diabaz", // документ: тёмный указатель
      "vozrozhdenie", // допущение: светлый фон из описания контраста
      "kalguvaara" // допущение: яркий камень из описания контраста
    ]
  },
  {
    id: "sleby",
    category: "construction",
    order: 9,
    name: "Слэбы",
    summary: "Крупноформатные плиты распила для столешниц, стел и облицовки.",
    granites: [
      "gabbro-diabaz", // документ: габброиды
      "onezhskiy-labradorit", // документ
      "dyadina-gora", // допущение: uses «Декоративные слэбы»
      "galaktika" // допущение: uses «Интерьерные столешницы и панели»
    ]
  },
  {
    id: "balyasiny",
    category: "construction",
    order: 15,
    name: "Балясины и точёные изделия",
    summary: "Балясины, вазоны и колонны для лестниц, террас и мемориального декора.",
    granites: [
      "gabbro-diabaz", // документ: габброиды
      "galaktika", // допущение: uses «Архитектурные акценты»
      "kalguvaara" // допущение: uses «Плиты и ступени»
    ]
  }
];

import { TkuItem, ArchiveRecord, MotivationQuote, DailySalesRecord } from '../types';

export const INITIAL_TKUS: TkuItem[] = [
  {
    "id": 1,
    "nama": "JEMBER 1",
    "rayon": 1,
    "targetHarian": 3430,
    "penjualanAkm": [
      66750,
      8605,
      9665,
      6075
    ],
    "aktif": true,
    "pic": "Bpk. Hendra S.",
    "alamat": "Jl. Hayam Wuruk No. 45, Jember",
    "hp": "0812-3456-7800",
    "jumlahArea": 12,
    "jumlahYl": 11,
    "coverageArea": 0.917,
    "jumlahYlLy": 11,
    "diffYl": 0,
    "akmJwp": 330,
    "sYl": 202,
    "absenYl": 7,
    "frekuensiAbsen": 31,
    "l250": 2,
    "l300": 5,
    "bbAkm": [
      5915,
      1275,
      1620,
      945
    ]
  },
  {
    "id": 2,
    "nama": "JEMBER 2",
    "rayon": 1,
    "targetHarian": 3605,
    "penjualanAkm": [
      64515,
      10045,
      11610,
      6745
    ],
    "aktif": true,
    "pic": "Ibu Siti Rohmah",
    "alamat": "Jl. Trunojoyo No. 12, Jember",
    "hp": "0812-3456-7801",
    "jumlahArea": 12,
    "jumlahYl": 11,
    "coverageArea": 0.917,
    "jumlahYlLy": 11,
    "diffYl": 0,
    "akmJwp": 339,
    "sYl": 190,
    "absenYl": 2,
    "frekuensiAbsen": 11,
    "l250": 0,
    "l300": 3,
    "bbAkm": [
      4725,
      1090,
      2585,
      1955
    ]
  },
  {
    "id": 3,
    "nama": "TAWANGALUN",
    "rayon": 1,
    "targetHarian": 3425,
    "penjualanAkm": [
      71970,
      13045,
      16130,
      5565
    ],
    "aktif": true,
    "pic": "Bpk. Agus Santoso",
    "alamat": "Jl. Dharmawangsa No. 88, Rambipuji",
    "hp": "0812-3456-7802",
    "jumlahArea": 11,
    "jumlahYl": 11,
    "coverageArea": 1.0,
    "jumlahYlLy": 11,
    "diffYl": 0,
    "akmJwp": 330,
    "sYl": 218,
    "absenYl": 2,
    "frekuensiAbsen": 4,
    "l250": 0,
    "l300": 3,
    "bbAkm": [
      3675,
      2395,
      5705,
      1830
    ]
  },
  {
    "id": 4,
    "nama": "DP JEMBER 1",
    "rayon": 1,
    "targetHarian": 4490,
    "penjualanAkm": [
      105310,
      7885,
      9160,
      5130
    ],
    "aktif": true,
    "pic": "Bpk. Bambang P.",
    "alamat": "Jl. Gajah Mada No. 102, Kaliwates",
    "hp": "0812-3456-7803",
    "jumlahArea": 10,
    "jumlahYl": 10,
    "coverageArea": 1.0,
    "jumlahYlLy": 10,
    "diffYl": 0,
    "akmJwp": 300,
    "sYl": 351,
    "absenYl": 0,
    "frekuensiAbsen": 0,
    "l250": 0,
    "l300": 0,
    "bbAkm": [
      5195,
      235,
      270,
      235
    ]
  },
  {
    "id": 5,
    "nama": "DP JEMBER 4",
    "rayon": 1,
    "targetHarian": 1985,
    "penjualanAkm": [
      55745,
      3580,
      4635,
      2030
    ],
    "aktif": true,
    "pic": "Ibu Nurul Aini",
    "alamat": "Jl. PB Sudirman No. 34, Patrang",
    "hp": "0812-3456-7804",
    "jumlahArea": 7,
    "jumlahYl": 7,
    "coverageArea": 1.0,
    "jumlahYlLy": 7,
    "diffYl": 0,
    "akmJwp": 210,
    "sYl": 265,
    "absenYl": 0,
    "frekuensiAbsen": 0,
    "l250": 2,
    "l300": 2,
    "bbAkm": [
      9095,
      570,
      670,
      725
    ]
  },
  {
    "id": 6,
    "nama": "PELITA",
    "rayon": 2,
    "targetHarian": 4000,
    "penjualanAkm": [
      87870,
      8655,
      9800,
      6050
    ],
    "aktif": true,
    "pic": "Bpk. Eko Prasetyo",
    "alamat": "Jl. Diponegoro No. 29, Pelita",
    "hp": "0812-3456-7805",
    "jumlahArea": 12,
    "jumlahYl": 11,
    "coverageArea": 0.917,
    "jumlahYlLy": 11,
    "diffYl": 0,
    "akmJwp": 332,
    "sYl": 265,
    "absenYl": 3,
    "frekuensiAbsen": 4,
    "l250": 0,
    "l300": 4,
    "bbAkm": [
      1860,
      210,
      175,
      155
    ]
  },
  {
    "id": 7,
    "nama": "DAWUHAN",
    "rayon": 2,
    "targetHarian": 2790,
    "penjualanAkm": [
      60390,
      6085,
      7775,
      3085
    ],
    "aktif": true,
    "pic": "Bpk. Ahmad Fauzi",
    "alamat": "Jl. Raya Dawuhan No. 18, Dawuhan",
    "hp": "0812-3456-7806",
    "jumlahArea": 11,
    "jumlahYl": 9,
    "coverageArea": 0.818,
    "jumlahYlLy": 9,
    "diffYl": 0,
    "akmJwp": 270,
    "sYl": 224,
    "absenYl": 2,
    "frekuensiAbsen": 5,
    "l250": 2,
    "l300": 3,
    "bbAkm": [
      710,
      375,
      460,
      480
    ]
  },
  {
    "id": 8,
    "nama": "KALISAT",
    "rayon": 2,
    "targetHarian": 4270,
    "penjualanAkm": [
      114915,
      11340,
      15170,
      4155
    ],
    "aktif": true,
    "pic": "Ibu Dewi Lestari",
    "alamat": "Jl. Kalisat Utama No. 99, Kalisat",
    "hp": "0812-3456-7807",
    "jumlahArea": 10,
    "jumlahYl": 9,
    "coverageArea": 0.9,
    "jumlahYlLy": 9,
    "diffYl": 0,
    "akmJwp": 269,
    "sYl": 427,
    "absenYl": 0,
    "frekuensiAbsen": 0,
    "l250": 0,
    "l300": 0,
    "bbAkm": [
      15,
      20,
      75,
      50
    ]
  },
  {
    "id": 9,
    "nama": "DP JEMBER 2",
    "rayon": 2,
    "targetHarian": 3650,
    "penjualanAkm": [
      100505,
      9465,
      10720,
      3225
    ],
    "aktif": true,
    "pic": "Ibu Sri Wahyuni",
    "alamat": "Jl. Letjen Sutoyo No. 67, Sumbersari",
    "hp": "0812-3456-7808",
    "jumlahArea": 10,
    "jumlahYl": 10,
    "coverageArea": 1.0,
    "jumlahYlLy": 10,
    "diffYl": 0,
    "akmJwp": 300,
    "sYl": 335,
    "absenYl": 0,
    "frekuensiAbsen": 0,
    "l250": 0,
    "l300": 1,
    "bbAkm": [
      0,
      0,
      0,
      0
    ]
  },
  {
    "id": 10,
    "nama": "DP JEMBER 3",
    "rayon": 2,
    "targetHarian": 1775,
    "penjualanAkm": [
      48990,
      2665,
      3830,
      975
    ],
    "aktif": true,
    "pic": "Bpk. Arif Wibowo",
    "alamat": "Jl. KH Shiddiq No. 14, Talangsari",
    "hp": "0812-3456-7809",
    "jumlahArea": 8,
    "jumlahYl": 8,
    "coverageArea": 1.0,
    "jumlahYlLy": 8,
    "diffYl": 0,
    "akmJwp": 240,
    "sYl": 204,
    "absenYl": 2,
    "frekuensiAbsen": 11,
    "l250": 3,
    "l300": 4,
    "bbAkm": [
      0,
      0,
      0,
      0
    ]
  }
];

// Historical daily sales totals for days 1 to 26 of September 2026 (Real from Spreadsheet)
export const INITIAL_DAILY_HISTORY: number[] = [
  45015, 36150, 34680, 32955, 33130, 0, 56645,
  44885, 32930, 32835, 35750, 32605, 0, 51765,
  42155, 32270, 34695, 32930, 31170, 0, 55510,
  41490, 36115, 32535, 31395, 30645
];

// Weekly sales totals: [Cabang, Rayon 1, Rayon 2] across weeks
export const INITIAL_WEEKLY_SALES: number[][] = [
  [238575, 231790, 228385, 77605], // Cabang
  [114585, 117735, 109110, 32985], // Rayon 1
  [123990, 114055, 119275, 44620], // Rayon 2
];

// Weekly per-variant sales for [Rayon 1, Rayon 2]
export const INITIAL_WEEKLY_VARIANT: number[][][] = [
  // Rayon 1: [YO, OM, OS, YT] x weeks
  [
    [84720, 88845, 82290, 24910],
    [10710, 10600, 9710, 2820],
    [12585, 12810, 11430, 3370],
    [6570, 5480, 5680, 1885]
  ],
  // Rayon 2: [YO, OM, OS, YT] x weeks
  [
    [98670, 90885, 95535, 35910],
    [9120, 8435, 9030, 3520],
    [11995, 10825, 10590, 3865],
    [4205, 3910, 4120, 1325]
  ]
];

export const INITIAL_QUOTES: MotivationQuote[] = [
  { id: 1, teks: "Setiap botol adalah langkah kecil menuju kesehatan keluarga dan pencapaian target.", aktif: true },
  { id: 2, teks: "Hari ini harus lebih baik dari kemarin, dengan senyum ramah khas Yakult Lady.", aktif: true },
  { id: 3, teks: "Pelayanan tulus dari hati membuka pintu setiap rumah dengan penuh kehangatan.", aktif: true },
  { id: 4, teks: "Jaga kualitas, rawat botol, dan raih prestasi bersama tim Cabang Jember!", aktif: true }
];

export { INITIAL_ARCHIVES } from './initialArchivesData';

// Initial target per TKU for Bulan Lalu (Agustus 2026, 31 hr) and Tahun Lalu (September 2025, 30 hr)
export const INITIAL_TARGET_BL = [3237, 3463, 3317, 4694, 1806, 3827, 2699, 4146, 3315, 1882];
export const INITIAL_TARGET_TY = [3298, 3038, 3700, 4233, 2151, 3849, 3017, 4276, 3867, 1981];


export const INITIAL_PJD: Record<string, Record<number, DailySalesRecord>> = {
  "2026-09-01": {
    "0": {
      "v": [
        1990,
        295,
        325,
        230
      ],
      "b": [
        228,
        50,
        63,
        37
      ],
      "sold": 2840,
      "bb": 378,
      "pdmV": [
        2218,
        345,
        388,
        267
      ],
      "pdm": 3218,
      "yl": 11,
      "ar": 12,
      "jwp": 11,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2740,
        300,
        465,
        225
      ],
      "b": [
        182,
        42,
        100,
        76
      ],
      "sold": 3730,
      "bb": 400,
      "pdmV": [
        2922,
        342,
        565,
        301
      ],
      "pdm": 4130,
      "yl": 11,
      "ar": 12,
      "jwp": 11,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2385,
        550,
        675,
        170
      ],
      "b": [
        142,
        93,
        220,
        71
      ],
      "sold": 3780,
      "bb": 526,
      "pdmV": [
        2527,
        643,
        895,
        241
      ],
      "pdm": 4306,
      "yl": 11,
      "ar": 11,
      "jwp": 11,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 10,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        4460,
        360,
        545,
        215
      ],
      "b": [
        700,
        44,
        52,
        56
      ],
      "sold": 5580,
      "bb": 852,
      "pdmV": [
        5160,
        404,
        597,
        271
      ],
      "pdm": 6432,
      "yl": 7,
      "ar": 7,
      "jwp": 7,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        4585,
        460,
        500,
        315
      ],
      "b": [
        72,
        9,
        7,
        6
      ],
      "sold": 5860,
      "bb": 94,
      "pdmV": [
        4657,
        469,
        507,
        321
      ],
      "pdm": 5954,
      "yl": 11,
      "ar": 12,
      "jwp": 11,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2020,
        195,
        255,
        45
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 2515,
      "bb": 80,
      "pdmV": [
        2048,
        210,
        273,
        64
      ],
      "pdm": 2595,
      "yl": 9,
      "ar": 11,
      "jwp": 9,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        4900,
        615,
        850,
        160
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 6525,
      "bb": 7,
      "pdmV": [
        4901,
        616,
        853,
        162
      ],
      "pdm": 6532,
      "yl": 9,
      "ar": 10,
      "jwp": 9,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        11800,
        960,
        1085,
        340
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 14185,
      "bb": 0,
      "pdmV": [
        11800,
        960,
        1085,
        340
      ],
      "pdm": 14185,
      "yl": 10,
      "ar": 10,
      "jwp": 10,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 8,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-02": {
    "0": {
      "v": [
        2125,
        355,
        370,
        245
      ],
      "b": [
        228,
        49,
        63,
        37
      ],
      "sold": 3095,
      "bb": 377,
      "pdmV": [
        2353,
        404,
        433,
        282
      ],
      "pdm": 3472,
      "yl": 11,
      "ar": 12,
      "jwp": 22,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2080,
        375,
        445,
        235
      ],
      "b": [
        182,
        42,
        100,
        76
      ],
      "sold": 3135,
      "bb": 400,
      "pdmV": [
        2262,
        417,
        545,
        311
      ],
      "pdm": 3535,
      "yl": 11,
      "ar": 12,
      "jwp": 22,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2480,
        545,
        535,
        215
      ],
      "b": [
        142,
        93,
        220,
        71
      ],
      "sold": 3775,
      "bb": 526,
      "pdmV": [
        2622,
        638,
        755,
        286
      ],
      "pdm": 4301,
      "yl": 11,
      "ar": 11,
      "jwp": 22,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        9130,
        700,
        930,
        485
      ],
      "b": [
        400,
        19,
        21,
        19
      ],
      "sold": 11245,
      "bb": 459,
      "pdmV": [
        9530,
        719,
        951,
        504
      ],
      "pdm": 11704,
      "yl": 10,
      "ar": 10,
      "jwp": 20,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 14,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2855,
        295,
        400,
        210
      ],
      "b": [
        72,
        9,
        7,
        6
      ],
      "sold": 3760,
      "bb": 94,
      "pdmV": [
        2927,
        304,
        407,
        216
      ],
      "pdm": 3854,
      "yl": 11,
      "ar": 12,
      "jwp": 22,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        1895,
        180,
        265,
        75
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 2415,
      "bb": 80,
      "pdmV": [
        1923,
        195,
        283,
        94
      ],
      "pdm": 2495,
      "yl": 9,
      "ar": 11,
      "jwp": 18,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3820,
        405,
        575,
        125
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 4925,
      "bb": 7,
      "pdmV": [
        3821,
        406,
        578,
        127
      ],
      "pdm": 4932,
      "yl": 9,
      "ar": 10,
      "jwp": 18,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 20,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        3290,
        180,
        265,
        65
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 3800,
      "bb": 0,
      "pdmV": [
        3290,
        180,
        265,
        65
      ],
      "pdm": 3800,
      "yl": 8,
      "ar": 8,
      "jwp": 16,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-03": {
    "0": {
      "v": [
        2270,
        315,
        345,
        265
      ],
      "b": [
        228,
        49,
        63,
        37
      ],
      "sold": 3195,
      "bb": 377,
      "pdmV": [
        2498,
        364,
        408,
        302
      ],
      "pdm": 3572,
      "yl": 11,
      "ar": 12,
      "jwp": 33,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2460,
        365,
        450,
        235
      ],
      "b": [
        182,
        42,
        100,
        76
      ],
      "sold": 3510,
      "bb": 400,
      "pdmV": [
        2642,
        407,
        550,
        311
      ],
      "pdm": 3910,
      "yl": 11,
      "ar": 12,
      "jwp": 33,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2585,
        500,
        625,
        240
      ],
      "b": [
        142,
        93,
        220,
        71
      ],
      "sold": 3950,
      "bb": 526,
      "pdmV": [
        2727,
        593,
        845,
        311
      ],
      "pdm": 4476,
      "yl": 11,
      "ar": 11,
      "jwp": 33,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 30,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        3500,
        250,
        255,
        195
      ],
      "b": [
        700,
        44,
        52,
        56
      ],
      "sold": 4200,
      "bb": 852,
      "pdmV": [
        4200,
        294,
        307,
        251
      ],
      "pdm": 5052,
      "yl": 7,
      "ar": 7,
      "jwp": 21,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3380,
        345,
        415,
        265
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 4405,
      "bb": 93,
      "pdmV": [
        3452,
        353,
        422,
        271
      ],
      "pdm": 4498,
      "yl": 11,
      "ar": 12,
      "jwp": 33,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        1955,
        140,
        230,
        70
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 2395,
      "bb": 80,
      "pdmV": [
        1983,
        155,
        248,
        89
      ],
      "pdm": 2475,
      "yl": 9,
      "ar": 11,
      "jwp": 27,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        4500,
        440,
        725,
        175
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 5840,
      "bb": 7,
      "pdmV": [
        4501,
        441,
        728,
        177
      ],
      "pdm": 5847,
      "yl": 9,
      "ar": 10,
      "jwp": 27,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        5640,
        615,
        710,
        220
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 7185,
      "bb": 0,
      "pdmV": [
        5640,
        615,
        710,
        220
      ],
      "pdm": 7185,
      "yl": 10,
      "ar": 10,
      "jwp": 30,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 24,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-04": {
    "0": {
      "v": [
        1985,
        290,
        315,
        280
      ],
      "b": [
        228,
        49,
        63,
        37
      ],
      "sold": 2870,
      "bb": 377,
      "pdmV": [
        2213,
        339,
        378,
        317
      ],
      "pdm": 3247,
      "yl": 11,
      "ar": 12,
      "jwp": 44,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2170,
        365,
        420,
        250
      ],
      "b": [
        182,
        42,
        100,
        76
      ],
      "sold": 3205,
      "bb": 400,
      "pdmV": [
        2352,
        407,
        520,
        326
      ],
      "pdm": 3605,
      "yl": 11,
      "ar": 12,
      "jwp": 44,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2400,
        470,
        520,
        240
      ],
      "b": [
        142,
        92,
        220,
        71
      ],
      "sold": 3630,
      "bb": 525,
      "pdmV": [
        2542,
        562,
        740,
        311
      ],
      "pdm": 4155,
      "yl": 11,
      "ar": 11,
      "jwp": 44,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        6415,
        700,
        785,
        500
      ],
      "b": [
        400,
        18,
        21,
        18
      ],
      "sold": 8400,
      "bb": 457,
      "pdmV": [
        6815,
        718,
        806,
        518
      ],
      "pdm": 8857,
      "yl": 10,
      "ar": 10,
      "jwp": 40,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 28,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2945,
        295,
        335,
        185
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 3760,
      "bb": 93,
      "pdmV": [
        3017,
        303,
        342,
        191
      ],
      "pdm": 3853,
      "yl": 11,
      "ar": 12,
      "jwp": 44,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2485,
        220,
        235,
        70
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 3010,
      "bb": 80,
      "pdmV": [
        2513,
        235,
        253,
        89
      ],
      "pdm": 3090,
      "yl": 9,
      "ar": 11,
      "jwp": 36,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3515,
        360,
        600,
        240
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 4715,
      "bb": 7,
      "pdmV": [
        3516,
        361,
        603,
        242
      ],
      "pdm": 4722,
      "yl": 9,
      "ar": 10,
      "jwp": 36,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 40,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        2920,
        155,
        220,
        70
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 3365,
      "bb": 0,
      "pdmV": [
        2920,
        155,
        220,
        70
      ],
      "pdm": 3365,
      "yl": 8,
      "ar": 8,
      "jwp": 32,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-05": {
    "0": {
      "v": [
        2070,
        305,
        380,
        340
      ],
      "b": [
        228,
        49,
        63,
        37
      ],
      "sold": 3095,
      "bb": 377,
      "pdmV": [
        2298,
        354,
        443,
        377
      ],
      "pdm": 3472,
      "yl": 11,
      "ar": 12,
      "jwp": 55,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        1990,
        340,
        475,
        220
      ],
      "b": [
        182,
        42,
        100,
        76
      ],
      "sold": 3025,
      "bb": 400,
      "pdmV": [
        2172,
        382,
        575,
        296
      ],
      "pdm": 3425,
      "yl": 11,
      "ar": 12,
      "jwp": 55,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2330,
        550,
        660,
        250
      ],
      "b": [
        142,
        92,
        220,
        71
      ],
      "sold": 3790,
      "bb": 525,
      "pdmV": [
        2472,
        642,
        880,
        321
      ],
      "pdm": 4315,
      "yl": 11,
      "ar": 11,
      "jwp": 55,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 50,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        2625,
        175,
        205,
        170
      ],
      "b": [
        700,
        44,
        52,
        56
      ],
      "sold": 3175,
      "bb": 852,
      "pdmV": [
        3325,
        219,
        257,
        226
      ],
      "pdm": 4027,
      "yl": 7,
      "ar": 7,
      "jwp": 35,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3265,
        280,
        335,
        245
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 4125,
      "bb": 93,
      "pdmV": [
        3337,
        288,
        342,
        251
      ],
      "pdm": 4218,
      "yl": 11,
      "ar": 12,
      "jwp": 55,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2035,
        230,
        280,
        115
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 2660,
      "bb": 80,
      "pdmV": [
        2063,
        245,
        298,
        134
      ],
      "pdm": 2740,
      "yl": 9,
      "ar": 11,
      "jwp": 45,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        4020,
        405,
        630,
        125
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 5180,
      "bb": 7,
      "pdmV": [
        4021,
        406,
        633,
        127
      ],
      "pdm": 5187,
      "yl": 9,
      "ar": 10,
      "jwp": 45,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        6355,
        600,
        875,
        250
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 8080,
      "bb": 0,
      "pdmV": [
        6355,
        600,
        875,
        250
      ],
      "pdm": 8080,
      "yl": 10,
      "ar": 10,
      "jwp": 50,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 40,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-06": {
    "0": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 66,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 66,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 11,
      "jwp": 66,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 60,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 42,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 66,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 11,
      "jwp": 54,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 10,
      "jwp": 54,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 60,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 48,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-07": {
    "0": {
      "v": [
        3740,
        555,
        575,
        295
      ],
      "b": [
        228,
        49,
        63,
        37
      ],
      "sold": 5165,
      "bb": 377,
      "pdmV": [
        3968,
        604,
        638,
        332
      ],
      "pdm": 5542,
      "yl": 11,
      "ar": 12,
      "jwp": 77,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        3925,
        660,
        730,
        410
      ],
      "b": [
        182,
        42,
        100,
        75
      ],
      "sold": 5725,
      "bb": 399,
      "pdmV": [
        4107,
        702,
        830,
        485
      ],
      "pdm": 6124,
      "yl": 11,
      "ar": 12,
      "jwp": 77,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        5585,
        740,
        755,
        235
      ],
      "b": [
        142,
        92,
        220,
        71
      ],
      "sold": 7315,
      "bb": 525,
      "pdmV": [
        5727,
        832,
        975,
        306
      ],
      "pdm": 7840,
      "yl": 11,
      "ar": 11,
      "jwp": 77,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        11280,
        650,
        800,
        425
      ],
      "b": [
        400,
        18,
        21,
        18
      ],
      "sold": 13155,
      "bb": 457,
      "pdmV": [
        11680,
        668,
        821,
        443
      ],
      "pdm": 13612,
      "yl": 10,
      "ar": 10,
      "jwp": 70,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 49,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        4990,
        465,
        555,
        310
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 6320,
      "bb": 93,
      "pdmV": [
        5062,
        473,
        562,
        316
      ],
      "pdm": 6413,
      "yl": 11,
      "ar": 12,
      "jwp": 77,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        3440,
        470,
        575,
        255
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 4740,
      "bb": 80,
      "pdmV": [
        3468,
        485,
        593,
        274
      ],
      "pdm": 4820,
      "yl": 9,
      "ar": 11,
      "jwp": 63,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        6680,
        610,
        695,
        185
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 8170,
      "bb": 7,
      "pdmV": [
        6681,
        611,
        698,
        187
      ],
      "pdm": 8177,
      "yl": 9,
      "ar": 10,
      "jwp": 63,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 70,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        5380,
        200,
        385,
        90
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 6055,
      "bb": 0,
      "pdmV": [
        5380,
        200,
        385,
        90
      ],
      "pdm": 6055,
      "yl": 8,
      "ar": 8,
      "jwp": 56,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-08": {
    "0": {
      "v": [
        2885,
        370,
        480,
        235
      ],
      "b": [
        228,
        49,
        63,
        37
      ],
      "sold": 3970,
      "bb": 377,
      "pdmV": [
        3113,
        419,
        543,
        272
      ],
      "pdm": 4347,
      "yl": 11,
      "ar": 12,
      "jwp": 88,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2125,
        375,
        415,
        225
      ],
      "b": [
        182,
        42,
        100,
        75
      ],
      "sold": 3140,
      "bb": 399,
      "pdmV": [
        2307,
        417,
        515,
        300
      ],
      "pdm": 3539,
      "yl": 11,
      "ar": 12,
      "jwp": 88,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        3345,
        440,
        735,
        190
      ],
      "b": [
        142,
        92,
        220,
        71
      ],
      "sold": 4710,
      "bb": 525,
      "pdmV": [
        3487,
        532,
        955,
        261
      ],
      "pdm": 5235,
      "yl": 11,
      "ar": 11,
      "jwp": 88,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 80,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        7550,
        450,
        475,
        120
      ],
      "b": [
        700,
        44,
        52,
        56
      ],
      "sold": 8595,
      "bb": 852,
      "pdmV": [
        8250,
        494,
        527,
        176
      ],
      "pdm": 9447,
      "yl": 7,
      "ar": 7,
      "jwp": 56,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3315,
        305,
        345,
        235
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 4200,
      "bb": 93,
      "pdmV": [
        3387,
        313,
        352,
        241
      ],
      "pdm": 4293,
      "yl": 11,
      "ar": 12,
      "jwp": 88,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2150,
        160,
        245,
        55
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 2610,
      "bb": 80,
      "pdmV": [
        2178,
        175,
        263,
        74
      ],
      "pdm": 2690,
      "yl": 9,
      "ar": 11,
      "jwp": 72,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3950,
        430,
        580,
        175
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 5135,
      "bb": 7,
      "pdmV": [
        3951,
        431,
        583,
        177
      ],
      "pdm": 5142,
      "yl": 9,
      "ar": 10,
      "jwp": 72,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        10325,
        800,
        1150,
        250
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 12525,
      "bb": 0,
      "pdmV": [
        10325,
        800,
        1150,
        250
      ],
      "pdm": 12525,
      "yl": 10,
      "ar": 10,
      "jwp": 80,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 64,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-09": {
    "0": {
      "v": [
        2085,
        330,
        375,
        195
      ],
      "b": [
        228,
        49,
        63,
        37
      ],
      "sold": 2985,
      "bb": 377,
      "pdmV": [
        2313,
        379,
        438,
        232
      ],
      "pdm": 3362,
      "yl": 11,
      "ar": 12,
      "jwp": 99,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2320,
        335,
        450,
        240
      ],
      "b": [
        182,
        42,
        100,
        75
      ],
      "sold": 3345,
      "bb": 399,
      "pdmV": [
        2502,
        377,
        550,
        315
      ],
      "pdm": 3744,
      "yl": 11,
      "ar": 12,
      "jwp": 99,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2495,
        505,
        635,
        175
      ],
      "b": [
        142,
        92,
        220,
        71
      ],
      "sold": 3810,
      "bb": 525,
      "pdmV": [
        2637,
        597,
        855,
        246
      ],
      "pdm": 4335,
      "yl": 11,
      "ar": 11,
      "jwp": 99,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        6050,
        650,
        730,
        380
      ],
      "b": [
        400,
        18,
        21,
        18
      ],
      "sold": 7810,
      "bb": 457,
      "pdmV": [
        6450,
        668,
        751,
        398
      ],
      "pdm": 8267,
      "yl": 10,
      "ar": 10,
      "jwp": 90,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 63,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3095,
        290,
        365,
        200
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 3950,
      "bb": 93,
      "pdmV": [
        3167,
        298,
        372,
        206
      ],
      "pdm": 4043,
      "yl": 11,
      "ar": 12,
      "jwp": 99,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2045,
        185,
        245,
        90
      ],
      "b": [
        28,
        15,
        18,
        19
      ],
      "sold": 2565,
      "bb": 80,
      "pdmV": [
        2073,
        200,
        263,
        109
      ],
      "pdm": 2645,
      "yl": 9,
      "ar": 11,
      "jwp": 81,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3620,
        380,
        600,
        125
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 4725,
      "bb": 7,
      "pdmV": [
        3621,
        381,
        603,
        127
      ],
      "pdm": 4732,
      "yl": 9,
      "ar": 10,
      "jwp": 81,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 90,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        3180,
        165,
        315,
        80
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 3740,
      "bb": 0,
      "pdmV": [
        3180,
        165,
        315,
        80
      ],
      "pdm": 3740,
      "yl": 8,
      "ar": 8,
      "jwp": 72,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-10": {
    "0": {
      "v": [
        2225,
        270,
        325,
        175
      ],
      "b": [
        228,
        49,
        62,
        37
      ],
      "sold": 2995,
      "bb": 376,
      "pdmV": [
        2453,
        319,
        387,
        212
      ],
      "pdm": 3371,
      "yl": 11,
      "ar": 12,
      "jwp": 110,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2160,
        315,
        355,
        245
      ],
      "b": [
        182,
        42,
        100,
        75
      ],
      "sold": 3075,
      "bb": 399,
      "pdmV": [
        2342,
        357,
        455,
        320
      ],
      "pdm": 3474,
      "yl": 11,
      "ar": 12,
      "jwp": 110,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2285,
        455,
        535,
        195
      ],
      "b": [
        142,
        92,
        220,
        71
      ],
      "sold": 3470,
      "bb": 525,
      "pdmV": [
        2427,
        547,
        755,
        266
      ],
      "pdm": 3995,
      "yl": 11,
      "ar": 11,
      "jwp": 110,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 100,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        4590,
        250,
        335,
        125
      ],
      "b": [
        700,
        44,
        52,
        56
      ],
      "sold": 5300,
      "bb": 852,
      "pdmV": [
        5290,
        294,
        387,
        181
      ],
      "pdm": 6152,
      "yl": 7,
      "ar": 7,
      "jwp": 70,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2915,
        265,
        290,
        175
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 3645,
      "bb": 93,
      "pdmV": [
        2987,
        273,
        297,
        181
      ],
      "pdm": 3738,
      "yl": 11,
      "ar": 12,
      "jwp": 110,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2105,
        200,
        200,
        135
      ],
      "b": [
        27,
        15,
        18,
        19
      ],
      "sold": 2640,
      "bb": 79,
      "pdmV": [
        2132,
        215,
        218,
        154
      ],
      "pdm": 2719,
      "yl": 9,
      "ar": 11,
      "jwp": 90,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3510,
        360,
        545,
        160
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 4575,
      "bb": 7,
      "pdmV": [
        3511,
        361,
        548,
        162
      ],
      "pdm": 4582,
      "yl": 9,
      "ar": 10,
      "jwp": 90,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        5595,
        535,
        725,
        280
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 7135,
      "bb": 0,
      "pdmV": [
        5595,
        535,
        725,
        280
      ],
      "pdm": 7135,
      "yl": 10,
      "ar": 10,
      "jwp": 100,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 80,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-11": {
    "0": {
      "v": [
        3065,
        430,
        555,
        240
      ],
      "b": [
        228,
        49,
        62,
        36
      ],
      "sold": 4290,
      "bb": 375,
      "pdmV": [
        3293,
        479,
        617,
        276
      ],
      "pdm": 4665,
      "yl": 11,
      "ar": 12,
      "jwp": 121,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2050,
        305,
        345,
        200
      ],
      "b": [
        182,
        42,
        100,
        75
      ],
      "sold": 2900,
      "bb": 399,
      "pdmV": [
        2232,
        347,
        445,
        275
      ],
      "pdm": 3299,
      "yl": 11,
      "ar": 12,
      "jwp": 121,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2245,
        375,
        465,
        225
      ],
      "b": [
        141,
        92,
        220,
        71
      ],
      "sold": 3310,
      "bb": 524,
      "pdmV": [
        2386,
        467,
        685,
        296
      ],
      "pdm": 3834,
      "yl": 11,
      "ar": 11,
      "jwp": 121,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        8635,
        725,
        850,
        375
      ],
      "b": [
        400,
        18,
        21,
        18
      ],
      "sold": 10585,
      "bb": 457,
      "pdmV": [
        9035,
        743,
        871,
        393
      ],
      "pdm": 11042,
      "yl": 10,
      "ar": 10,
      "jwp": 110,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 77,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2840,
        250,
        250,
        180
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 3520,
      "bb": 93,
      "pdmV": [
        2912,
        258,
        257,
        186
      ],
      "pdm": 3613,
      "yl": 11,
      "ar": 12,
      "jwp": 121,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        1970,
        165,
        205,
        125
      ],
      "b": [
        27,
        15,
        18,
        19
      ],
      "sold": 2465,
      "bb": 79,
      "pdmV": [
        1997,
        180,
        223,
        144
      ],
      "pdm": 2544,
      "yl": 9,
      "ar": 11,
      "jwp": 99,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3410,
        450,
        580,
        180
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 4620,
      "bb": 7,
      "pdmV": [
        3411,
        451,
        583,
        182
      ],
      "pdm": 4627,
      "yl": 9,
      "ar": 10,
      "jwp": 99,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 110,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        3560,
        165,
        280,
        55
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 4060,
      "bb": 0,
      "pdmV": [
        3560,
        165,
        280,
        55
      ],
      "pdm": 4060,
      "yl": 8,
      "ar": 8,
      "jwp": 88,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-12": {
    "0": {
      "v": [
        2825,
        370,
        415,
        220
      ],
      "b": [
        228,
        49,
        62,
        36
      ],
      "sold": 3830,
      "bb": 375,
      "pdmV": [
        3053,
        419,
        477,
        256
      ],
      "pdm": 4205,
      "yl": 11,
      "ar": 12,
      "jwp": 132,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2185,
        355,
        390,
        200
      ],
      "b": [
        182,
        42,
        100,
        75
      ],
      "sold": 3130,
      "bb": 399,
      "pdmV": [
        2367,
        397,
        490,
        275
      ],
      "pdm": 3529,
      "yl": 11,
      "ar": 12,
      "jwp": 132,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2310,
        495,
        605,
        165
      ],
      "b": [
        141,
        92,
        220,
        70
      ],
      "sold": 3575,
      "bb": 523,
      "pdmV": [
        2451,
        587,
        825,
        235
      ],
      "pdm": 4098,
      "yl": 11,
      "ar": 11,
      "jwp": 132,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 120,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        3750,
        230,
        330,
        90
      ],
      "b": [
        700,
        44,
        52,
        56
      ],
      "sold": 4400,
      "bb": 852,
      "pdmV": [
        4450,
        274,
        382,
        146
      ],
      "pdm": 5252,
      "yl": 7,
      "ar": 7,
      "jwp": 84,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3045,
        295,
        305,
        205
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 3850,
      "bb": 93,
      "pdmV": [
        3117,
        303,
        312,
        211
      ],
      "pdm": 3943,
      "yl": 11,
      "ar": 12,
      "jwp": 132,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2060,
        200,
        235,
        70
      ],
      "b": [
        27,
        15,
        18,
        19
      ],
      "sold": 2565,
      "bb": 79,
      "pdmV": [
        2087,
        215,
        253,
        89
      ],
      "pdm": 2644,
      "yl": 9,
      "ar": 11,
      "jwp": 108,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3345,
        335,
        550,
        130
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 4360,
      "bb": 7,
      "pdmV": [
        3346,
        336,
        553,
        132
      ],
      "pdm": 4367,
      "yl": 9,
      "ar": 10,
      "jwp": 108,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        5405,
        595,
        675,
        220
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 6895,
      "bb": 0,
      "pdmV": [
        5405,
        595,
        675,
        220
      ],
      "pdm": 6895,
      "yl": 10,
      "ar": 10,
      "jwp": 120,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 96,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-13": {
    "0": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 143,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 143,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 11,
      "jwp": 143,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 130,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 91,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 143,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 11,
      "jwp": 117,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 10,
      "jwp": 117,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 130,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 104,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-14": {
    "0": {
      "v": [
        3980,
        510,
        615,
        285
      ],
      "b": [
        228,
        49,
        62,
        36
      ],
      "sold": 5390,
      "bb": 375,
      "pdmV": [
        4208,
        559,
        677,
        321
      ],
      "pdm": 5765,
      "yl": 11,
      "ar": 12,
      "jwp": 154,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        3585,
        640,
        645,
        400
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 5270,
      "bb": 398,
      "pdmV": [
        3767,
        682,
        744,
        475
      ],
      "pdm": 5668,
      "yl": 11,
      "ar": 12,
      "jwp": 154,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        3780,
        540,
        750,
        185
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 5255,
      "bb": 522,
      "pdmV": [
        3921,
        632,
        969,
        255
      ],
      "pdm": 5777,
      "yl": 11,
      "ar": 11,
      "jwp": 154,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        9550,
        780,
        875,
        370
      ],
      "b": [
        400,
        18,
        21,
        18
      ],
      "sold": 11575,
      "bb": 457,
      "pdmV": [
        9950,
        798,
        896,
        388
      ],
      "pdm": 12032,
      "yl": 10,
      "ar": 10,
      "jwp": 140,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 98,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        5250,
        570,
        780,
        335
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 6935,
      "bb": 93,
      "pdmV": [
        5322,
        578,
        787,
        341
      ],
      "pdm": 7028,
      "yl": 11,
      "ar": 12,
      "jwp": 154,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        3375,
        310,
        490,
        185
      ],
      "b": [
        27,
        14,
        18,
        19
      ],
      "sold": 4360,
      "bb": 78,
      "pdmV": [
        3402,
        324,
        508,
        204
      ],
      "pdm": 4438,
      "yl": 9,
      "ar": 11,
      "jwp": 126,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        6380,
        625,
        625,
        170
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 7800,
      "bb": 7,
      "pdmV": [
        6381,
        626,
        628,
        172
      ],
      "pdm": 7807,
      "yl": 9,
      "ar": 10,
      "jwp": 126,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 140,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        4440,
        270,
        375,
        95
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 5180,
      "bb": 0,
      "pdmV": [
        4440,
        270,
        375,
        95
      ],
      "pdm": 5180,
      "yl": 8,
      "ar": 8,
      "jwp": 112,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-15": {
    "0": {
      "v": [
        2340,
        270,
        305,
        175
      ],
      "b": [
        228,
        49,
        62,
        36
      ],
      "sold": 3090,
      "bb": 375,
      "pdmV": [
        2568,
        319,
        367,
        211
      ],
      "pdm": 3465,
      "yl": 11,
      "ar": 12,
      "jwp": 165,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2550,
        335,
        465,
        230
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 3580,
      "bb": 398,
      "pdmV": [
        2732,
        377,
        564,
        305
      ],
      "pdm": 3978,
      "yl": 11,
      "ar": 12,
      "jwp": 165,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2380,
        485,
        625,
        200
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3690,
      "bb": 522,
      "pdmV": [
        2521,
        577,
        844,
        270
      ],
      "pdm": 4212,
      "yl": 11,
      "ar": 11,
      "jwp": 165,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 150,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        4575,
        275,
        450,
        205
      ],
      "b": [
        700,
        44,
        52,
        56
      ],
      "sold": 5505,
      "bb": 852,
      "pdmV": [
        5275,
        319,
        502,
        261
      ],
      "pdm": 6357,
      "yl": 7,
      "ar": 7,
      "jwp": 105,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3155,
        300,
        360,
        215
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 4030,
      "bb": 93,
      "pdmV": [
        3227,
        308,
        367,
        221
      ],
      "pdm": 4123,
      "yl": 11,
      "ar": 12,
      "jwp": 165,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        1995,
        190,
        310,
        95
      ],
      "b": [
        27,
        14,
        18,
        18
      ],
      "sold": 2590,
      "bb": 77,
      "pdmV": [
        2022,
        204,
        328,
        113
      ],
      "pdm": 2667,
      "yl": 9,
      "ar": 11,
      "jwp": 135,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        5575,
        440,
        605,
        160
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 6780,
      "bb": 7,
      "pdmV": [
        5576,
        441,
        608,
        162
      ],
      "pdm": 6787,
      "yl": 9,
      "ar": 10,
      "jwp": 135,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        10335,
        1120,
        1135,
        300
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 12890,
      "bb": 0,
      "pdmV": [
        10335,
        1120,
        1135,
        300
      ],
      "pdm": 12890,
      "yl": 10,
      "ar": 10,
      "jwp": 150,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 120,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-16": {
    "0": {
      "v": [
        1925,
        305,
        310,
        175
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 2715,
      "bb": 374,
      "pdmV": [
        2152,
        354,
        372,
        211
      ],
      "pdm": 3089,
      "yl": 11,
      "ar": 12,
      "jwp": 176,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2200,
        360,
        420,
        270
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 3250,
      "bb": 398,
      "pdmV": [
        2382,
        402,
        519,
        345
      ],
      "pdm": 3648,
      "yl": 11,
      "ar": 12,
      "jwp": 176,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2350,
        535,
        665,
        275
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3825,
      "bb": 522,
      "pdmV": [
        2491,
        627,
        884,
        345
      ],
      "pdm": 4347,
      "yl": 11,
      "ar": 11,
      "jwp": 176,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        6800,
        530,
        570,
        340
      ],
      "b": [
        400,
        18,
        21,
        18
      ],
      "sold": 8240,
      "bb": 457,
      "pdmV": [
        7200,
        548,
        591,
        358
      ],
      "pdm": 8697,
      "yl": 10,
      "ar": 10,
      "jwp": 160,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 112,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3070,
        280,
        315,
        260
      ],
      "b": [
        72,
        8,
        7,
        6
      ],
      "sold": 3925,
      "bb": 93,
      "pdmV": [
        3142,
        288,
        322,
        266
      ],
      "pdm": 4018,
      "yl": 11,
      "ar": 12,
      "jwp": 176,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        1980,
        180,
        185,
        90
      ],
      "b": [
        27,
        14,
        18,
        18
      ],
      "sold": 2435,
      "bb": 77,
      "pdmV": [
        2007,
        194,
        203,
        108
      ],
      "pdm": 2512,
      "yl": 9,
      "ar": 11,
      "jwp": 144,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3625,
        380,
        535,
        150
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 4690,
      "bb": 7,
      "pdmV": [
        3626,
        381,
        538,
        152
      ],
      "pdm": 4697,
      "yl": 9,
      "ar": 10,
      "jwp": 144,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 160,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        2785,
        145,
        200,
        60
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 3190,
      "bb": 0,
      "pdmV": [
        2785,
        145,
        200,
        60
      ],
      "pdm": 3190,
      "yl": 8,
      "ar": 8,
      "jwp": 128,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-17": {
    "0": {
      "v": [
        2405,
        255,
        295,
        115
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 3070,
      "bb": 374,
      "pdmV": [
        2632,
        304,
        357,
        151
      ],
      "pdm": 3444,
      "yl": 11,
      "ar": 12,
      "jwp": 187,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2155,
        330,
        385,
        185
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 3055,
      "bb": 398,
      "pdmV": [
        2337,
        372,
        484,
        260
      ],
      "pdm": 3453,
      "yl": 11,
      "ar": 12,
      "jwp": 187,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2535,
        395,
        570,
        240
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3740,
      "bb": 522,
      "pdmV": [
        2676,
        487,
        789,
        310
      ],
      "pdm": 4262,
      "yl": 11,
      "ar": 11,
      "jwp": 187,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 170,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        4005,
        245,
        295,
        180
      ],
      "b": [
        700,
        44,
        51,
        56
      ],
      "sold": 4725,
      "bb": 851,
      "pdmV": [
        4705,
        289,
        346,
        236
      ],
      "pdm": 5576,
      "yl": 7,
      "ar": 7,
      "jwp": 119,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3190,
        310,
        345,
        220
      ],
      "b": [
        71,
        8,
        7,
        6
      ],
      "sold": 4065,
      "bb": 92,
      "pdmV": [
        3261,
        318,
        352,
        226
      ],
      "pdm": 4157,
      "yl": 11,
      "ar": 12,
      "jwp": 187,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2185,
        140,
        235,
        120
      ],
      "b": [
        27,
        14,
        18,
        18
      ],
      "sold": 2680,
      "bb": 77,
      "pdmV": [
        2212,
        154,
        253,
        138
      ],
      "pdm": 2757,
      "yl": 9,
      "ar": 11,
      "jwp": 153,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3955,
        405,
        575,
        175
      ],
      "b": [
        1,
        1,
        3,
        2
      ],
      "sold": 5110,
      "bb": 7,
      "pdmV": [
        3956,
        406,
        578,
        177
      ],
      "pdm": 5117,
      "yl": 9,
      "ar": 10,
      "jwp": 153,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        6565,
        735,
        780,
        170
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 8250,
      "bb": 0,
      "pdmV": [
        6565,
        735,
        780,
        170
      ],
      "pdm": 8250,
      "yl": 10,
      "ar": 10,
      "jwp": 170,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 136,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-18": {
    "0": {
      "v": [
        2360,
        350,
        365,
        235
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 3310,
      "bb": 374,
      "pdmV": [
        2587,
        399,
        427,
        271
      ],
      "pdm": 3684,
      "yl": 11,
      "ar": 12,
      "jwp": 198,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2220,
        365,
        470,
        255
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 3310,
      "bb": 398,
      "pdmV": [
        2402,
        407,
        569,
        330
      ],
      "pdm": 3708,
      "yl": 11,
      "ar": 12,
      "jwp": 198,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2425,
        485,
        680,
        185
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3775,
      "bb": 522,
      "pdmV": [
        2566,
        577,
        899,
        255
      ],
      "pdm": 4297,
      "yl": 11,
      "ar": 11,
      "jwp": 198,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        6245,
        535,
        575,
        350
      ],
      "b": [
        400,
        18,
        21,
        18
      ],
      "sold": 7705,
      "bb": 457,
      "pdmV": [
        6645,
        553,
        596,
        368
      ],
      "pdm": 8162,
      "yl": 10,
      "ar": 10,
      "jwp": 180,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 126,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2755,
        330,
        345,
        265
      ],
      "b": [
        71,
        8,
        7,
        6
      ],
      "sold": 3695,
      "bb": 92,
      "pdmV": [
        2826,
        338,
        352,
        271
      ],
      "pdm": 3787,
      "yl": 11,
      "ar": 12,
      "jwp": 198,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2170,
        225,
        290,
        115
      ],
      "b": [
        27,
        14,
        18,
        18
      ],
      "sold": 2800,
      "bb": 77,
      "pdmV": [
        2197,
        239,
        308,
        133
      ],
      "pdm": 2877,
      "yl": 9,
      "ar": 11,
      "jwp": 162,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3700,
        370,
        490,
        150
      ],
      "b": [
        0,
        1,
        3,
        2
      ],
      "sold": 4710,
      "bb": 6,
      "pdmV": [
        3700,
        371,
        493,
        152
      ],
      "pdm": 4716,
      "yl": 9,
      "ar": 10,
      "jwp": 162,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 180,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        3220,
        150,
        210,
        45
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 3625,
      "bb": 0,
      "pdmV": [
        3220,
        150,
        210,
        45
      ],
      "pdm": 3625,
      "yl": 8,
      "ar": 8,
      "jwp": 144,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-19": {
    "0": {
      "v": [
        2440,
        300,
        295,
        230
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 3265,
      "bb": 374,
      "pdmV": [
        2667,
        349,
        357,
        266
      ],
      "pdm": 3639,
      "yl": 11,
      "ar": 12,
      "jwp": 209,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2310,
        340,
        350,
        220
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 3220,
      "bb": 398,
      "pdmV": [
        2492,
        382,
        449,
        295
      ],
      "pdm": 3618,
      "yl": 11,
      "ar": 12,
      "jwp": 209,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2070,
        440,
        505,
        220
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3235,
      "bb": 522,
      "pdmV": [
        2211,
        532,
        724,
        290
      ],
      "pdm": 3757,
      "yl": 11,
      "ar": 11,
      "jwp": 209,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 190,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        3070,
        275,
        260,
        105
      ],
      "b": [
        699,
        44,
        51,
        56
      ],
      "sold": 3710,
      "bb": 850,
      "pdmV": [
        3769,
        319,
        311,
        161
      ],
      "pdm": 4560,
      "yl": 7,
      "ar": 7,
      "jwp": 133,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3320,
        285,
        330,
        195
      ],
      "b": [
        71,
        8,
        7,
        6
      ],
      "sold": 4130,
      "bb": 92,
      "pdmV": [
        3391,
        293,
        337,
        201
      ],
      "pdm": 4222,
      "yl": 11,
      "ar": 12,
      "jwp": 209,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2110,
        210,
        205,
        90
      ],
      "b": [
        27,
        14,
        18,
        18
      ],
      "sold": 2615,
      "bb": 77,
      "pdmV": [
        2137,
        224,
        223,
        108
      ],
      "pdm": 2692,
      "yl": 9,
      "ar": 11,
      "jwp": 171,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3970,
        370,
        540,
        145
      ],
      "b": [
        0,
        1,
        3,
        2
      ],
      "sold": 5025,
      "bb": 6,
      "pdmV": [
        3970,
        371,
        543,
        147
      ],
      "pdm": 5031,
      "yl": 9,
      "ar": 10,
      "jwp": 171,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        4825,
        490,
        470,
        185
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 5970,
      "bb": 0,
      "pdmV": [
        4825,
        490,
        470,
        185
      ],
      "pdm": 5970,
      "yl": 10,
      "ar": 10,
      "jwp": 190,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 152,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-20": {
    "0": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 220,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 220,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 11,
      "jwp": 220,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 200,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 140,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 220,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 11,
      "jwp": 180,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 10,
      "jwp": 180,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 200,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 160,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-21": {
    "0": {
      "v": [
        4260,
        430,
        540,
        305
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 5535,
      "bb": 374,
      "pdmV": [
        4487,
        479,
        602,
        341
      ],
      "pdm": 5909,
      "yl": 11,
      "ar": 12,
      "jwp": 231,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        3745,
        635,
        580,
        425
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 5385,
      "bb": 398,
      "pdmV": [
        3927,
        677,
        679,
        500
      ],
      "pdm": 5783,
      "yl": 11,
      "ar": 12,
      "jwp": 231,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        4150,
        575,
        695,
        175
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 5595,
      "bb": 522,
      "pdmV": [
        4291,
        667,
        914,
        245
      ],
      "pdm": 6117,
      "yl": 11,
      "ar": 11,
      "jwp": 231,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        10775,
        665,
        760,
        405
      ],
      "b": [
        399,
        18,
        21,
        18
      ],
      "sold": 12605,
      "bb": 456,
      "pdmV": [
        11174,
        683,
        781,
        423
      ],
      "pdm": 13061,
      "yl": 10,
      "ar": 10,
      "jwp": 210,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 147,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        5345,
        615,
        655,
        385
      ],
      "b": [
        71,
        8,
        7,
        6
      ],
      "sold": 7000,
      "bb": 92,
      "pdmV": [
        5416,
        623,
        662,
        391
      ],
      "pdm": 7092,
      "yl": 11,
      "ar": 12,
      "jwp": 231,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        3520,
        400,
        480,
        180
      ],
      "b": [
        27,
        14,
        18,
        18
      ],
      "sold": 4580,
      "bb": 77,
      "pdmV": [
        3547,
        414,
        498,
        198
      ],
      "pdm": 4657,
      "yl": 9,
      "ar": 11,
      "jwp": 189,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        7250,
        650,
        650,
        190
      ],
      "b": [
        0,
        1,
        3,
        2
      ],
      "sold": 8740,
      "bb": 6,
      "pdmV": [
        7250,
        651,
        653,
        192
      ],
      "pdm": 8746,
      "yl": 9,
      "ar": 10,
      "jwp": 189,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 210,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        5285,
        310,
        345,
        130
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 6070,
      "bb": 0,
      "pdmV": [
        5285,
        310,
        345,
        130
      ],
      "pdm": 6070,
      "yl": 8,
      "ar": 8,
      "jwp": 168,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-22": {
    "0": {
      "v": [
        2215,
        355,
        345,
        240
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 3155,
      "bb": 374,
      "pdmV": [
        2442,
        404,
        407,
        276
      ],
      "pdm": 3529,
      "yl": 11,
      "ar": 12,
      "jwp": 242,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2600,
        335,
        420,
        335
      ],
      "b": [
        182,
        42,
        99,
        75
      ],
      "sold": 3690,
      "bb": 398,
      "pdmV": [
        2782,
        377,
        519,
        410
      ],
      "pdm": 4088,
      "yl": 11,
      "ar": 12,
      "jwp": 242,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2340,
        425,
        535,
        175
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3475,
      "bb": 522,
      "pdmV": [
        2481,
        517,
        754,
        245
      ],
      "pdm": 3997,
      "yl": 11,
      "ar": 11,
      "jwp": 242,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 220,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        4780,
        250,
        355,
        145
      ],
      "b": [
        699,
        44,
        51,
        56
      ],
      "sold": 5530,
      "bb": 850,
      "pdmV": [
        5479,
        294,
        406,
        201
      ],
      "pdm": 6380,
      "yl": 7,
      "ar": 7,
      "jwp": 154,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3070,
        260,
        310,
        185
      ],
      "b": [
        71,
        8,
        7,
        6
      ],
      "sold": 3825,
      "bb": 92,
      "pdmV": [
        3141,
        268,
        317,
        191
      ],
      "pdm": 3917,
      "yl": 11,
      "ar": 12,
      "jwp": 242,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2180,
        195,
        210,
        150
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 2735,
      "bb": 76,
      "pdmV": [
        2207,
        209,
        227,
        168
      ],
      "pdm": 2811,
      "yl": 9,
      "ar": 11,
      "jwp": 198,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        5800,
        410,
        515,
        165
      ],
      "b": [
        0,
        1,
        3,
        2
      ],
      "sold": 6890,
      "bb": 6,
      "pdmV": [
        5800,
        411,
        518,
        167
      ],
      "pdm": 6896,
      "yl": 9,
      "ar": 10,
      "jwp": 198,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        9970,
        1050,
        945,
        225
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 12190,
      "bb": 0,
      "pdmV": [
        9970,
        1050,
        945,
        225
      ],
      "pdm": 12190,
      "yl": 10,
      "ar": 10,
      "jwp": 220,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 176,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-23": {
    "0": {
      "v": [
        2145,
        225,
        260,
        185
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 2815,
      "bb": 374,
      "pdmV": [
        2372,
        274,
        322,
        221
      ],
      "pdm": 3189,
      "yl": 11,
      "ar": 12,
      "jwp": 253,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2155,
        340,
        380,
        215
      ],
      "b": [
        181,
        42,
        99,
        75
      ],
      "sold": 3090,
      "bb": 397,
      "pdmV": [
        2336,
        382,
        479,
        290
      ],
      "pdm": 3487,
      "yl": 11,
      "ar": 12,
      "jwp": 253,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2605,
        450,
        540,
        250
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3845,
      "bb": 522,
      "pdmV": [
        2746,
        542,
        759,
        320
      ],
      "pdm": 4367,
      "yl": 11,
      "ar": 11,
      "jwp": 253,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        6070,
        440,
        535,
        340
      ],
      "b": [
        399,
        18,
        21,
        18
      ],
      "sold": 7385,
      "bb": 456,
      "pdmV": [
        6469,
        458,
        556,
        358
      ],
      "pdm": 7841,
      "yl": 10,
      "ar": 10,
      "jwp": 230,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 161,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2985,
        260,
        305,
        160
      ],
      "b": [
        71,
        8,
        6,
        6
      ],
      "sold": 3710,
      "bb": 91,
      "pdmV": [
        3056,
        268,
        311,
        166
      ],
      "pdm": 3801,
      "yl": 11,
      "ar": 12,
      "jwp": 253,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2080,
        425,
        505,
        145
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 3155,
      "bb": 76,
      "pdmV": [
        2107,
        439,
        522,
        163
      ],
      "pdm": 3231,
      "yl": 9,
      "ar": 11,
      "jwp": 207,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        5500,
        455,
        545,
        160
      ],
      "b": [
        0,
        1,
        3,
        2
      ],
      "sold": 6660,
      "bb": 6,
      "pdmV": [
        5500,
        456,
        548,
        162
      ],
      "pdm": 6666,
      "yl": 9,
      "ar": 10,
      "jwp": 207,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 230,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        4325,
        465,
        530,
        135
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 5455,
      "bb": 0,
      "pdmV": [
        4325,
        465,
        530,
        135
      ],
      "pdm": 5455,
      "yl": 8,
      "ar": 8,
      "jwp": 184,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-24": {
    "0": {
      "v": [
        1735,
        215,
        255,
        170
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 2375,
      "bb": 374,
      "pdmV": [
        1962,
        264,
        317,
        206
      ],
      "pdm": 2749,
      "yl": 11,
      "ar": 12,
      "jwp": 264,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2155,
        345,
        375,
        200
      ],
      "b": [
        181,
        42,
        99,
        75
      ],
      "sold": 3075,
      "bb": 397,
      "pdmV": [
        2336,
        387,
        474,
        275
      ],
      "pdm": 3472,
      "yl": 11,
      "ar": 12,
      "jwp": 264,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2665,
        455,
        640,
        185
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3945,
      "bb": 522,
      "pdmV": [
        2806,
        547,
        859,
        255
      ],
      "pdm": 4467,
      "yl": 11,
      "ar": 11,
      "jwp": 264,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 240,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        3900,
        225,
        300,
        145
      ],
      "b": [
        699,
        44,
        51,
        55
      ],
      "sold": 4570,
      "bb": 849,
      "pdmV": [
        4599,
        269,
        351,
        200
      ],
      "pdm": 5419,
      "yl": 7,
      "ar": 7,
      "jwp": 168,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2845,
        280,
        290,
        215
      ],
      "b": [
        71,
        8,
        6,
        6
      ],
      "sold": 3630,
      "bb": 91,
      "pdmV": [
        2916,
        288,
        296,
        221
      ],
      "pdm": 3721,
      "yl": 11,
      "ar": 12,
      "jwp": 264,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2125,
        200,
        295,
        120
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 2740,
      "bb": 76,
      "pdmV": [
        2152,
        214,
        312,
        138
      ],
      "pdm": 2816,
      "yl": 9,
      "ar": 11,
      "jwp": 216,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3550,
        360,
        520,
        140
      ],
      "b": [
        0,
        0,
        3,
        2
      ],
      "sold": 4570,
      "bb": 5,
      "pdmV": [
        3550,
        360,
        523,
        142
      ],
      "pdm": 4575,
      "yl": 9,
      "ar": 10,
      "jwp": 216,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        5760,
        575,
        630,
        290
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 7255,
      "bb": 0,
      "pdmV": [
        5760,
        575,
        630,
        290
      ],
      "pdm": 7255,
      "yl": 10,
      "ar": 10,
      "jwp": 240,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 192,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-25": {
    "0": {
      "v": [
        1860,
        245,
        305,
        225
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 2635,
      "bb": 374,
      "pdmV": [
        2087,
        294,
        367,
        261
      ],
      "pdm": 3009,
      "yl": 11,
      "ar": 12,
      "jwp": 275,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2000,
        315,
        395,
        220
      ],
      "b": [
        181,
        42,
        99,
        75
      ],
      "sold": 2930,
      "bb": 397,
      "pdmV": [
        2181,
        357,
        494,
        295
      ],
      "pdm": 3327,
      "yl": 11,
      "ar": 12,
      "jwp": 275,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2720,
        510,
        575,
        225
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 4030,
      "bb": 522,
      "pdmV": [
        2861,
        602,
        794,
        295
      ],
      "pdm": 4552,
      "yl": 11,
      "ar": 11,
      "jwp": 275,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        6640,
        410,
        475,
        330
      ],
      "b": [
        399,
        18,
        20,
        18
      ],
      "sold": 7855,
      "bb": 455,
      "pdmV": [
        7039,
        428,
        495,
        348
      ],
      "pdm": 8310,
      "yl": 10,
      "ar": 10,
      "jwp": 250,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 175,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2485,
        270,
        310,
        165
      ],
      "b": [
        71,
        8,
        6,
        6
      ],
      "sold": 3230,
      "bb": 91,
      "pdmV": [
        2556,
        278,
        316,
        171
      ],
      "pdm": 3321,
      "yl": 11,
      "ar": 12,
      "jwp": 275,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2190,
        240,
        280,
        100
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 2810,
      "bb": 76,
      "pdmV": [
        2217,
        254,
        297,
        118
      ],
      "pdm": 2886,
      "yl": 9,
      "ar": 11,
      "jwp": 225,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3320,
        325,
        550,
        160
      ],
      "b": [
        0,
        0,
        3,
        2
      ],
      "sold": 4355,
      "bb": 5,
      "pdmV": [
        3320,
        325,
        553,
        162
      ],
      "pdm": 4360,
      "yl": 9,
      "ar": 10,
      "jwp": 225,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 250,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        3070,
        175,
        245,
        60
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 3550,
      "bb": 0,
      "pdmV": [
        3070,
        175,
        245,
        60
      ],
      "pdm": 3550,
      "yl": 8,
      "ar": 8,
      "jwp": 200,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-26": {
    "0": {
      "v": [
        1765,
        210,
        220,
        195
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 2390,
      "bb": 374,
      "pdmV": [
        1992,
        259,
        282,
        231
      ],
      "pdm": 2764,
      "yl": 11,
      "ar": 12,
      "jwp": 286,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2430,
        350,
        435,
        225
      ],
      "b": [
        181,
        42,
        99,
        75
      ],
      "sold": 3440,
      "bb": 397,
      "pdmV": [
        2611,
        392,
        534,
        300
      ],
      "pdm": 3837,
      "yl": 11,
      "ar": 12,
      "jwp": 286,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2475,
        490,
        540,
        225
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3730,
      "bb": 522,
      "pdmV": [
        2616,
        582,
        759,
        295
      ],
      "pdm": 4252,
      "yl": 11,
      "ar": 11,
      "jwp": 286,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 260,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        3760,
        230,
        355,
        150
      ],
      "b": [
        699,
        43,
        51,
        55
      ],
      "sold": 4495,
      "bb": 848,
      "pdmV": [
        4459,
        273,
        406,
        205
      ],
      "pdm": 5343,
      "yl": 7,
      "ar": 7,
      "jwp": 182,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2110,
        275,
        230,
        140
      ],
      "b": [
        71,
        8,
        6,
        6
      ],
      "sold": 2755,
      "bb": 91,
      "pdmV": [
        2181,
        283,
        236,
        146
      ],
      "pdm": 2846,
      "yl": 11,
      "ar": 12,
      "jwp": 286,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        1990,
        190,
        235,
        90
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 2505,
      "bb": 76,
      "pdmV": [
        2017,
        204,
        252,
        108
      ],
      "pdm": 2581,
      "yl": 9,
      "ar": 11,
      "jwp": 234,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3070,
        355,
        500,
        140
      ],
      "b": [
        0,
        0,
        3,
        2
      ],
      "sold": 4065,
      "bb": 5,
      "pdmV": [
        3070,
        355,
        503,
        142
      ],
      "pdm": 4070,
      "yl": 9,
      "ar": 10,
      "jwp": 234,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        5920,
        530,
        510,
        205
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 7165,
      "bb": 0,
      "pdmV": [
        5920,
        530,
        510,
        205
      ],
      "pdm": 7165,
      "yl": 10,
      "ar": 10,
      "jwp": 260,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 208,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-27": {
    "0": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 297,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 297,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 11,
      "jwp": 297,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 270,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 189,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 11,
      "ar": 12,
      "jwp": 297,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 11,
      "jwp": 243,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 9,
      "ar": 10,
      "jwp": 243,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 270,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 216,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-28": {
    "0": {
      "v": [
        4150,
        440,
        480,
        390
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 5460,
      "bb": 374,
      "pdmV": [
        4377,
        489,
        542,
        426
      ],
      "pdm": 5834,
      "yl": 11,
      "ar": 12,
      "jwp": 308,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        3950,
        615,
        625,
        450
      ],
      "b": [
        181,
        42,
        99,
        75
      ],
      "sold": 5640,
      "bb": 397,
      "pdmV": [
        4131,
        657,
        724,
        525
      ],
      "pdm": 6037,
      "yl": 11,
      "ar": 12,
      "jwp": 308,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        4185,
        535,
        755,
        225
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 5700,
      "bb": 522,
      "pdmV": [
        4326,
        627,
        974,
        295
      ],
      "pdm": 6222,
      "yl": 11,
      "ar": 11,
      "jwp": 308,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        11590,
        650,
        750,
        435
      ],
      "b": [
        399,
        18,
        20,
        18
      ],
      "sold": 13425,
      "bb": 455,
      "pdmV": [
        11989,
        668,
        770,
        453
      ],
      "pdm": 13880,
      "yl": 10,
      "ar": 10,
      "jwp": 280,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 196,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        5085,
        565,
        565,
        385
      ],
      "b": [
        71,
        8,
        6,
        6
      ],
      "sold": 6600,
      "bb": 91,
      "pdmV": [
        5156,
        573,
        571,
        391
      ],
      "pdm": 6691,
      "yl": 11,
      "ar": 12,
      "jwp": 308,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        3450,
        365,
        495,
        190
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 4500,
      "bb": 76,
      "pdmV": [
        3477,
        379,
        512,
        208
      ],
      "pdm": 4576,
      "yl": 9,
      "ar": 11,
      "jwp": 252,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        6550,
        625,
        625,
        185
      ],
      "b": [
        0,
        0,
        2,
        2
      ],
      "sold": 7985,
      "bb": 4,
      "pdmV": [
        6550,
        625,
        627,
        187
      ],
      "pdm": 7989,
      "yl": 9,
      "ar": 10,
      "jwp": 252,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 280,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        3715,
        135,
        185,
        30
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 4065,
      "bb": 0,
      "pdmV": [
        3715,
        135,
        185,
        30
      ],
      "pdm": 4065,
      "yl": 8,
      "ar": 8,
      "jwp": 224,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-29": {
    "0": {
      "v": [
        2505,
        285,
        275,
        210
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 3275,
      "bb": 374,
      "pdmV": [
        2732,
        334,
        337,
        246
      ],
      "pdm": 3649,
      "yl": 11,
      "ar": 12,
      "jwp": 319,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2155,
        290,
        305,
        195
      ],
      "b": [
        181,
        41,
        99,
        75
      ],
      "sold": 2945,
      "bb": 396,
      "pdmV": [
        2336,
        331,
        404,
        270
      ],
      "pdm": 3341,
      "yl": 11,
      "ar": 12,
      "jwp": 319,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2395,
        500,
        605,
        190
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 3690,
      "bb": 522,
      "pdmV": [
        2536,
        592,
        824,
        260
      ],
      "pdm": 4212,
      "yl": 11,
      "ar": 11,
      "jwp": 319,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 290,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        5180,
        365,
        475,
        185
      ],
      "b": [
        699,
        43,
        51,
        55
      ],
      "sold": 6205,
      "bb": 848,
      "pdmV": [
        5879,
        408,
        526,
        240
      ],
      "pdm": 7053,
      "yl": 7,
      "ar": 7,
      "jwp": 203,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        2940,
        280,
        285,
        185
      ],
      "b": [
        71,
        8,
        6,
        6
      ],
      "sold": 3690,
      "bb": 91,
      "pdmV": [
        3011,
        288,
        291,
        191
      ],
      "pdm": 3781,
      "yl": 11,
      "ar": 12,
      "jwp": 319,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2395,
        220,
        300,
        105
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 3020,
      "bb": 76,
      "pdmV": [
        2422,
        234,
        317,
        123
      ],
      "pdm": 3096,
      "yl": 9,
      "ar": 11,
      "jwp": 261,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        4200,
        405,
        500,
        155
      ],
      "b": [
        0,
        0,
        2,
        1
      ],
      "sold": 5260,
      "bb": 3,
      "pdmV": [
        4200,
        405,
        502,
        156
      ],
      "pdm": 5263,
      "yl": 9,
      "ar": 10,
      "jwp": 261,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        12010,
        860,
        1030,
        290
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 14190,
      "bb": 0,
      "pdmV": [
        12010,
        860,
        1030,
        290
      ],
      "pdm": 14190,
      "yl": 10,
      "ar": 10,
      "jwp": 290,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 8,
      "ar": 8,
      "jwp": 232,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  },
  "2026-09-30": {
    "0": {
      "v": [
        3400,
        325,
        340,
        220
      ],
      "b": [
        227,
        49,
        62,
        36
      ],
      "sold": 4285,
      "bb": 374,
      "pdmV": [
        3627,
        374,
        402,
        256
      ],
      "pdm": 4659,
      "yl": 11,
      "ar": 12,
      "jwp": 330,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 5
    },
    "1": {
      "v": [
        2100,
        360,
        420,
        235
      ],
      "b": [
        181,
        41,
        99,
        75
      ],
      "sold": 3115,
      "bb": 396,
      "pdmV": [
        2281,
        401,
        519,
        310
      ],
      "pdm": 3511,
      "yl": 11,
      "ar": 12,
      "jwp": 330,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "2": {
      "v": [
        2450,
        600,
        705,
        310
      ],
      "b": [
        141,
        92,
        219,
        70
      ],
      "sold": 4065,
      "bb": 522,
      "pdmV": [
        2591,
        692,
        924,
        380
      ],
      "pdm": 4587,
      "yl": 11,
      "ar": 11,
      "jwp": 330,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 3
    },
    "3": {
      "v": [
        6130,
        450,
        525,
        395
      ],
      "b": [
        399,
        18,
        20,
        18
      ],
      "sold": 7500,
      "bb": 455,
      "pdmV": [
        6529,
        468,
        545,
        413
      ],
      "pdm": 7955,
      "yl": 10,
      "ar": 10,
      "jwp": 300,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "4": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 7,
      "ar": 7,
      "jwp": 210,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 2
    },
    "5": {
      "v": [
        3035,
        230,
        280,
        215
      ],
      "b": [
        71,
        8,
        6,
        5
      ],
      "sold": 3760,
      "bb": 90,
      "pdmV": [
        3106,
        238,
        286,
        220
      ],
      "pdm": 3850,
      "yl": 11,
      "ar": 12,
      "jwp": 330,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 4
    },
    "6": {
      "v": [
        2485,
        250,
        290,
        205
      ],
      "b": [
        27,
        14,
        17,
        18
      ],
      "sold": 3230,
      "bb": 76,
      "pdmV": [
        2512,
        264,
        307,
        223
      ],
      "pdm": 3306,
      "yl": 9,
      "ar": 11,
      "jwp": 270,
      "absen": 0,
      "frek": 0,
      "l250": 2,
      "l300": 3
    },
    "7": {
      "v": [
        3200,
        375,
        465,
        130
      ],
      "b": [
        0,
        0,
        2,
        1
      ],
      "sold": 4170,
      "bb": 3,
      "pdmV": [
        3200,
        375,
        467,
        131
      ],
      "pdm": 4173,
      "yl": 9,
      "ar": 10,
      "jwp": 270,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 0
    },
    "8": {
      "v": [
        0,
        0,
        0,
        0
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 0,
      "bb": 0,
      "pdmV": [
        0,
        0,
        0,
        0
      ],
      "pdm": 0,
      "yl": 10,
      "ar": 10,
      "jwp": 300,
      "absen": 0,
      "frek": 0,
      "l250": 0,
      "l300": 1
    },
    "9": {
      "v": [
        3820,
        150,
        275,
        60
      ],
      "b": [
        0,
        0,
        0,
        0
      ],
      "sold": 4305,
      "bb": 0,
      "pdmV": [
        3820,
        150,
        275,
        60
      ],
      "pdm": 4305,
      "yl": 8,
      "ar": 8,
      "jwp": 240,
      "absen": 0,
      "frek": 0,
      "l250": 3,
      "l300": 4
    }
  }
};

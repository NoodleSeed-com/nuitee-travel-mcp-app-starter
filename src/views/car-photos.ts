// Approved model-reference photos, not rental inventory. Display source and license in Photo sources.
export interface CarPhotoCredit {
  source: string;
  image: string;
  author: string;
  license: string;
  licenseUrl: string;
}
export const carPhotos: Readonly<Record<string, CarPhotoCredit>> = {
  yu7: {
    source:
      "https://commons.wikimedia.org/wiki/File:Xiaomi_YU7_Emerald_Green_Metallic_01.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Xiaomi_YU7_Emerald_Green_Metallic_01.jpg/1280px-Xiaomi_YU7_Emerald_Green_Metallic_01.jpg",
    author: "Ethan Llamas",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  ultra: {
    source:
      "https://commons.wikimedia.org/wiki/File:Xiaomi_SU7_Ultra_front_view_(April_7,_2025).jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Xiaomi_SU7_Ultra_front_view_%28April_7%2C_2025%29.jpg/1280px-Xiaomi_SU7_Ultra_front_view_%28April_7%2C_2025%29.jpg",
    author: "茅野ふたば",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  model3: {
    source:
      "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_(2023)_Autofr%C3%BChling_Ulm_IMG_9282.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Tesla_Model_3_%282023%29_Autofr%C3%BChling_Ulm_IMG_9282.jpg/1280px-Tesla_Model_3_%282023%29_Autofr%C3%BChling_Ulm_IMG_9282.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  i4: {
    source: "https://commons.wikimedia.org/wiki/File:BMW_i4_IMG_6695.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/BMW_i4_IMG_6695.jpg/1280px-BMW_i4_IMG_6695.jpg",
    author: "Alexander Migl",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  taycan: {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Porsche_Taycan_4S_79kWh_Front.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/2020_Porsche_Taycan_4S_79kWh_Front.jpg/1280px-2020_Porsche_Taycan_4S_79kWh_Front.jpg",
    author: "Vauxford",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  ex30: {
    source: "https://commons.wikimedia.org/wiki/File:Volvo_EX30_IMG_8923.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Volvo_EX30_IMG_8923.jpg/1280px-Volvo_EX30_IMG_8923.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  mini: {
    source:
      "https://commons.wikimedia.org/wiki/File:Mini_Hatch_(F56)_Electric_IMG_2679.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Mini_Hatch_%28F56%29_Electric_IMG_2679.jpg/1280px-Mini_Hatch_%28F56%29_Electric_IMG_2679.jpg",
    author: "Alexander Migl",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  yaris: {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Toyota_Yaris_Design_HEV_CVT_1.5_Front.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/2020_Toyota_Yaris_Design_HEV_CVT_1.5_Front.jpg/1280px-2020_Toyota_Yaris_Design_HEV_CVT_1.5_Front.jpg",
    author: "Vauxford",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  golf: {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Volkswagen_Golf_Style_1.5_Front.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/2020_Volkswagen_Golf_Style_1.5_Front.jpg/1280px-2020_Volkswagen_Golf_Style_1.5_Front.jpg",
    author: "Vauxford",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  ioniq: {
    source:
      "https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_5_AWD_Techniq-Paket_%E2%80%93_f_31122024.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Hyundai_Ioniq_5_AWD_Techniq-Paket_%E2%80%93_f_31122024.jpg/1280px-Hyundai_Ioniq_5_AWD_Techniq-Paket_%E2%80%93_f_31122024.jpg",
    author: "© M 93",
    license: "CC BY-SA 3.0 de",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
  },
  eqe: {
    source:
      "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_V295_350%2B_Classic-Days_2022_DSC_0018.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Mercedes-Benz_V295_350%2B_Classic-Days_2022_DSC_0018.jpg/1280px-Mercedes-Benz_V295_350%2B_Classic-Days_2022_DSC_0018.jpg",
    author: "Alexander Migl",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  su7: {
    source:
      "https://commons.wikimedia.org/wiki/File:Xiaomi_SU7_blue_front_view.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Xiaomi_SU7_blue_front_view.jpg/1280px-Xiaomi_SU7_blue_front_view.jpg",
    author: "茅野ふたば",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  civic: {
    source:
      "https://commons.wikimedia.org/wiki/File:2025_Honda_Civic_Sport_Touring_Hybrid_in_Blue_Lagoon,_front_left,_2024-09-24.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/2025_Honda_Civic_Sport_Touring_Hybrid_in_Blue_Lagoon%2C_front_left%2C_2024-09-24.jpg/1280px-2025_Honda_Civic_Sport_Touring_Hybrid_in_Blue_Lagoon%2C_front_left%2C_2024-09-24.jpg",
    author: "Elise240SX",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "civic-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:2025_Honda_Civic_Sport_Touring_Hybrid_in_Blue_Lagoon,_rear_left,_2024-09-24.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/2025_Honda_Civic_Sport_Touring_Hybrid_in_Blue_Lagoon%2C_rear_left%2C_2024-09-24.jpg/1280px-2025_Honda_Civic_Sport_Touring_Hybrid_in_Blue_Lagoon%2C_rear_left%2C_2024-09-24.jpg",
    author: "Elise240SX",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "civic-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:2025_Honda_Civic_Hybrid_Sport_Touring_(facelift),_front_4.18.25.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/2025_Honda_Civic_Hybrid_Sport_Touring_%28facelift%29%2C_front_4.18.25.jpg/1280px-2025_Honda_Civic_Hybrid_Sport_Touring_%28facelift%29%2C_front_4.18.25.jpg",
    author: "Kevauto",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  countryman: {
    source:
      "https://commons.wikimedia.org/wiki/File:Mini_Countryman_(U25)_SE_IAA_2023_1X7A0735.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Mini_Countryman_%28U25%29_SE_IAA_2023_1X7A0735.jpg/1280px-Mini_Countryman_%28U25%29_SE_IAA_2023_1X7A0735.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "countryman-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Mini_Countryman_(U25)_SE_IAA_2023_1X7A0736.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Mini_Countryman_%28U25%29_SE_IAA_2023_1X7A0736.jpg/1280px-Mini_Countryman_%28U25%29_SE_IAA_2023_1X7A0736.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "countryman-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Mini_Countryman_S_Electric_U25_Classic_ALL4_Melting_Silver_-_rear.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Mini_Countryman_S_Electric_U25_Classic_ALL4_Melting_Silver_-_rear.jpg/1280px-Mini_Countryman_S_Electric_U25_Classic_ALL4_Melting_Silver_-_rear.jpg",
    author: "Ethan Llamas",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  crown: {
    source:
      "https://commons.wikimedia.org/wiki/File:2025_Toyota_Crown_Signia_Limited_in_Storm_Cloud,_front_right,_2025-04-14.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/2025_Toyota_Crown_Signia_Limited_in_Storm_Cloud%2C_front_right%2C_2025-04-14.jpg/1280px-2025_Toyota_Crown_Signia_Limited_in_Storm_Cloud%2C_front_right%2C_2025-04-14.jpg",
    author: "Elise240SX",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "crown-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Toyota_Crown_Signia_Limited_(2026)_(55213727966).jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Toyota_Crown_Signia_Limited_%282026%29_%2855213727966%29.jpg/1280px-Toyota_Crown_Signia_Limited_%282026%29_%2855213727966%29.jpg",
    author: "Charles from Port Chester, New York",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
  },
  "crown-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Toyota_Crown_Signia_Limited_(2026)_(55214126305).jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Toyota_Crown_Signia_Limited_%282026%29_%2855214126305%29.jpg/1280px-Toyota_Crown_Signia_Limited_%282026%29_%2855214126305%29.jpg",
    author: "Charles from Port Chester, New York",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
  },
  "su7-2": {
    source: "https://commons.wikimedia.org/wiki/File:Xiaomi_SU7_IMG02.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Xiaomi_SU7_IMG02.jpg/1280px-Xiaomi_SU7_IMG02.jpg",
    author: "John kwame westafrica",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
  },
  "su7-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Interior_of_of_Xiaomi_SU7_Max-20240413.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Interior_of_of_Xiaomi_SU7_Max-20240413.jpg/1280px-Interior_of_of_Xiaomi_SU7_Max-20240413.jpg",
    author: "Shwangtianyuan",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "yu7-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Xiaomi_YU7_Emerald_Green_Metallic_02.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Xiaomi_YU7_Emerald_Green_Metallic_02.jpg/1280px-Xiaomi_YU7_Emerald_Green_Metallic_02.jpg",
    author: "Ethan Llamas",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "yu7-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Xiaomi_YU7_Emerald_Green_Metallic.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Xiaomi_YU7_Emerald_Green_Metallic.jpg/1280px-Xiaomi_YU7_Emerald_Green_Metallic.jpg",
    author: "Ethan Llamas",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "ultra-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Xiaomi_SU7_Ultra_yellow_showroom_side_view_2026_dllu.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Xiaomi_SU7_Ultra_yellow_showroom_side_view_2026_dllu.jpg/1280px-Xiaomi_SU7_Ultra_yellow_showroom_side_view_2026_dllu.jpg",
    author: "Daniel Lu (User:dllu)",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "ultra-3": {
    source: "https://commons.wikimedia.org/wiki/File:Xiaomi_SU7_Ultra_003.jpg",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/4/40/Xiaomi_SU7_Ultra_003.jpg",
    author: "Zoerides",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
  },
  "model3-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_(2023)_1X7A1678.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Tesla_Model_3_%282023%29_1X7A1678.jpg/1280px-Tesla_Model_3_%282023%29_1X7A1678.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "model3-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_(2023)_Auto_Zuerich_2023_1X7A1313.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Tesla_Model_3_%282023%29_Auto_Zuerich_2023_1X7A1313.jpg/1280px-Tesla_Model_3_%282023%29_Auto_Zuerich_2023_1X7A1313.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "i4-2": {
    source: "https://commons.wikimedia.org/wiki/File:BMW_i4_1X7A6838.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/BMW_i4_1X7A6838.jpg/1280px-BMW_i4_1X7A6838.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "i4-3": {
    source: "https://commons.wikimedia.org/wiki/File:BMW_i4_1X7A0320.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/BMW_i4_1X7A0320.jpg/1280px-BMW_i4_1X7A0320.jpg",
    author: "Alexander Migl",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "taycan-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Porsche_Taycan_4S_79kWh_Rear.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/2020_Porsche_Taycan_4S_79kWh_Rear.jpg/1280px-2020_Porsche_Taycan_4S_79kWh_Rear.jpg",
    author: "Vauxford",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "taycan-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Porsche_Taycan_4S.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/2020_Porsche_Taycan_4S.jpg/1280px-2020_Porsche_Taycan_4S.jpg",
    author: "Calreyn88",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "ex30-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Volvo_EX30_Auto_Zuerich_2023_1X7A0949.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Volvo_EX30_Auto_Zuerich_2023_1X7A0949.jpg/1280px-Volvo_EX30_Auto_Zuerich_2023_1X7A0949.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "ex30-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Volvo_EX30_Auto_Zuerich_2023_1X7A0954.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Volvo_EX30_Auto_Zuerich_2023_1X7A0954.jpg/1280px-Volvo_EX30_Auto_Zuerich_2023_1X7A0954.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "mini-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Mini_Hatch_(F56)_Electric_1X7A1619.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Mini_Hatch_%28F56%29_Electric_1X7A1619.jpg/1280px-Mini_Hatch_%28F56%29_Electric_1X7A1619.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "mini-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:2021_Mini_Hatch_(F56)_Electric_IMG_6080.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/2021_Mini_Hatch_%28F56%29_Electric_IMG_6080.jpg/1280px-2021_Mini_Hatch_%28F56%29_Electric_IMG_6080.jpg",
    author: "Alexander Migl",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "yaris-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Toyota_Yaris_Design_HEV_CVT_1.5_Rear.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/2020_Toyota_Yaris_Design_HEV_CVT_1.5_Rear.jpg/1280px-2020_Toyota_Yaris_Design_HEV_CVT_1.5_Rear.jpg",
    author: "Vauxford",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "yaris-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Toyota_Yaris_Hybrid_(XP210)_IMG_4863.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Toyota_Yaris_Hybrid_%28XP210%29_IMG_4863.jpg/1280px-Toyota_Yaris_Hybrid_%28XP210%29_IMG_4863.jpg",
    author: "Alexander Migl",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "golf-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Volkswagen_Golf_Style_1.5_Side.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/2020_Volkswagen_Golf_Style_1.5_Side.jpg/1280px-2020_Volkswagen_Golf_Style_1.5_Side.jpg",
    author: "Vauxford",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "golf-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:2020_Volkswagen_Golf_Style_1.5_Rear.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/2020_Volkswagen_Golf_Style_1.5_Rear.jpg/1280px-2020_Volkswagen_Golf_Style_1.5_Rear.jpg",
    author: "Vauxford",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "ioniq-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_5_(2021,_Weymouth,_UK_-_rear).jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Hyundai_Ioniq_5_%282021%2C_Weymouth%2C_UK_-_rear%29.jpg/1280px-Hyundai_Ioniq_5_%282021%2C_Weymouth%2C_UK_-_rear%29.jpg",
    author: "Andrew Bone",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
  },
  "ioniq-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Hyundai_Ioniq_5_(2021,_Weymouth,_UK_-_side_%26_rear).jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Hyundai_Ioniq_5_%282021%2C_Weymouth%2C_UK_-_side_%26_rear%29.jpg/1280px-Hyundai_Ioniq_5_%282021%2C_Weymouth%2C_UK_-_side_%26_rear%29.jpg",
    author: "Andrew Bone",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
  },
  "eqe-2": {
    source:
      "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_V295_500_1X7A6809.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Mercedes-Benz_V295_500_1X7A6809.jpg/1280px-Mercedes-Benz_V295_500_1X7A6809.jpg",
    author: "Alexander-93",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "eqe-3": {
    source:
      "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_V295_IAA_2021_1X7A0114.jpg",
    image:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Mercedes-Benz_V295_IAA_2021_1X7A0114.jpg/1280px-Mercedes-Benz_V295_IAA_2021_1X7A0114.jpg",
    author: "Alexander Migl",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
};

// 자동 생성 파일. `pnpm legal:archive` 가 만든다. 손으로 고치지 않는다(#174).
import ko_terms_20260420 from "@/content/legal/ko/archive/terms/2026-04-20.json";
import ko_terms_20260501 from "@/content/legal/ko/archive/terms/2026-05-01.json";
import ko_terms_20260629 from "@/content/legal/ko/archive/terms/2026-06-29.json";
import ko_terms_20260908 from "@/content/legal/ko/archive/terms/2026-09-08.json";
import ko_privacy_20260420 from "@/content/legal/ko/archive/privacy/2026-04-20.json";
import ko_privacy_20260501 from "@/content/legal/ko/archive/privacy/2026-05-01.json";
import ko_privacy_20260629 from "@/content/legal/ko/archive/privacy/2026-06-29.json";
import ko_privacy_20260908 from "@/content/legal/ko/archive/privacy/2026-09-08.json";
import ko_location_20260420 from "@/content/legal/ko/archive/location/2026-04-20.json";
import ko_location_20260519 from "@/content/legal/ko/archive/location/2026-05-19.json";
import ko_location_20260908 from "@/content/legal/ko/archive/location/2026-09-08.json";
import ko_marketing_20260420 from "@/content/legal/ko/archive/marketing/2026-04-20.json";
import ko_marketing_20260501 from "@/content/legal/ko/archive/marketing/2026-05-01.json";
import ko_marketing_20260908 from "@/content/legal/ko/archive/marketing/2026-09-08.json";
import ja_terms_20260629 from "@/content/legal/ja/archive/terms/2026-06-29.json";
import ja_terms_20260908 from "@/content/legal/ja/archive/terms/2026-09-08.json";
import ja_privacy_20260629 from "@/content/legal/ja/archive/privacy/2026-06-29.json";
import ja_privacy_20260908 from "@/content/legal/ja/archive/privacy/2026-09-08.json";
import ja_location_20260519 from "@/content/legal/ja/archive/location/2026-05-19.json";
import ja_location_20260908 from "@/content/legal/ja/archive/location/2026-09-08.json";
import ja_marketing_20260501 from "@/content/legal/ja/archive/marketing/2026-05-01.json";
import ja_marketing_20260908 from "@/content/legal/ja/archive/marketing/2026-09-08.json";
import en_terms_20260629 from "@/content/legal/en/archive/terms/2026-06-29.json";
import en_terms_20260908 from "@/content/legal/en/archive/terms/2026-09-08.json";
import en_privacy_20260629 from "@/content/legal/en/archive/privacy/2026-06-29.json";
import en_privacy_20260908 from "@/content/legal/en/archive/privacy/2026-09-08.json";
import en_location_20260519 from "@/content/legal/en/archive/location/2026-05-19.json";
import en_location_20260908 from "@/content/legal/en/archive/location/2026-09-08.json";
import en_marketing_20260501 from "@/content/legal/en/archive/marketing/2026-05-01.json";
import en_marketing_20260908 from "@/content/legal/en/archive/marketing/2026-09-08.json";
import type { PolicyData } from "./documents";
import type { HistoryDoc } from "./history";
import type { Locale } from "@/lib/i18n/config";

export const ARCHIVE: Record<Locale, Record<HistoryDoc, Record<string, PolicyData>>> = {
  ko: {
    terms: {
      "2026-04-20": ko_terms_20260420 as PolicyData,
      "2026-05-01": ko_terms_20260501 as PolicyData,
      "2026-06-29": ko_terms_20260629 as PolicyData,
      "2026-09-08": ko_terms_20260908 as PolicyData,
    },
    privacy: {
      "2026-04-20": ko_privacy_20260420 as PolicyData,
      "2026-05-01": ko_privacy_20260501 as PolicyData,
      "2026-06-29": ko_privacy_20260629 as PolicyData,
      "2026-09-08": ko_privacy_20260908 as PolicyData,
    },
    location: {
      "2026-04-20": ko_location_20260420 as PolicyData,
      "2026-05-19": ko_location_20260519 as PolicyData,
      "2026-09-08": ko_location_20260908 as PolicyData,
    },
    marketing: {
      "2026-04-20": ko_marketing_20260420 as PolicyData,
      "2026-05-01": ko_marketing_20260501 as PolicyData,
      "2026-09-08": ko_marketing_20260908 as PolicyData,
    },
  },
  ja: {
    terms: {
      "2026-06-29": ja_terms_20260629 as PolicyData,
      "2026-09-08": ja_terms_20260908 as PolicyData,
    },
    privacy: {
      "2026-06-29": ja_privacy_20260629 as PolicyData,
      "2026-09-08": ja_privacy_20260908 as PolicyData,
    },
    location: {
      "2026-05-19": ja_location_20260519 as PolicyData,
      "2026-09-08": ja_location_20260908 as PolicyData,
    },
    marketing: {
      "2026-05-01": ja_marketing_20260501 as PolicyData,
      "2026-09-08": ja_marketing_20260908 as PolicyData,
    },
  },
  en: {
    terms: {
      "2026-06-29": en_terms_20260629 as PolicyData,
      "2026-09-08": en_terms_20260908 as PolicyData,
    },
    privacy: {
      "2026-06-29": en_privacy_20260629 as PolicyData,
      "2026-09-08": en_privacy_20260908 as PolicyData,
    },
    location: {
      "2026-05-19": en_location_20260519 as PolicyData,
      "2026-09-08": en_location_20260908 as PolicyData,
    },
    marketing: {
      "2026-05-01": en_marketing_20260501 as PolicyData,
      "2026-09-08": en_marketing_20260908 as PolicyData,
    },
  },
};

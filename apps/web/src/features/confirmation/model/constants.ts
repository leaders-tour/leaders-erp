export const CONFIRMATION_TITLE = '리더스투어 여정확정서';
export const CONFIRMATION_TAGLINE = 'Walk New Paths, Write Your Own Story';
export {
  CONFIRMATION_MEETING_PLACE_AIRPORT,
  CONFIRMATION_MEETING_PLACE_DEFAULT,
} from '@tour/validation';

export const CONFIRMATION_COMPANY = {
  businessNumber: '858-09-02356',
  naverPlace: '리더스투어 몽골리아',
  instagram: '@leaders.mongolia',
  kakaoChannel: '리더스투어_몽골리아',
} as const;

export const CONFIRMATION_FOOTER_NOTICE =
  '※ 항공편 지연 또는 결항 등 차질 발생 시 채널을 통하여 꼭 공유해 주시기 바랍니다.';

/** 확정서 3p: 이동강도 안내 (견적서 page-04와 동일) */
export const CONFIRMATION_MOVEMENT_INTENSITY_PAGE_SRC = '/estimate/page-04.webp';

/** 확정서 4p: 리더스투어 안내사항 (견적서 정적 이미지 마지막 페이지) */
export const CONFIRMATION_NOTICE_PAGE_SRC = '/estimate/page-12.webp';

/** 기본값 true — Page2 일정표 + 이동강도·안내 이미지 2페이지 */
export const DEFAULT_CONFIRMATION_APPENDIX_INCLUDE_IMAGE_PAGES = true;

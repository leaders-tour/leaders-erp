const FORM_TEMPLATE = `
▶ 성함 :
▶ 이메일 :
▶ 인원, 성비 :
▶ 희망 여행지 :
▶ 투어 날짜(실투어 기준) :
▶ 입출국일, 시간 :
▶ 희망 이동 강도 :
(1. 매우 여유 / 2. 여유 / 3. 보통 / 4. 높음 / 5. 매우 높음)
▶ 희망 숙소 등급 :
(Lv1. 캠핑, Lv2. 전통게르, Lv3. 여행자캠프 일반게르, 게르게스트하우스, Lv4. 디럭스게르, 호텔, 독채팬션)
▶ 희망 차량 유무 :
▶ 이외 특별 희망 사항 :
`;

const JSON_SCHEMA = `
{
  "contact": { "name": string | null, "email": string | null },
  "headcount": { "total": number | null, "male": number | null, "female": number | null, "rawText": string },
  "destinationPreference": { "rawText": string, "normalizedKeyword": string | null },
  "tourDates": { "rawText": string, "startDate": "YYYY-MM-DD" | null, "endDate": "YYYY-MM-DD" | null },
  "flightOrBorder": {
    "rawText": string,
    "inbound": { "date": "YYYY-MM-DD" | null, "time": "HH:mm" | null } | null,
    "outbound": { "date": "YYYY-MM-DD" | null, "time": "HH:mm" | null } | null
  },
  "movementIntensity": { "level1to5": 1|2|3|4|5 | null, "rawLabel": string },
  "lodgingPreference": { "rawText": string, "suggestedLevel": "LV1"|"LV2"|"LV3"|"LV4" | null },
  "vehicle": { "wantsVehicle": boolean | null, "mentionedTypes": string[] },
  "specialRequests": string | null
}
`;

const ENUM_HINTS = `
- movementIntensity.level1to5: "매우 여유"=1, "여유"=2, "보통"=3, "높음"=4, "매우 높음"=5
- lodgingPreference.suggestedLevel: "캠핑"/"LV1"→LV1, "전통게르"/"게르"→LV2, "여행자캠프"/"일반게르"/"게르게스트하우스"→LV3, "디럭스"/"호텔"/"독채"/"팬션"→LV4
- vehicle.mentionedTypes: "스타렉스","푸르공","벨파이어","하이에이스" 등 언급된 차량명 배열
- 날짜: 투어 날짜는 실투어 기준(픽업~드랍). 입출국일/시간은 별도. 연도 없으면 null.
- 시간: "HH:mm" 형식. "새벽4시30분"→"04:30", "오후6시15분"→"18:15"
`;

export function buildExtractionPrompt(rawText: string): string {
  return [
    '고객 상담 폼 응답을 JSON으로 추출하라. 모르거나 애매하면 null. 추측하지 말 것.',
    '',
    '원문:',
    '---',
    rawText.trim(),
    '---',
    '',
    `기대 스키마: ${JSON_SCHEMA}`,
    '',
    `매핑 힌트: ${ENUM_HINTS}`,
    '',
    'JSON만 반환하라. 설명 없이 {"contact":...} 형태로.',
  ].join('\n');
}

import { describe, expect, it } from 'vitest';
import {
  formatRegionLodgingDisplayLabel,
  regionLodgingNameOnlyFromStoredSnapshot,
} from '@tour/domain';
import { buildLodgingCellText, formatRegionLodgingPrice, getBaseLodgingName, getBaseLodgingText } from './model';

describe('lodging-selection model', () => {
  it('formats region lodging display labels with optional subtitle', () => {
    expect(formatRegionLodgingDisplayLabel({ name: '카라반세라이' })).toBe('카라반세라이');
    expect(formatRegionLodgingDisplayLabel({ name: '카라반세라이', subtitle: null })).toBe('카라반세라이');
    expect(formatRegionLodgingDisplayLabel({ name: ' 카라반세라이 ', subtitle: '  LV4  ' })).toBe('카라반세라이 · LV4');
  });

  it('strips subtitle suffix for pricing-style lodging description', () => {
    expect(regionLodgingNameOnlyFromStoredSnapshot(null)).toBe('-');
    expect(regionLodgingNameOnlyFromStoredSnapshot('   ')).toBe('-');
    expect(regionLodgingNameOnlyFromStoredSnapshot('호텔만')).toBe('호텔만');
    expect(
      regionLodgingNameOnlyFromStoredSnapshot(
        formatRegionLodgingDisplayLabel({ name: '카라반세라이', subtitle: 'LV4' }),
      ),
    ).toBe('카라반세라이');
  });

  it('builds lodging cell text by level', () => {
    expect(buildLodgingCellText({ level: 'LV1', baseLodgingName: '여행자 캠프' })).toBe('LV.1 캠핑');
    expect(buildLodgingCellText({ level: 'LV2', baseLodgingName: '여행자 캠프' })).toBe('LV.2 전통게르');
    expect(buildLodgingCellText({ level: 'LV3', baseLodgingName: '여행자 캠프' })).toBe('여행자 캠프');
    expect(buildLodgingCellText({ level: 'LV4', baseLodgingName: '여행자 캠프' })).toBe('LV4.디럭스 숙소');
    expect(buildLodgingCellText({ level: 'CUSTOM', baseLodgingName: '여행자 캠프', customLodgingName: '테스트 숙소' })).toBe('테스트 숙소');
  });

  it('formats custom lodging price labels and keeps facility text for base lodging', () => {
    expect(getBaseLodgingName({ lodgings: [{ name: '여행자 캠프' }] })).toBe('여행자 캠프');
    expect(
      getBaseLodgingText(
        {
          lodgings: [{ name: '여행자 캠프', hasElectricity: 'YES', hasShower: 'YES', hasInternet: 'LIMITED' }],
        },
        (value) => (value === 'YES' ? 'O' : value === 'LIMITED' ? '제한' : 'X'),
      ),
    ).toBe('여행자 캠프\n전기 O\n샤워 O\n인터넷 제한');
    expect(formatRegionLodgingPrice({ priceKrw: null, pricePerPersonKrw: 50000, pricePerTeamKrw: null })).toBe('인당 50,000원');
    expect(formatRegionLodgingPrice({ priceKrw: null, pricePerPersonKrw: null, pricePerTeamKrw: 150000 })).toBe('팀당 150,000원');
    expect(formatRegionLodgingPrice({ priceKrw: 300000, pricePerPersonKrw: null, pricePerTeamKrw: null })).toBe('총 300,000원');
  });
});

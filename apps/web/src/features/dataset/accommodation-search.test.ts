import { describe, expect, it } from 'vitest';
import { searchAccommodations } from './accommodation-search';

const ugii = {
  id: 'acc_ugii',
  name: 'Ugii Dalai Resort',
  destination: 'Arkhangai',
  region: 'Central',
};

const other = {
  id: 'acc_other',
  name: 'Mini Desert Camp',
  destination: 'Uvurkhangai',
  region: 'Central',
};

describe('searchAccommodations', () => {
  it('finds Ugii Dalai Resort by 어기 or 우기', () => {
    expect(searchAccommodations([ugii, other], '어기').map((row) => row.id)).toEqual(['acc_ugii']);
    expect(searchAccommodations([ugii, other], '우기').map((row) => row.id)).toEqual(['acc_ugii']);
  });

  it('finds Ugii Dalai Resort by latin name', () => {
    expect(searchAccommodations([ugii, other], 'ugii').map((row) => row.id)).toEqual(['acc_ugii']);
    expect(searchAccommodations([ugii, other], 'Dalai').map((row) => row.id)).toEqual(['acc_ugii']);
  });

  it('returns nothing until the user types a query', () => {
    expect(searchAccommodations([ugii, other], '')).toEqual([]);
    expect(searchAccommodations([ugii, other], '   ')).toEqual([]);
  });
});

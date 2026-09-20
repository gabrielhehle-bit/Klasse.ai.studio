import type { SchoolRecord } from '../server/schoolRegistry';

export const INITIAL_VERIFIED_AUSTRIAN_SCHOOLS: Array<Omit<SchoolRecord, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'at-vbg-vs-oberau',
    code: 'vsfoa',
    name: 'VS Oberau',
    country: 'AT',
    federalState: 'Vorarlberg',
    domains: ['vsfoa.vobs.at'],
    status: 'verified',
  },
  {
    id: 'at-vbg-vs-krumbach',
    code: 'vskr',
    name: 'Volksschule Krumbach',
    country: 'AT',
    federalState: 'Vorarlberg',
    domains: ['vskr.vobs.at'],
    status: 'verified',
  },
  {
    id: 'at-vbg-vs-mellau',
    code: 'vsml',
    name: 'Volksschule Mellau',
    country: 'AT',
    federalState: 'Vorarlberg',
    domains: ['vsml.vobs.at'],
    status: 'verified',
  },
];

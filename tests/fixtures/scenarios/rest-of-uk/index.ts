import type {Scenario} from '../../../scenario';
import {AUTO_ENROLMENT} from './auto-enrolment';
import {EMPLOYER} from './employer';
import {NO_PENSION} from './no-pension';
import {PERSONAL} from './personal';
import {SALARY_SACRIFICE} from './salary-sacrifice';

/** The tables by pension basis, named as the test reports them. */
export const REST_OF_UK: Readonly<Record<string, readonly Scenario[]>> = {
  'no pension': NO_PENSION,
  'auto-enrolment': AUTO_ENROLMENT,
  'employer pension': EMPLOYER,
  'salary sacrifice': SALARY_SACRIFICE,
  'personal pension': PERSONAL,
};
